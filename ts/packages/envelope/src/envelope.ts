import type { ArtifactRef, TaskEnvelope, TaskStatus } from "./types.js";

const STATUSES = new Set<TaskStatus>([
  "proposed",
  "accepted",
  "running",
  "blocked",
  "completed",
  "failed",
]);

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "token",
  "accessToken",
  "authorization",
  "scope",
  "scopes",
]);

export function createEnvelope(input: {
  readonly taskId: string;
  readonly runId: string;
  readonly goal: string;
  readonly inputs?: Readonly<Record<string, unknown>>;
  readonly delegationId?: string;
  readonly status?: TaskStatus;
}): TaskEnvelope {
  const envelope: TaskEnvelope = {
    taskId: input.taskId,
    runId: input.runId,
    delegationId: input.delegationId,
    goal: input.goal,
    inputs: input.inputs ?? {},
    status: input.status ?? "proposed",
  };
  validateEnvelope(envelope);
  return envelope;
}

export function childEnvelope(
  parent: TaskEnvelope,
  input: {
    readonly taskId: string;
    readonly runId: string;
    readonly delegationId: string;
    readonly goal: string;
    readonly inputs?: Readonly<Record<string, unknown>>;
  },
): TaskEnvelope {
  return createEnvelope({
    taskId: input.taskId,
    runId: input.runId,
    delegationId: input.delegationId,
    goal: input.goal,
    inputs: {
      ...(input.inputs ?? {}),
      parentTaskId: parent.taskId,
      parentRunId: parent.runId,
      parentDelegationId: parent.delegationId,
    },
  });
}

export function transitionEnvelope(
  envelope: TaskEnvelope,
  status: TaskStatus,
  patch: {
    readonly artifacts?: readonly ArtifactRef[];
    readonly notes?: readonly string[];
    readonly outputs?: Readonly<Record<string, unknown>>;
  } = {},
): TaskEnvelope {
  const next: TaskEnvelope = {
    ...envelope,
    status,
    artifacts: patch.artifacts ?? envelope.artifacts,
    notes: patch.notes ?? envelope.notes,
    outputs: patch.outputs ?? envelope.outputs,
  };
  validateEnvelope(next);
  return next;
}

export function validateEnvelope(envelope: TaskEnvelope): void {
  if (!envelope.taskId) {
    throw new Error("Task envelope taskId is required");
  }
  if (!envelope.runId) {
    throw new Error("Task envelope runId is required");
  }
  if (!envelope.goal) {
    throw new Error("Task envelope goal is required");
  }
  if (!STATUSES.has(envelope.status)) {
    throw new Error(`Invalid task envelope status: ${envelope.status}`);
  }
  rejectAuthority(envelope.inputs, "inputs");
  rejectAuthority(envelope.outputs, "outputs");
}

function rejectAuthority(value: Readonly<Record<string, unknown>> | undefined, path: string): void {
  if (value === undefined) {
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_AUTHORITY_KEYS.has(key)) {
      throw new Error(`Task envelope must not contain authority at ${path}.${key}`);
    }
    if (entry !== null && typeof entry === "object" && !Array.isArray(entry)) {
      rejectAuthority(entry as Readonly<Record<string, unknown>>, `${path}.${key}`);
    }
  }
}
