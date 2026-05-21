import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(fileURLToPath(import.meta.url), "../src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    hookTimeout: 30000,
    setupFiles: ["./tests/setup.ts"],
    include: ["./tests/**/*.test.ts", "./tests/**/*.test.tsx"],
    coverage: {
      provider: "istanbul",
      include: ["src/**"],
      exclude: ["src/content/**", "src/generated/**", "src/lib/blog-posts.ts", "src/server/**", "**/*.md", "**/*.mdx"],
    },
  },
});
