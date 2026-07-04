import { defineConfig, devices } from "@playwright/test";

/**
 * Konfigurasi Playwright minimal untuk e2e lapisan CRUD generik.
 * `webServer` menjalankan `npm run dev` (Turbopack) & menunggunya siap
 * sebelum test jalan — dev server dipakai (bukan build) agar store
 * in-memory `itemsStore` (seed "Contoh A"/"Contoh B") tersedia via
 * Route Handler lokal.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
