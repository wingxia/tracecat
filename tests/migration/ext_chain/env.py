"""A one-table extension chain with its own version table, run after Tracecat's."""

from sqlalchemy import create_engine, pool

from alembic import context
from tracecat.db.engine import get_db_uri
from tracecat.db.migration_lock import (
    acquire_migration_advisory_lock,
    release_migration_advisory_lock,
)

VERSION_TABLE = "alembic_version_fixture"

engine = create_engine(get_db_uri("psycopg"), poolclass=pool.NullPool)
with engine.connect() as connection:
    context.configure(connection=connection, version_table=VERSION_TABLE)
    locked = acquire_migration_advisory_lock(connection)
    try:
        with context.begin_transaction():
            context.run_migrations()
    finally:
        if locked:
            release_migration_advisory_lock(connection)
