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
