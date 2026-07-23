import { defineConfig } from "vitest/config";

// Convex functions run in an edge-like runtime; convex-test requires the
// "edge-runtime" test environment to mock the Convex backend faithfully.
// See: https://docs.convex.dev/functions/testing
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
