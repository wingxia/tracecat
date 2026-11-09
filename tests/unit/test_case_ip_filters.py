"""IP filter contracts and safe SQL compilation without external services."""

from unittest.mock import AsyncMock
from uuid import UUID

import pytest
import sqlalchemy as sa
from pydantic import ValidationError
from sqlalchemy.dialects import postgresql

from tracecat.auth.types import Role
from tracecat.cases.query import IP_FIELD_ALIASES, CaseFieldResolver
from tracecat.cases.search_fields import case_filter_metadata
from tracecat.cases.search_schemas import CaseQuery
from tracecat.cases.search_service import CaseSearchService
from tracecat.db.models import Case
from tracecat.exceptions import TracecatValidationError
from tracecat.query.compiler import compile_filter
from tracecat.query.filters import Condition, FilterOp

WORKSPACE_ID = UUID("00000000-0000-4000-8000-000000000001")


@pytest.mark.parametrize("field", ["sip", "dip"])
@pytest.mark.parametrize("value", ["192.0.2.", "2001:db8:", "1"])
def test_partial_ip_is_accepted(field: str, value: str) -> None:
    query = CaseQuery.model_validate({field: f" {value} "})
    assert query.model_dump()[field] == value


@pytest.mark.parametrize("value", [None, "", " \t "])
def test_blank_ip_filters_are_unset(value: str | None) -> None:
    query = CaseQuery(sip=value, dip=value)
    assert query.sip is None and query.dip is None


@pytest.mark.parametrize("field", ["sip", "dip"])
@pytest.mark.parametrize("value", ["a" * 65, "192.0.2.\x00", 123])
def test_invalid_ip_filter_values_are_rejected(field: str, value: str | int) -> None:
    with pytest.raises(ValidationError):
        CaseQuery.model_validate({field: value})


@pytest.mark.parametrize("field", ["sip", "dip"])
def test_prefix_matches_only_string_aliases_and_escapes_wildcards(field: str) -> None:
    predicate = compile_filter(
        Condition(field=field, op=FilterOp.STARTS_WITH, value="192.%_\\"),
        CaseFieldResolver(WORKSPACE_ID, {}),
    )
    compiled = sa.select(Case.id).where(predicate).compile(dialect=postgresql.dialect())
    sql = str(compiled)
    assert sql.count("ILIKE") == len(IP_FIELD_ALIASES[field])
    assert sql.count("jsonb_typeof(") == len(IP_FIELD_ALIASES[field])
    assert "ESCAPE" in sql
    assert set(IP_FIELD_ALIASES[field]) <= set(compiled.params.values())
    assert r"192.\%\_\\%" in compiled.params.values()


def test_ip_filter_also_searches_text_custom_fields() -> None:
    resolver = CaseFieldResolver(
        WORKSPACE_ID,
        {"sip": {"type": "TEXT"}, "source_ip": {"type": "JSONB"}},
    )
    predicate = compile_filter(
        Condition(field="sip", op=FilterOp.STARTS_WITH, value="192.0.2."), resolver
    )
    sql = str(sa.select(Case.id).where(predicate).compile(dialect=postgresql.dialect()))
    assert "EXISTS" in sql
    assert "case_fields.sip ILIKE" in sql
    assert "case_fields.source_ip" not in sql


@pytest.mark.parametrize("op", [FilterOp.GT, FilterOp.NE, FilterOp.IS_NULL])
def test_ip_aliases_reject_unsupported_operators(op: FilterOp) -> None:
    with pytest.raises(TracecatValidationError):
        compile_filter(
            Condition(field="sip", op=op, value="192.0.2."),
            CaseFieldResolver(WORKSPACE_ID, {}),
        )


def test_ip_metadata_exposes_prefix_and_substring_operations() -> None:
    fields = {
        field.field: field
        for field in case_filter_metadata(WORKSPACE_ID, {}, []).fields
    }
    for name in ("sip", "dip"):
        assert set(fields[name].operators) == {
            FilterOp.EQ,
            FilterOp.STARTS_WITH,
            FilterOp.CONTAINS,
        }


@pytest.mark.anyio
async def test_ip_constraints_preserve_workspace_and_deep_structured_filters() -> None:
    role = Role(
        type="service",
        service_id="tracecat-api",
        workspace_id=WORKSPACE_ID,
        organization_id=UUID("00000000-0000-4000-8000-000000000002"),
    )
    fields = AsyncMock()
    fields.get_field_schema.return_value = {"sip": {"type": "TEXT"}}
    hierarchy = AsyncMock()
    hierarchy.resolve_filters.return_value = (None, False)
    service = CaseSearchService(AsyncMock(), role, fields=fields, hierarchy=hierarchy)
    query = CaseQuery.model_validate(
        {
            "sip": "192.0.2.",
            "dip": "198.51.100.",
            "status": ["new"],
            "filters": {
                "not": {
                    "or": [
                        {
                            "and": [
                                {"field": "summary", "op": "eq", "value": "synthetic"}
                            ]
                        }
                    ]
                }
            },
        }
    )
    predicates = await service.prepare_query(query, case_addons_enabled=False)
    compiled = (
        sa.select(Case.id).where(*predicates).compile(dialect=postgresql.dialect())
    )
    assert len(predicates) == 5  # Workspace, authored filter, status, sip, dip.
    assert WORKSPACE_ID in compiled.params.values()
    assert "192.0.2.%" in compiled.params.values()
    assert "198.51.100.%" in compiled.params.values()
    assert "EXISTS" in str(compiled)
    fields.get_field_schema.assert_awaited_once()
