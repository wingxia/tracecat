"""Identity of one approval pause."""

import uuid

_APPROVAL_BATCH_NAMESPACE = uuid.UUID("5f0e6b1c-8f53-4c2a-9d0e-2b8c4a7d1e93")


def approval_batch_id(run_id: uuid.UUID, tool_call_ids: list[str]) -> uuid.UUID:
    """Derive the batch id from the paused run and its pending tool calls."""
    return uuid.uuid5(
        _APPROVAL_BATCH_NAMESPACE, f"{run_id}:{','.join(sorted(tool_call_ids))}"
    )
