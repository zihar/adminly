import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Pasangan kontras yang DIUKUR (contrast.test.ts) hanya berarti bila badge
// yang benar-benar dirender memakainya. Varian `destructive` memakai
// `bg-destructive/10 text-destructive` (≈4.0:1 di terang, ≈4.2:1 di gelap),
// jadi status "rejected" wajib memakai varian `danger` (token --status-rejected-*).
const items = readFileSync(
  resolve(__dirname, "../resources/items.ts"),
  "utf8",
);

describe("varian badge status workflow items", () => {
  it.each([
    ["draft", "secondary"],
    ["submitted", "warning"],
    ["approved", "success"],
    ["rejected", "danger"],
  ])("%s memakai varian %s", (status, variant) => {
    const line = items
      .split("\n")
      .find((l) => l.includes(`value: "${status}"`) && l.includes("variant"));
    expect(line, `baris status ${status} tidak ditemukan`).toBeDefined();
    expect(line).toContain(`variant: "${variant}"`);
  });
});
