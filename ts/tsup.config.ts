import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "agent-card": "packages/agent-card/src/index.ts",
    envelope: "packages/envelope/src/index.ts",
    "wire-jakit": "packages/wire-jakit/src/index.ts",
  },
  format: "esm",
  dts: true,
  splitting: true,
  clean: true,
  outDir: "dist",
  target: "es2022",
});
