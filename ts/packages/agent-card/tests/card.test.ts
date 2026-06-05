import { describe, expect, it } from "vitest";
import { buildAgentCard, canonicalize } from "../src/index.js";

describe("agent card", () => {
  it("projects capabilities from a connector registry", () => {
    const registry = {
      list() {
        return [
          {
            id: "read_profile",
            kind: "in_process",
            requiredScope: { action: "read", resource: "profile.self" },
            reversibility: "read" as const,
            metadata: { title: "Read profile" },
          },
        ];
      },
    };

    const card = buildAgentCard({
      id: "agent_profile",
      name: "Profile agent",
      version: "0.1.0",
      registry,
      endpoints: { jakit: "https://agent.example/jakit" },
    });

    expect(card.capabilities).toEqual(registry.list());
    expect(card.endpoints?.jakit).toBe("https://agent.example/jakit");
  });

  it("rejects invalid capability descriptors", () => {
    expect(() =>
      buildAgentCard({
        id: "agent_bad",
        name: "Bad agent",
        version: "0.1.0",
        registry: {
          list() {
            return [
              {
                id: "",
                kind: "in_process",
                requiredScope: { action: "read", resource: "profile.self" },
                reversibility: "read" as const,
              },
            ];
          },
        },
      }),
    ).toThrow("capability id");
  });

  it("canonicalizes byte-stable cards", () => {
    expect(canonicalize({ version: "1", id: "agent", capabilities: [] })).toBe(
      '{"capabilities":[],"id":"agent","version":"1"}',
    );
  });
});
