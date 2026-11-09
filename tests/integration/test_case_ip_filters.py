"""Execute IP predicates over synthetic rows without mutating stored cases."""

from uuid import UUID

import pytest
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from tracecat.cases.query import CaseFieldResolver
from tracecat.db.models import Case
from tracecat.query.compiler import compile_filter
from tracecat.query.filters import Condition, FilterOp

pytestmark = [pytest.mark.anyio, pytest.mark.integration]

# Open JSON objects intentionally cover malformed values from external alerts.
PAYLOADS: list[dict[str, object] | None] = [
    {"sip": "192.0.2.10", "dip": "198.51.100.1"},
    {"source_ip": "192.0.2.11", "dest_ip": "203.0.113.4"},
    {"src_ip": "198.51.100.8", "dst_ip": "198.51.100.2"},
    {"sip": "1192.0.2.10"},
    None,
    {"sip": None},
    {"sip": ["192.0.2.10"]},
    {"sip": {"value": "192.0.2.10"}},
    {"sip": 192},
    {"sip": "2001:DB8::1", "destination_ip": "2001:db8:1::1"},
    {"sip": "192.%_\\"},
    {"sip": "192.0.2.100"},
]

SCENARIOS = [
    ("192.0.2.", None, [1, 2, 12]),
    ("192.0.2.10", None, [1, 12]),
    ("198.51.100.", None, [3]),
    (None, "198.51.100.", [1, 3]),
    (None, "203.0.113.4", [2]),
    ("192.0.2.", "198.51.100.", [1]),
    ("192.0.2.", "203.0.113.", [2]),
    ("203.0.113.", "198.51.100.", []),
    ("2001:db8:", "2001:DB8:1:", [10]),
    ("192.%_\\", None, [11]),
    ("%", None, []),
    ("' OR 1=1 --", None, []),
    ("192", None, [1, 2, 11, 12]),
]


@pytest.mark.parametrize(("sip", "dip", "expected"), SCENARIOS)
async def test_ip_prefix_matches_in_postgres(
    session: AsyncSession, sip: str | None, dip: str | None, expected: list[int]
) -> None:
    """Check prefix, alias, combined, IPv6, missing-value and escaping behavior."""
    rows = (
        sa.values(sa.column("id", sa.UUID()), sa.column("payload", JSONB()))
        .data([(UUID(int=index), payload) for index, payload in enumerate(PAYLOADS, 1)])
        .cte("case")
    )
    resolver = CaseFieldResolver(UUID(int=1), {})
    predicates = [
        compile_filter(
            Condition(field=field, op=FilterOp.STARTS_WITH, value=value), resolver
        )
        for field, value in (("sip", sip), ("dip", dip))
        if value is not None
    ]
    statement = sa.select(Case.id).add_cte(rows).where(*predicates).order_by(Case.id)
    connection = await session.connection()
    actual = await connection.scalars(statement)
    assert [item.int for item in actual] == expected
