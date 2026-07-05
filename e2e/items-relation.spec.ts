import { test, expect } from "@playwright/test";

// Demo kolom `render:"relation"` (Task 4, rencana `relation-label`): kolom
// Region (`ItemRow.regionId`) harus menampilkan NAMA region (lewat
// `RelationCell` → resource `regions`), bukan id mentah `c1`/`c2`. Seed
// (`api/items/_data.ts`): itm-1 "Contoh A" → regionId "c1" ("Country A"),
// itm-2 "Contoh B" → regionId "c2" ("Country B") — keduanya region TOP-LEVEL
// (`parentId === ""`), satu-satunya yang di-resolve `useOptions({})` (tanpa
// `parent`), lihat komentar `regions/options/route.ts`.
test("Kolom Region di /items menampilkan nama region, bukan id mentah", async ({ page }) => {
  await page.goto("/items");

  const rowA = page.getByRole("row", { name: /Contoh A/ });
  const rowB = page.getByRole("row", { name: /Contoh B/ });
  await expect(rowA).toBeVisible();
  await expect(rowB).toBeVisible();

  // Label region ter-resolve (bukan id mentah `c1`/`c2`).
  await expect(rowA.getByText("Country A", { exact: true })).toBeVisible();
  await expect(rowB.getByText("Country B", { exact: true })).toBeVisible();
  await expect(rowA.getByText("c1", { exact: true })).toHaveCount(0);
  await expect(rowB.getByText("c2", { exact: true })).toHaveCount(0);
});
