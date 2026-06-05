export type Reversibility = "read" | "write" | "external_effect";

export interface Scope {
  readonly action: string;
  readonly resource: string;
  readonly qualifier?: unknown;
}

export interface ConnectorDescriptor {
  readonly id: string;
  readonly kind: string;
  readonly requiredScope: Scope;
  readonly reversibility: Reversibility;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ConnectorRegistryLike {
  list(): readonly ConnectorDescriptor[];
}

export interface AgentCard {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly capabilities: readonly ConnectorDescriptor[];
  readonly endpoints?: Readonly<Record<string, string>>;
  readonly version: string;
}
