import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/config/templates";

const THEMES_DIR = resolve(__dirname, "../../app/themes");

/** Gabungan seluruh berkas tema — cukup dibaca sekali. */
function allThemeCss(): string {
  return TEMPLATES.map((t) =>
    readFileSync(resolve(THEMES_DIR, `${t.id}.css`), "utf8"),
  ).join("\n");
}

/**
 * Ambil himpunan nama custom property di dalam satu blok selektor.
 * Blok token tidak punya kurung kurawal bersarang, jadi `[^}]*` aman.
 */
function tokensOf(css: string, selector: string): Set<string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`blok CSS tidak ditemukan: ${selector}`);
  return new Set(
    [...match[1].matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
  );
}

const GLOBALS_PATH = resolve(__dirname, "../../app/globals.css");

const base = readFileSync(resolve(THEMES_DIR, "base.css"), "utf8");
const rootTokens = tokensOf(base, ":root");
const darkTokens = tokensOf(base, ".dark");
const themes = allThemeCss();

describe("integritas token template", () => {
  it("lantai dasar punya token lapisan template", () => {
    expect(rootTokens).toContain("--font-app");
    expect(rootTokens).toContain("--label-col");
    expect(rootTokens).toContain("--lift");
  });

  it.each(TEMPLATES.map((t) => t.id))(
    "%s: blok terang mendefinisikan token yang sama persis dengan :root",
    (id) => {
      const light = tokensOf(themes, `[data-template="${id}"]`);
      expect([...light].sort()).toEqual([...rootTokens].sort());
    },
  );

  it.each(TEMPLATES.map((t) => t.id))(
    "%s: blok gelap menutup seluruh token .dark dan tak memperkenalkan nama baru",
    (id) => {
      const dark = tokensOf(themes, `[data-template="${id}"].dark`);
      const kurang = [...darkTokens].filter((t) => !dark.has(t));
      const asing = [...dark].filter((t) => !rootTokens.has(t));
      expect(kurang).toEqual([]);
      expect(asing).toEqual([]);
    },
  );
});

/*
 * Tes token di atas membaca `themes/<id>.css` LANGSUNG dari disk — kalau
 * templatenya terdaftar di `TEMPLATES` tapi lupa di-`@import` di globals.css,
 * berkasnya tetap ada dan tetap punya token yang benar, jadi tes di atas
 * tetap hijau walau template itu tak pernah dimuat browser (render sebagai
 * near-miss Adminly, tanpa error apa pun). Tes ini menutup celah itu dengan
 * membaca globals.css sendiri dan memastikan urutan impornya — kontrak yang
 * didokumentasikan di komentar globals.css: base.css dulu, lalu tiap berkas
 * template, lalu vocabulary.css terakhir.
 */
describe("integritas impor template di globals.css", () => {
  const globals = readFileSync(GLOBALS_PATH, "utf8");

  function importIndex(path: string): number {
    return globals.indexOf(`@import "${path}";`);
  }

  const baseIdx = importIndex("./themes/base.css");
  const vocabIdx = importIndex("./themes/vocabulary.css");

  it("base.css dan vocabulary.css sendiri benar-benar diimpor", () => {
    expect(baseIdx).toBeGreaterThan(-1);
    expect(vocabIdx).toBeGreaterThan(-1);
  });

  it.each(TEMPLATES.map((t) => t.id))(
    "%s: diimpor di globals.css, setelah base.css dan sebelum vocabulary.css",
    (id) => {
      const idx = importIndex(`./themes/${id}.css`);
      // Pesan kustom: kegagalan di sini HARUS langsung menunjuk baris impor
      // yang hilang/salah urutan, bukan cuma "-1 !== angka".
      expect(idx, `@import "./themes/${id}.css" tidak ditemukan di globals.css`).toBeGreaterThan(-1);
      expect(idx, `@import "./themes/${id}.css" harus SETELAH @import "./themes/base.css"`).toBeGreaterThan(baseIdx);
      expect(idx, `@import "./themes/${id}.css" harus SEBELUM @import "./themes/vocabulary.css"`).toBeLessThan(vocabIdx);
    },
  );
});
