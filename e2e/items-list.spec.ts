import { test, expect } from "@playwright/test";

// Interaksi list generik (ResourceTable): search & sort. Search diisolasi lewat
// token unik (timestamp) supaya tak terpengaruh baris yang dibuat spec lain di
// store in-memory bersama. Sort diverifikasi lewat sinkronisasi state → URL
// (nuqs), bukan urutan baris — deterministik tanpa bergantung isi store.
test("Search memfilter baris berdasarkan query", async ({ page }) => {
  const stamp = `${Date.now()}`;
  const nama = `E2ESearch-${stamp}`;

  // Navigasi lewat link "Create" di halaman list (BUKAN `goto("/items/create")`
  // langsung): membuka rute create lewat hard navigation bisa memicu submit
  // form native (GET, `?nama=...`) sebelum hidrasi handler JS selesai — pola
  // andal yang sama dipakai `crud-items.spec.ts`/`workflow-items.spec.ts`.
  await page.goto("/items");
  await page.getByRole("link", { name: /create/i }).click();
  await page.waitForURL(/\/items\/create$/);
  await page.getByRole("textbox").fill(nama);
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByText(nama)).toBeVisible();

  // Token unik → hanya baris ini yang cocok; seed "Contoh A" tersaring keluar.
  const search = page.getByPlaceholder("Search...");
  await search.fill(stamp);
  await search.press("Enter");
  await expect(page).toHaveURL(new RegExp(`q=${stamp}`));
  await expect(page.getByText(nama)).toBeVisible();
  await expect(page.getByText("Contoh A")).toHaveCount(0);
});

test("Klik header kolom mengubah sort di URL", async ({ page }) => {
  await page.goto("/items");
  await expect(page.getByPlaceholder("Search...")).toBeVisible();

  // Header kolom "Name" (label items.nama) adalah tombol sort. Sort awal
  // nama asc → klik pertama membalik ke desc (siklus @tanstack/react-table).
  // Catatan: `sort=nama` adalah nilai default (def.list.defaultSort) sehingga
  // nuqs meng-OMIT-nya dari URL; yang muncul hanya `order=desc` (≠ default asc).
  await page.getByRole("button", { name: "Name" }).click();
  await expect(page).toHaveURL(/order=desc/);
});
