import { test, expect } from "@playwright/test";

// Catatan: brief awal memakai matcher nama Indonesia (/tambah/i, /simpan/i),
// tapi locale default aplikasi ini adalah English (lihat
// `src/config/i18n.ts` DEFAULT_LOCALE="en"), jadi label tombol nyata adalah
// "Create"/"Save" (t.common.create/t.common.save). Matcher di bawah
// disesuaikan supaya test memverifikasi perilaku SUNGGUHAN, bukan string
// yang tak pernah dirender.
test("CRUD items lewat lapisan generik", async ({ page }) => {
  await page.goto("/items");
  await expect(page.getByText("Contoh A")).toBeVisible();

  await page.getByRole("link", { name: /create/i }).click();
  // Tunggu navigasi client-side selesai (ke /items/create) sebelum mengisi
  // form — tanpa ini, `getByRole("textbox")` bisa mengenai kotak pencarian
  // di halaman list yang masih sempat terlihat saat transisi berlangsung.
  await page.waitForURL(/\/items\/create$/);
  await page.getByRole("textbox").fill("Item E2E");
  await page.getByRole("button", { name: /save/i }).click();

  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByText("Item E2E")).toBeVisible();
});

test("Edit & Delete item lewat rute generik /[resource]/[id]/edit dan bulk-delete", async ({ page }) => {
  // Nama unik per run (timestamp) — store mock in-memory (`itemsStore`)
  // dipertahankan sepanjang umur dev server (`reuseExistingServer` lokal),
  // jadi nama statis bisa bentrok dengan sisa data dari run sebelumnya.
  // Item baru selalu di-prepend oleh store (lihat `collection-store.ts`
  // `create()`), jadi ia tampil paling atas di halaman 1 tanpa perlu cari.
  const stamp = Date.now();
  const original = `Item Edit ${stamp}`;
  const edited = `Item Edited ${stamp}`;

  // --- Create (prasyarat agar ada baris yang bisa di-edit/hapus) ---
  await page.goto("/items");
  await page.getByRole("link", { name: /create/i }).click();
  await page.waitForURL(/\/items\/create$/);
  await page.getByRole("textbox").fill(original);
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page).toHaveURL(/\/items$/);
  const row = page.getByRole("row", { name: new RegExp(original) });
  await expect(row).toBeVisible();

  // --- Edit lewat /items/[id]/edit ---
  await row.getByRole("link", { name: /edit/i }).click();
  await page.waitForURL(/\/items\/[^/]+\/edit$/);
  const nameField = page.getByRole("textbox");
  await nameField.fill(edited);
  await page.getByRole("button", { name: /save/i }).click();

  await expect(page).toHaveURL(/\/items$/);
  const editedRow = page.getByRole("row", { name: new RegExp(edited) });
  await expect(editedRow).toBeVisible();
  await expect(page.getByText(original, { exact: true })).not.toBeVisible();

  // --- Delete lewat seleksi baris + hapus massal ---
  // Tabel generik (`ResourceTable`) hanya punya aksi "Delete (n)" massal
  // (tanpa tombol hapus per baris) — jadi jalur nyata untuk menghapus satu
  // baris tetap lewat centang baris tsb lalu klik tombol hapus massal.
  await editedRow.getByRole("checkbox").check();
  await page.getByRole("button", { name: /delete \(1\)/i }).click();

  await expect(page.getByRole("row", { name: new RegExp(edited) })).toHaveCount(0);
});
