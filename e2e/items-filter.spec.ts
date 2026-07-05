import { test, expect } from "@playwright/test";

// e2e filter per-kolom (Filter UI Task 3): membuktikan dropdown filter
// `prioritas` (lihat `ResourceFilter` di `resource-table.tsx`) benar-benar
// menyempitkan daftar lewat request server (bukan cuma filter di klien) DAN
// menyinkronkan pilihannya ke URL (`filter_prioritas=<value>`, key nuqs —
// lihat `filterKey()`). Seed store (`items/_data.ts`) sengaja punya dua nilai
// `prioritas` berbeda: "Contoh A" (high) & "Contoh B" (low) — dipakai apa
// adanya (bukan bikin item baru) karena keduanya sudah cukup utk memverifikasi
// penyempitan tanpa bergantung urutan/paginasi item lain yang dibuat spec e2e
// lain (semuanya berawalan "E"/"I", jadi tetap di bawah "Contoh A"/"B" secara
// alfabetis pada sort default `nama` asc).
test("Filter Priority menyempitkan baris & sinkron ke URL; All mengembalikannya", async ({ page }) => {
  await page.goto("/items");

  // Kondisi awal: kedua baris seed tampil (tanpa filter aktif).
  await expect(page.getByText("Contoh A")).toBeVisible();
  await expect(page.getByText("Contoh B")).toBeVisible();

  // Dropdown filter dilabeli via `resolveLabel(t, meta.labelKey)`
  // ("items.prioritas" -> "Priority", locale default "en").
  const filterSelect = page.getByLabel("Priority");
  await expect(filterSelect).toBeVisible();

  // Pilih "high" -> hanya "Contoh A" (prioritas high) yang cocok; "Contoh B"
  // (low) tersaring keluar. URL mendapat param `filter_prioritas=high`.
  await filterSelect.selectOption("high");
  await expect(page).toHaveURL(/filter_prioritas=high/);
  await expect(page.getByText("Contoh A")).toBeVisible();
  await expect(page.getByText("Contoh B")).toHaveCount(0);

  // Pilih "All" (value kosong) -> filter dihapus dari URL, kedua baris balik.
  await filterSelect.selectOption("");
  await expect(page).not.toHaveURL(/filter_prioritas/);
  await expect(page.getByText("Contoh A")).toBeVisible();
  await expect(page.getByText("Contoh B")).toBeVisible();
});
