import { test, expect } from "@playwright/test";

// Validasi form generik (zod via zodResolver di ResourceForm). Submit kosong
// harus memunculkan pesan inline dari schema (`itemSchema`: "Nama wajib diisi")
// dan TIDAK menavigasi keluar dari form. Murni baca — tak memutasi store.
test("Create item kosong menampilkan error validasi & tetap di form", async ({ page }) => {
  await page.goto("/items/create");
  await page.waitForURL(/\/items\/create/);

  // Retry submit: di dev server, klik pertama bisa terjadi sebelum React
  // meng-hidrasi form (menghasilkan native GET submit → URL `?nama=`). `toPass`
  // mengulang hingga handler `handleSubmit` (zod) aktif & error inline muncul.
  await expect(async () => {
    await page.getByRole("button", { name: /save/i }).click();
    await expect(page.getByText("Nama wajib diisi")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000, intervals: [500, 1000, 2000, 3000] });

  await expect(page).toHaveURL(/\/items\/create/);
});
