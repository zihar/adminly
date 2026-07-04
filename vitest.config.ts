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
    // `src/stories/**` (contoh bawaan Storybook) juga di-exclude — story
    // dijalankan lewat Storybook (`npm run storybook`/`build-storybook`),
    // bukan sebagai unit test Vitest.
    exclude: [...configDefaults.exclude, "e2e/**", "src/stories/**"],
  },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
