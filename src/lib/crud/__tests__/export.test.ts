import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import { toCsv, exportPdf } from "@/lib/crud/export";
import type { ExportColumn } from "@/lib/crud/export";

// Kolom fixture ringan — dipakai berulang di beberapa kasus.
const columns: ExportColumn[] = [
  { header: "Nama", field: "nama" },
  { header: "Catatan", field: "catatan" },
];

describe("toCsv", () => {
  it("baris pertama berisi header kolom", () => {
    const csv = toCsv(columns, []);
    expect(csv.split("\r\n")[0]).toBe("Nama,Catatan");
  });

  it("menulis satu baris per row dengan nilai apa adanya", () => {
    const csv = toCsv(columns, [{ nama: "Budi", catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Nama,Catatan");
    expect(lines[1]).toBe("Budi,biasa");
  });

  it("membungkus sel yang mengandung koma dengan tanda kutip", () => {
    const csv = toCsv(columns, [{ nama: "Budi, S.Kom", catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"Budi, S.Kom",biasa');
  });

  it("membungkus sel yang mengandung tanda kutip dan menggandakannya", () => {
    const csv = toCsv(columns, [{ nama: 'Si "Raja"', catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"Si ""Raja""",biasa');
  });

  it("membungkus sel yang mengandung baris baru", () => {
    const csv = toCsv(columns, [{ nama: "Budi\nSantoso", catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"Budi\nSantoso",biasa');
  });

  it("field yang tak ada pada row menjadi sel kosong", () => {
    const csv = toCsv(columns, [{ nama: "Budi" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("Budi,");
  });

  it("memberi prefiks `'` pada sel yang diawali `=` (cegah formula injection)", () => {
    const csv = toCsv(columns, [{ nama: "=SUM(A1)", catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("'=SUM(A1),biasa");
  });

  it("memberi prefiks `'` pada sel yang diawali `+`", () => {
    const csv = toCsv(columns, [{ nama: "+1", catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("'+1,biasa");
  });

  it("memberi prefiks `'` pada sel yang diawali `-`", () => {
    const csv = toCsv(columns, [{ nama: "-1", catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("'-1,biasa");
  });

  it("memberi prefiks `'` pada sel yang diawali `@`", () => {
    const csv = toCsv(columns, [{ nama: "@x", catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("'@x,biasa");
  });

  it("sel normal (string biasa/angka) tak berubah", () => {
    const csv = toCsv(columns, [{ nama: "draft", catatan: 123 }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("draft,123");
  });

  it("sel formula yang juga mengandung koma tetap diberi prefiks DAN dibungkus kutip", () => {
    const csv = toCsv(columns, [{ nama: "=SUM(A1,A2)", catatan: "biasa" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"\'=SUM(A1,A2)",biasa');
  });
});

// Smoke test ringan — `exportPdf` browser-oriented (jspdf + autotable),
// jadi tak diverifikasi isi PDF-nya di sini, hanya dipastikan tak melempar
// error. Vitest me-resolve build Node `jspdf` (bukan build browser) yang
// menulis `doc.save()` langsung ke filesystem via `fs.writeFileSync` — di
// browser sungguhan ini memicu unduhan, bukan tulis file. `writeFileSync`
// di-mock supaya test TIDAK meninggalkan file .pdf nyata di repo (output
// tetap pristine). Penggunaan nyata via toolbar (Task 4) + manual di browser.
describe("exportPdf", () => {
  it("tidak melempar error saat dipanggil (dan tidak menulis file sungguhan)", async () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    try {
      await expect(
        exportPdf(columns, [{ nama: "Budi", catatan: "biasa" }], "Judul", "test.pdf"),
      ).resolves.toBeUndefined();
      expect(writeSpy).toHaveBeenCalledWith("test.pdf", expect.anything());
    } finally {
      writeSpy.mockRestore();
    }
  });
});
