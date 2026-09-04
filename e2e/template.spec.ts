import { test, expect, type Page } from "@playwright/test";

// Template diuji dengan menyetel cookie `adminly_template` langsung — persis
// yang ditulis TemplateProvider — lalu memverifikasi dua hal yang tak bisa
// dipalsukan dari client: atribut di <html> yang dirender server, dan shell
// mana yang benar-benar terpasang. Tidak memutasi store, aman paralel.
async function setTemplate(page: Page, id: string) {
  await page.context().addCookies([
    { name: "adminly_template", value: id, url: "http://localhost:3000" },
  ]);
}

test.describe("Template — persistensi", () => {
  test("tanpa cookie memakai template default", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-template", "adminly");
    await expect(page.locator("html")).toHaveAttribute("data-density", "normal");
    await expect(page.locator("html")).toHaveAttribute("data-surface", "bergaris");
  });

  test("cookie asing jatuh ke default, bukan halaman rusak", async ({ page }) => {
    await setTemplate(page, "template-yang-tidak-ada");
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-template", "adminly");
  });

  test("pilihan di Settings bertahan setelah reload", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: /appearance|tampilan/i }).click();
    await page.getByRole("button", { name: /kertas kerja/i }).click();

    await expect(page.locator("html")).toHaveAttribute("data-template", "kertas-kerja");
    await expect(page.locator("html")).toHaveAttribute("data-density", "lega");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-template", "kertas-kerja");
  });
});

test.describe("Template — pergantian shell", () => {
  test("template sidebar merender sidebar", async ({ page }) => {
    await setTemplate(page, "adminly");
    await page.goto("/dashboard");
    // `sidebar.tsx` memasang data-slot="sidebar" di beberapa cabang (laci
    // mobile, non-collapsible, desktop) — pakai .first() supaya tidak kena
    // strict mode Playwright.
    await expect(page.locator('[data-slot="sidebar"]').first()).toBeVisible();
  });

  test("template topnav merender navigasi atas dan tanpa sidebar", async ({ page }) => {
    await setTemplate(page, "ruang-rapat");
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-surface", "terangkat");
    await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0);
    // Menu tetap terisi dari registry nav yang sama.
    await expect(page.getByRole("link", { name: /analytics/i }).first()).toBeVisible();
  });
});

test.describe("Template — sumbu terang/gelap tetap berdiri sendiri", () => {
  test("ganti mode tidak mengubah template aktif", async ({ page }) => {
    await setTemplate(page, "kertas-kerja");
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /toggle theme|ganti tema/i }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-template", "kertas-kerja");
  });
});

// Dua test di bawah membaca STYLE TERKOMPUTASI (bukan nama kelas) untuk
// aturan `data-density`/`data-surface` di src/app/themes/vocabulary.css.
// Tanpa ini, seluruh suite bisa hijau sekalipun rule kosakata itu diam-diam
// rusak — tidak ada spec lain yang menyentuhnya.
test.describe("Template — kosakata (style terkomputasi)", () => {
  test("kertas-kerja: form-row jadi grid di layar lebar, bukan di sempit", async ({ page }) => {
    await setTemplate(page, "kertas-kerja");
    // itm-1 adalah seed store items (lihat src/app/api/items/_data.ts) — id
    // stabil untuk deep-link ke halaman edit.
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/items/itm-1/edit");

    const row = page.locator('[data-slot="form-row"]').first();
    await expect(row).toBeVisible();
    await expect(row).toHaveCSS("display", "grid");

    // Media query `(min-width: 48rem)` dievaluasi ulang oleh browser begitu
    // viewport berubah — tak perlu reload/navigasi ulang.
    await page.setViewportSize({ width: 375, height: 800 });
    await expect(row).not.toHaveCSS("display", "grid");
  });

  test("ruang-rapat: card memakai box-shadow --lift, adminly tidak", async ({ page }) => {
    // Dibandingkan lewat elemen probe yang di-render browser yang sama,
    // supaya normalisasi warna (oklch → computed) tak bikin perbandingan
    // string rapuh — keduanya melalui resolusi CSSOM yang identik.
    async function cardShadowVsLift(p: Page) {
      return p.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.boxShadow = "var(--lift)";
        document.body.appendChild(probe);
        const lift = getComputedStyle(probe).boxShadow;
        probe.remove();
        const card = document.querySelector('[data-slot="card"]');
        return { card: card ? getComputedStyle(card).boxShadow : null, lift };
      });
    }

    await setTemplate(page, "ruang-rapat");
    await page.goto("/dashboard");
    const terangkat = await cardShadowVsLift(page);
    expect(terangkat.card).not.toBe("none");
    expect(terangkat.card).toBe(terangkat.lift);

    await setTemplate(page, "adminly");
    await page.goto("/dashboard");
    const bergaris = await cardShadowVsLift(page);
    expect(bergaris.card).not.toBe(bergaris.lift);
  });
});
