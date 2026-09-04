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
