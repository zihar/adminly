import { test, expect } from "@playwright/test";

// E2E workflow demo (P3): draft -> submitted -> approved lewat lapisan generik
// `ResourceTable` (kolom badge Task 7 + tombol aksi transisi Task 5). Role
// default demo adalah Admin (lihat DEFAULT_ROLE di config/rbac.ts) yang punya
// `items:update` DAN `items:approve`, jadi Submit maupun Approve sama-sama
// terlihat tanpa perlu mengganti role lewat RoleSwitcher.
test("Workflow items: draft -> submitted -> approved", async ({ page }) => {
  // Nama unik per run (timestamp) — store mock in-memory dipertahankan
  // selama umur dev server, jadi nama statis bisa bentrok antar run.
  const nama = `Item Workflow ${Date.now()}`;

  // --- Create (item baru selalu berstatus "draft" — lihat api/items/route.ts
  // yang men-stamp `itemsResource.workflow.initial`). Navigasi lewat link
  // "Create" di halaman list (BUKAN `goto("/items/create")` langsung): membuka
  // rute create langsung bisa memicu submit form native (GET, `?nama=...`)
  // sebelum hidrasi handler JS selesai — persis pola andal `crud-items.spec.ts`. ---
  await page.goto("/items");
  await expect(page.getByText("Contoh A")).toBeVisible();
  await page.getByRole("link", { name: /create/i }).click();
  await page.waitForURL(/\/items\/create$/);
  await page.getByRole("textbox").fill(nama);
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page).toHaveURL(/\/items$/);

  const row = page.getByRole("row", { name: new RegExp(nama) });
  await expect(row).toBeVisible();
  await expect(row.getByText("Draft", { exact: true })).toBeVisible();

  // --- Submit (draft -> submitted, butuh items:update) ---
  await row.getByRole("button", { name: /submit/i }).click();
  await expect(row.getByText("Submitted", { exact: true })).toBeVisible();
  await expect(row.getByText("Draft", { exact: true })).toHaveCount(0);

  // --- Approve (submitted -> approved, butuh items:approve) ---
  await row.getByRole("button", { name: /approve/i }).click();
  await expect(row.getByText("Approved", { exact: true })).toBeVisible();
  await expect(row.getByText("Submitted", { exact: true })).toHaveCount(0);

  // Setelah "approved", tak ada transisi lanjutan terdaftar dari status ini
  // (lihat `itemsResource.workflow.transitions` — hanya submit/approve/reject
  // dari draft/submitted), jadi tombol aksi workflow pada baris ini hilang.
  await expect(row.getByRole("button", { name: /submit/i })).toHaveCount(0);
  await expect(row.getByRole("button", { name: /approve/i })).toHaveCount(0);
  await expect(row.getByRole("button", { name: /reject/i })).toHaveCount(0);
});
