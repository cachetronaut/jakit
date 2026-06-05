from __future__ import annotations

import json
from builtins import list as builtin_list
from dataclasses import dataclass, field, replace
from typing import Any, Literal, Protocol, TypedDict, cast

TaskStatus = Literal["proposed", "accepted", "running", "blocked", "completed", "failed"]
Reversibility = Literal["read", "write", "external_effect"]
_STATUSES = {"proposed", "accepted", "running", "blocked", "completed", "failed"}
_REVERSIBILITY = {"read", "write", "external_effect"}
_FORBIDDEN_AUTHORITY_KEYS = {"token", "accessToken", "authorization", "scope", "scopes"}


class Scope(TypedDict, total=False):
    action: str
    resource: str
    qualifier: Any


@dataclass(frozen=True)
class ArtifactRef:
    id: str
    kind: str
    uri: str | None = None


@dataclass(frozen=True)
class TaskEnvelope:
    task_id: str
    run_id: str
    goal: str
    inputs: dict[str, Any] = field(default_factory=dict)
    status: TaskStatus = "proposed"
    delegation_id: str | None = None
    parent_delegation_id: str | None = None
    artifacts: list[ArtifactRef] | None = None
    notes: list[str] | None = None
    outputs: dict[str, Any] | None = None


@dataclass(frozen=True)
class ConnectorDescriptor:
    id: str
    kind: str
    required_scope: Scope
    reversibility: Reversibility
    metadata: dict[str, Any] = field(default_factory=dict)


class ConnectorRegistryLike(Protocol):
    def list(self) -> builtin_list[ConnectorDescriptor]: ...


@dataclass(frozen=True)
class AgentCard:
    id: str
    name: str
    capabilities: list[ConnectorDescriptor]
    version: str
    description: str | None = None
    endpoints: dict[str, str] | None = None


def create_envelope(
    *,
    task_id: str,
    run_id: str,
    goal: str,
    inputs: dict[str, Any] | None = None,
    delegation_id: str | None = None,
    status: TaskStatus = "proposed",
) -> TaskEnvelope:
    envelope = TaskEnvelope(
        task_id=task_id,
        run_id=run_id,
        delegation_id=delegation_id,
        goal=goal,
        inputs=inputs or {},
        status=status,
    )
    validate_envelope(envelope)
    return envelope


def child_envelope(
    parent: TaskEnvelope,
    *,
    task_id: str,
    run_id: str,
    delegation_id: str,
    goal: str,
    inputs: dict[str, Any] | None = None,
) -> TaskEnvelope:
    return create_envelope(
        task_id=task_id,
        run_id=run_id,
        delegation_id=delegation_id,
        goal=goal,
        inputs={
            **(inputs or {}),
            "parentTaskId": parent.task_id,
            "parentRunId": parent.run_id,
            "parentDelegationId": parent.delegation_id,
        },
    )


def transition_envelope(
    envelope: TaskEnvelope,
    status: TaskStatus,
    *,
    artifacts: list[ArtifactRef] | None = None,
    notes: list[str] | None = None,
    outputs: dict[str, Any] | None = None,
) -> TaskEnvelope:
    next_envelope = replace(
        envelope,
        status=status,
        artifacts=artifacts if artifacts is not None else envelope.artifacts,
        notes=notes if notes is not None else envelope.notes,
        outputs=outputs if outputs is not None else envelope.outputs,
    )
    validate_envelope(next_envelope)
    return next_envelope


def validate_envelope(envelope: TaskEnvelope) -> None:
    if not envelope.task_id:
        raise ValueError("Task envelope task_id is required")
    if not envelope.run_id:
        raise ValueError("Task envelope run_id is required")
    if not envelope.goal:
        raise ValueError("Task envelope goal is required")
    if envelope.status not in _STATUSES:
        raise ValueError(f"Invalid task envelope status: {envelope.status}")
    _reject_authority(envelope.inputs, "inputs")
    _reject_authority(envelope.outputs, "outputs")


def build_agent_card(
    *,
    id: str,
    name: str,
    version: str,
    registry: ConnectorRegistryLike,
    description: str | None = None,
    endpoints: dict[str, str] | None = None,
) -> AgentCard:
    card = AgentCard(
        id=id,
        name=name,
        description=description,
        capabilities=[_project_descriptor(descriptor) for descriptor in registry.list()],
        endpoints=endpoints,
        version=version,
    )
    validate_agent_card(card)
    return card


def validate_agent_card(card: AgentCard) -> None:
    if not card.id:
        raise ValueError("Agent card id is required")
    if not card.name:
        raise ValueError("Agent card name is required")
    if not card.version:
        raise ValueError("Agent card version is required")
    for capability in card.capabilities:
        _validate_capability(capability)


def canonicalize(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=_json_default)


def _project_descriptor(descriptor: ConnectorDescriptor) -> ConnectorDescriptor:
    return ConnectorDescriptor(
        id=descriptor.id,
        kind=descriptor.kind,
        required_scope=cast(Scope, dict(descriptor.required_scope)),
        reversibility=descriptor.reversibility,
        metadata=dict(descriptor.metadata),
    )


def _validate_capability(capability: ConnectorDescriptor) -> None:
    if not capability.id:
        raise ValueError("Agent card capability id is required")
    if not capability.kind:
        raise ValueError("Agent card capability kind is required")
    if not capability.required_scope["action"] or not capability.required_scope["resource"]:
        raise ValueError("Agent card capability scope is required")
    if capability.reversibility not in _REVERSIBILITY:
        raise ValueError(f"Invalid capability reversibility: {capability.reversibility}")


def _reject_authority(value: dict[str, Any] | None, path: str) -> None:
    if value is None:
        return
    for key, entry in value.items():
        if key in _FORBIDDEN_AUTHORITY_KEYS:
            raise ValueError(f"Task envelope must not contain authority at {path}.{key}")
        if isinstance(entry, dict):
            _reject_authority(entry, f"{path}.{key}")


def _json_default(value: object) -> object:
    if hasattr(value, "__dict__"):
        return {key: item for key, item in vars(value).items() if item is not None}
    raise TypeError(f"Cannot serialize {type(value)!r}")
