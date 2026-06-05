from __future__ import annotations

from builtins import list as builtin_list

import pytest

from jakit import (
    ConnectorDescriptor,
    build_agent_card,
    canonicalize,
    child_envelope,
    create_envelope,
    transition_envelope,
)


def test_envelope_transitions_and_canonicalizes() -> None:
    envelope = create_envelope(
        task_id="task_1",
        run_id="run_1",
        goal="Summarize the report",
        inputs={"uri": "file://report.md"},
    )
    completed = transition_envelope(envelope, "completed", outputs={"summary": "done"})

    assert envelope.status == "proposed"
    assert completed.status == "completed"
    assert completed.outputs == {"summary": "done"}
    assert canonicalize({"b": 2, "a": 1}) == '{"a":1,"b":2}'


def test_envelope_rejects_authority_payloads() -> None:
    with pytest.raises(ValueError, match="authority"):
        create_envelope(
            task_id="task_1",
            run_id="run_1",
            goal="Do work",
            inputs={"token": "secret"},
        )


def test_child_envelope_carries_parent_lineage() -> None:
    parent = create_envelope(
        task_id="task_parent",
        run_id="run_parent",
        delegation_id="delegation_parent",
        goal="Parent task",
    )
    child = child_envelope(
        parent,
        task_id="task_child",
        run_id="run_child",
        delegation_id="delegation_child",
        goal="Child task",
    )

    assert child.inputs["parentTaskId"] == "task_parent"
    assert child.inputs["parentDelegationId"] == "delegation_parent"


def test_agent_card_projects_connector_registry() -> None:
    registry = StaticRegistry(
        [
            ConnectorDescriptor(
                id="read_profile",
                kind="in_process",
                required_scope={"action": "read", "resource": "profile.self"},
                reversibility="read",
                metadata={"title": "Read profile"},
            )
        ]
    )

    card = build_agent_card(
        id="agent_profile",
        name="Profile agent",
        version="0.1.0",
        registry=registry,
        endpoints={"jakit": "https://agent.example/jakit"},
    )

    assert card.capabilities == registry.list()
    assert card.endpoints == {"jakit": "https://agent.example/jakit"}


def test_agent_card_rejects_invalid_capabilities() -> None:
    registry = StaticRegistry(
        [
            ConnectorDescriptor(
                id="",
                kind="in_process",
                required_scope={"action": "read", "resource": "profile.self"},
                reversibility="read",
            )
        ]
    )

    with pytest.raises(ValueError, match="capability id"):
        build_agent_card(id="agent_bad", name="Bad agent", version="0.1.0", registry=registry)


class StaticRegistry:
    def __init__(self, descriptors: builtin_list[ConnectorDescriptor]) -> None:
        self._descriptors = descriptors

    def list(self) -> builtin_list[ConnectorDescriptor]:
        return self._descriptors
