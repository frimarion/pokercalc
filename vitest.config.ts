import { defineConfig } from "vitest/config";

// Отдельный конфиг для тестов: движок — чистый TS, плагины vite не нужны.
// Разделение убирает конфликт типов вложенных копий vite.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
