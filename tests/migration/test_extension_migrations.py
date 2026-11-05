"""Extension Alembic chains run after Tracecat's, and autogenerate ignores their tables."""

from __future__ import annotations

import os
import subprocess
import sys
import uuid
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations.ops import MigrationScript
from alembic.script import ScriptDirectory
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import NullPool

from alembic import command
from tests.database import TEST_DB_CONFIG
from tracecat.db.models import Base

REPO_ROOT = Path(__file__).parents[2]
TRACECAT_HEAD = ScriptDirectory.from_config(
    Config(str(REPO_ROOT / "alembic.ini"))
).get_current_head()
# Run the runner with its entry points replaced, so installed chains never leak in.
RUNNER = """
import sys
from importlib.metadata import EntryPoint
import tracecat.db.migrate as m
chains = [EntryPoint(n, v, m.MIGRATIONS_ENTRY_POINT_GROUP) for n, v in zip(sys.argv[1::2], sys.argv[2::2])]
m.entry_points = lambda group: chains
m.main()
"""


@pytest.fixture(scope="session", autouse=True)
def workflow_bucket() -> Iterator[None]:
    """Disable MinIO-dependent workflow bucket setup for migration tests."""
    yield


@pytest.fixture
def db_url() -> Iterator[str]:
    admin = create_engine(
        TEST_DB_CONFIG.sys_url_sync, isolation_level="AUTOCOMMIT", poolclass=NullPool
    )
    name = f"test_ext_chain_{uuid.uuid4().hex[:8]}"
    with admin.connect() as conn:
        conn.execute(text(f'CREATE DATABASE "{name}"'))
    try:
        yield TEST_DB_CONFIG.test_url_sync.replace(TEST_DB_CONFIG.test_db_name, name)
    finally:
        with admin.connect() as conn:
            conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        admin.dispose()


def _run(db_url: str, *args: str) -> None:
    result = subprocess.run(
        [sys.executable, *args],
        cwd=REPO_ROOT,
        env={**os.environ, "TRACECAT__DB_URI": db_url},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, f"{args} failed:\n{result.stdout}\n{result.stderr}"


def _versions(db_url: str) -> dict[str, str]:
    engine = create_engine(db_url, poolclass=NullPool)
    try:
        with engine.connect() as conn:
            tables = [
                t for t in inspect(conn).get_table_names() if t.startswith("alembic_")
            ]
            return {
                t: conn.execute(text(f"SELECT version_num FROM {t}")).scalar_one()
                for t in tables
            }
    finally:
        engine.dispose()


def _dropped_tables(diffs: list[Any]) -> set[str]:
    return {d[1].name for d in diffs if d[0] == "remove_table"}


def test_no_chains_is_tracecat_upgrade_head(db_url: str) -> None:
    _run(db_url, "-c", RUNNER)

    assert _versions(db_url) == {"alembic_version": TRACECAT_HEAD}


def test_one_chain_runs_after_tracecat(db_url: str) -> None:
    _run(db_url, "-c", RUNNER, "fixture", "tests.migration:ext_chain")

    assert _versions(db_url) == {
        "alembic_version": TRACECAT_HEAD,
        "alembic_version_fixture": "0001_fixture",
    }


def test_autogenerate_ignores_tables_without_a_model(
    db_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    cfg = Config()  # no ini file, so env.py leaves pytest's logging alone
    cfg.set_main_option("script_location", str(REPO_ROOT / "alembic"))
    monkeypatch.setenv("TRACECAT__DB_URI", db_url)
    command.stamp(cfg, "head")
    engine = create_engine(db_url, poolclass=NullPool)
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE ext_unowned (id integer PRIMARY KEY)"))
        # Without the filter, autogenerate would drop it.
        unfiltered = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    engine.dispose()
    assert "ext_unowned" in _dropped_tables(unfiltered)

    scripts: list[MigrationScript] = []

    def capture(
        context: object, revision: object, directives: list[MigrationScript]
    ) -> None:
        scripts.extend(directives)
        directives.clear()  # write no revision file

    command.revision(cfg, autogenerate=True, process_revision_directives=capture)

    diffs = [d for s in scripts for ops in s.upgrade_ops_list for d in ops.as_diffs()]
    assert any(d[0] == "add_table" and d[1].name == "organization" for d in diffs)
    assert "ext_unowned" not in _dropped_tables(diffs)
