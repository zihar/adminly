import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const THEME = readFileSync(
  resolve(__dirname, "../../app/themes/adminly.css"),
  "utf8",
);

/** Ambil pasangan nama→nilai dari satu blok selektor (tanpa kurung bersarang). */
function tokensOf(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`blok CSS tidak ditemukan: ${selector}`);
  const out: Record<string, string> = {};
  for (const m of match[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

function linear(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** oklch(L C H [/ a]) → [r, g, b] sRGB 0..1 (terpotong ke gamut). */
function oklchToRgb(value: string): [number, number, number] {
  const m = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (!m) throw new Error(`bukan oklch(): ${value}`);
  const L = Number(m[1]);
  const C = Number(m[2]);
  const h = (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const mm = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  const rgb = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, linear(c))));
  return rgb as [number, number, number];
}

function luminance(value: string): number {
  const [r, g, b] = oklchToRgb(value).map((c) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = tokensOf(THEME, '[data-template="adminly"]');
const dark = { ...light, ...tokensOf(THEME, '[data-template="adminly"].dark') };

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["--foreground", "--background"],
  ["--muted-foreground", "--background"],
  ["--muted-foreground", "--card"],
  ["--muted-foreground", "--muted"],
  ["--primary-foreground", "--primary"],
  ["--status-draft-fg", "--status-draft-bg"],
  ["--status-submitted-fg", "--status-submitted-bg"],
  ["--status-approved-fg", "--status-approved-bg"],
  ["--status-rejected-fg", "--status-rejected-bg"],
];

describe("contrastRatio", () => {
  it("hitam di atas putih ≈ 21:1", () => {
    expect(contrastRatio("oklch(0 0 0)", "oklch(1 0 0)")).toBeCloseTo(21, 0);
  });
});

describe.each([
  ["terang", light],
  ["gelap", dark],
] as const)("kontras WCAG AA tema %s (template adminly)", (_name, tokens) => {
  it.each(PAIRS)("%s di atas %s ≥ 4.5:1", (fg, bg) => {
    expect(tokens[fg], `${fg} belum didefinisikan`).toBeDefined();
    expect(tokens[bg], `${bg} belum didefinisikan`).toBeDefined();
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

// Ikon sidebar berwarna adalah objek grafis (WCAG 1.4.11): minimal 3:1 di atas
// latar sidebar di kedua mode.
describe.each([
  ["terang", light],
  ["gelap", dark],
] as const)("kontras ikon modul tema %s (template adminly)", (_name, tokens) => {
  it.each(["--m1", "--m2", "--m3", "--m4"])("%s di atas --sidebar ≥ 3:1", (m) => {
    expect(contrastRatio(tokens[m], tokens["--sidebar"])).toBeGreaterThanOrEqual(3);
  });
});
