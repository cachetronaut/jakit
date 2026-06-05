import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@jakit/agent-card": fileURLToPath(
        new URL("packages/agent-card/src/index.ts", import.meta.url),
      ),
      "@jakit/envelope": fileURLToPath(new URL("packages/envelope/src/index.ts", import.meta.url)),
    },
  },
});
