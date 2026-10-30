import { describe, expect, it } from "vitest";
import { initialsOf, toneOf } from "@/lib/tone";

describe("toneOf", () => {
  it("deterministik untuk input yang sama", () => {
    expect(toneOf("a")).toBe(toneOf("a"));
    expect(toneOf("Ani Rahma Putri")).toBe(toneOf("Ani Rahma Putri"));
  });

  it("selalu bernilai 1..4, juga untuk input kosong dan sangat panjang", () => {
    for (const key of ["", "a", "Budi", "x".repeat(500), "日本語"]) {
      expect([1, 2, 3, 4]).toContain(toneOf(key));
    }
  });

  it("memakai lebih dari satu warna pada kunci yang berbeda", () => {
    const tones = new Set(
      ["items", "users", "settings", "dashboard", "reports", "orders"].map(
        toneOf,
      ),
    );
    expect(tones.size).toBeGreaterThan(1);
  });
});

describe("initialsOf", () => {
  it("kosong atau spasi saja menjadi ?", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("  ")).toBe("?");
  });

  it("satu kata menjadi satu huruf", () => {
    expect(initialsOf("Budi")).toBe("B");
  });

  it("maksimal dua huruf kapital dari dua kata pertama", () => {
    expect(initialsOf("Ani Rahma Putri")).toBe("AR");
    expect(initialsOf("ani rahma")).toBe("AR");
  });

  it("nama sangat panjang tetap dua huruf", () => {
    expect(initialsOf(`${"a".repeat(200)} ${"b".repeat(200)}`)).toBe("AB");
  });
});
