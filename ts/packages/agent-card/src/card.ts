import type { AgentCard, ConnectorDescriptor, ConnectorRegistryLike } from "./types.js";

export function buildAgentCard(input: {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly registry: ConnectorRegistryLike;
  readonly description?: string;
  readonly endpoints?: Readonly<Record<string, string>>;
}): AgentCard {
  const card: AgentCard = {
    id: input.id,
    name: input.name,
    description: input.description,
    capabilities: input.registry.list().map(projectDescriptor),
    endpoints: input.endpoints,
    version: input.version,
  };
  validateAgentCard(card);
  return card;
}

export function validateAgentCard(card: AgentCard): void {
  if (!card.id) {
    throw new Error("Agent card id is required");
  }
  if (!card.name) {
    throw new Error("Agent card name is required");
  }
  if (!card.version) {
    throw new Error("Agent card version is required");
  }
  for (const capability of card.capabilities) {
    validateCapability(capability);
  }
}

function projectDescriptor(descriptor: ConnectorDescriptor): ConnectorDescriptor {
  return {
    id: descriptor.id,
    kind: descriptor.kind,
    requiredScope: descriptor.requiredScope,
    reversibility: descriptor.reversibility,
    metadata: descriptor.metadata,
  };
}

function validateCapability(capability: ConnectorDescriptor): void {
  if (!capability.id) {
    throw new Error("Agent card capability id is required");
  }
  if (!capability.kind) {
    throw new Error("Agent card capability kind is required");
  }
  if (!capability.requiredScope.action || !capability.requiredScope.resource) {
    throw new Error("Agent card capability scope is required");
  }
  if (!["read", "write", "external_effect"].includes(capability.reversibility)) {
    throw new Error(`Invalid capability reversibility: ${capability.reversibility}`);
  }
}
