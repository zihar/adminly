import { test, expect, type Page } from "@playwright/test";

// RBAC diuji dengan menyetel cookie role (`adminly_role`) langsung — persis
// yang ditulis RoleSwitcher (lihat rbac-provider.tsx) — lalu memverifikasi dua
// lapis penegakan: proxy (src/proxy.ts, redirect) & UI gating (<Can>). Tidak
// memutasi store, jadi aman dijalankan paralel bersama spec lain.
async function setRole(page: Page, role: "Admin" | "Editor" | "Viewer") {
  await page.context().addCookies([
    { name: "adminly_role", value: role, url: "http://localhost:3000" },
  ]);
}

test.describe("RBAC — proteksi route (proxy)", () => {
  test("Viewer diblokir dari analytics/users/settings & aksi tulis items", async ({ page }) => {
    await setRole(page, "Viewer");

    // `itm-1` adalah seed store items (lihat src/app/api/items/_data.ts) — id
    // stabil untuk menguji deep-link edit yang butuh permission `items:update`.
    const cases = [
      ["/analytics", "analytics"],
      ["/users", "users"],
      ["/settings", "settings"],
      ["/items/create", "items"],
      ["/items/itm-1/edit", "items"],
    ] as const;

    for (const [path, denied] of cases) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/dashboard\\?denied=${denied}`));
    }
  });

  test("Editor boleh buka /items/create tapi diblokir dari /users", async ({ page }) => {
    await setRole(page, "Editor");

    await page.goto("/items/create");
    await expect(page).toHaveURL(/\/items\/create$/);

    await page.goto("/users");
    await expect(page).toHaveURL(/\/dashboard\?denied=users/);
  });
});

test.describe("RBAC — UI gating (<Can>) di /items", () => {
  test("Viewer tak melihat tombol Create/Edit", async ({ page }) => {
    await setRole(page, "Viewer");
    await page.goto("/items");
    await expect(page.getByPlaceholder("Search...")).toBeVisible();
    await expect(page.getByRole("link", { name: /create/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^edit$/i })).toHaveCount(0);
  });

  test("Admin melihat tombol Create & Edit", async ({ page }) => {
    await setRole(page, "Admin");
    await page.goto("/items");
    await expect(page.getByRole("link", { name: /create/i })).toBeVisible();
    // Seed "Contoh A"/"Contoh B" selalu ada (tak pernah dihapus test lain),
    // jadi minimal satu tombol Edit per-baris pasti terrender untuk Admin.
    await expect(page.getByRole("link", { name: /^edit$/i }).first()).toBeVisible();
  });
});
