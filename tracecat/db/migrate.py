"""Upgrade Tracecat's schema, then every installed extension's Alembic chain.

Run as `python -m tracecat.db.migrate` from the directory holding Tracecat's
`alembic.ini`. With no extension installed it is `alembic upgrade head`.
"""

from importlib.metadata import entry_points

from alembic.config import Config
from alembic.config import main as alembic_main

from alembic import command

MIGRATIONS_ENTRY_POINT_GROUP = "tracecat.migrations"


def upgrade_extension_chains() -> None:
    """Upgrade each installed chain to head, in entry-point name order.

    An entry point's value is the chain's Alembic `script_location`, such as
    `my_package:migrations`. Its `env.py` picks its own database URL, must set
    its own `version_table` (never `alembic_version`), and should hold
    `tracecat.db.migration_lock`'s advisory lock, since replicas migrate at once.
    """
    installed = sorted(
        entry_points(group=MIGRATIONS_ENTRY_POINT_GROUP), key=lambda ep: ep.name
    )
    for entry in installed:
        cfg = Config()
        cfg.set_main_option("script_location", entry.value)
        command.upgrade(cfg, "head")


def main() -> None:
    # Same as the `alembic upgrade head` CLI; a failure exits before any chain runs.
    alembic_main(argv=["upgrade", "head"], prog="alembic")
    upgrade_extension_chains()


if __name__ == "__main__":
    main()
