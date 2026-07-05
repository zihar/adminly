import { test, expect } from "@playwright/test";

// Export CSV/PDF (Task 4) dipicu lewat `DropdownMenu` di toolbar `ResourceTable`
// (lihat `resource-table.tsx`). `downloadBlob` (`lib/crud/export.ts`) membuat
// `<a download>` sungguhan lalu memanggil `.click()` — Playwright menangkapnya
// sebagai event "download" nyata, bukan mock.
test("Export CSV dari /items memicu download file items.csv", async ({ page }) => {
  await page.goto("/items");
  await expect(page.getByText("Contoh A")).toBeVisible();

  await page.getByRole("button", { name: "Export" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Export as CSV" }).click(),
  ]);

  expect(download.suggestedFilename()).toBe("items.csv");
});
