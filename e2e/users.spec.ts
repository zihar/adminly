import { test, expect } from "@playwright/test";

// CRUD users (fitur bespoke, bukan resource generik) — didukung store
// in-memory `users-store.ts` (create/delete; edit hanya toast stub). Role
// default Admin punya `users:manage`, jadi tombol tambah/form tampil.
// Data ber-timestamp agar aman dari tabrakan test paralel.
test("Tambah lalu hapus user", async ({ page }) => {
  const stamp = Date.now();
  const nama = `E2E User ${stamp}`;
  const email = `e2e${stamp}@company.com`;

  await page.goto("/users");

  await page.getByRole("button", { name: /add user/i }).click();
  await page.getByLabel("Name").fill(nama);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /^create$/i }).click();

  const row = page.getByRole("row", { name: new RegExp(nama) });
  await expect(row).toBeVisible();

  // Hapus lewat menu aksi baris (satu-satunya tombol di baris = trigger menu).
  await row.getByRole("button").click();
  await page.getByRole("menuitem", { name: /delete/i }).click();

  await expect(page.getByRole("row", { name: new RegExp(nama) })).toHaveCount(0);
});
