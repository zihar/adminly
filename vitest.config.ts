import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // `e2e/**` dijalankan lewat Playwright (`npx playwright test`), bukan
    // Vitest — keduanya sama-sama menyuntik global `test`/`expect` sehingga
    // bentrok bila e2e ikut ter-discover di sini.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
