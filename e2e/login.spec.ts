import { test, expect } from "@playwright/test";

// Login masih dummy (belum ada auth nyata): form & tombol Google sama-sama
// mengarahkan ke /dashboard (lihat src/components/auth/login-form.tsx). Smoke
// test ini menjaga jalur redirect tetap berfungsi.
test("Submit form login mengarahkan ke dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("demo@company.com");
  await page.getByLabel("Password").fill("secret123");
  // `exact` supaya tidak mengenai tombol "Sign in with Google".
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test("Tombol Google mengarahkan ke dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /sign in with google/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
