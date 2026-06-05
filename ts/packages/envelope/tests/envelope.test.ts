import { describe, expect, it } from "vitest";
import { canonicalize, childEnvelope, createEnvelope, transitionEnvelope } from "../src/index.js";

describe("task envelope", () => {
  it("creates and transitions a task envelope", () => {
    const envelope = createEnvelope({
      taskId: "task_1",
      runId: "run_1",
      goal: "Summarize the report",
      inputs: { uri: "file://report.md" },
    });
    const completed = transitionEnvelope(envelope, "completed", {
      outputs: { summary: "done" },
      notes: ["Reviewed"],
    });

    expect(envelope.status).toBe("proposed");
    expect(completed.status).toBe("completed");
    expect(completed.outputs?.summary).toBe("done");
  });

  it("rejects envelopes that carry authority", () => {
    expect(() =>
      createEnvelope({
        taskId: "task_1",
        runId: "run_1",
        goal: "Do work",
        inputs: { token: "secret" },
      }),
    ).toThrow("authority");
  });

  it("creates child envelopes with parent lineage in the work context", () => {
    const parent = createEnvelope({
      taskId: "task_parent",
      runId: "run_parent",
      delegationId: "delegation_parent",
      goal: "Parent task",
    });
    const child = childEnvelope(parent, {
      taskId: "task_child",
      runId: "run_child",
      delegationId: "delegation_child",
      goal: "Child task",
    });

    expect(child.inputs.parentTaskId).toBe("task_parent");
    expect(child.inputs.parentDelegationId).toBe("delegation_parent");
  });

  it("canonicalizes byte-stable JSON", () => {
    expect(canonicalize({ b: 2, a: 1, c: undefined })).toBe('{"a":1,"b":2}');
  });
});
