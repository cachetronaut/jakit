export type TaskStatus = "proposed" | "accepted" | "running" | "blocked" | "completed" | "failed";

export interface ArtifactRef {
  readonly id: string;
  readonly kind: string;
  readonly uri?: string;
}

export interface TaskEnvelope {
  readonly taskId: string;
  readonly runId: string;
  readonly delegationId?: string;
  readonly parentDelegationId?: string;
  readonly goal: string;
  readonly inputs: Readonly<Record<string, unknown>>;
  readonly status: TaskStatus;
  readonly artifacts?: readonly ArtifactRef[];
  readonly notes?: readonly string[];
  readonly outputs?: Readonly<Record<string, unknown>>;
}
