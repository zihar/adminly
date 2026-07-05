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
    const csv = toCsv(columns, [{ nama: "Budi, S.Kom", catatan: "-" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"Budi, S.Kom",-');
  });

  it("membungkus sel yang mengandung tanda kutip dan menggandakannya", () => {
    const csv = toCsv(columns, [{ nama: 'Si "Raja"', catatan: "-" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"Si ""Raja""",-');
  });

  it("membungkus sel yang mengandung baris baru", () => {
    const csv = toCsv(columns, [{ nama: "Budi\nSantoso", catatan: "-" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe('"Budi\nSantoso",-');
  });

  it("field yang tak ada pada row menjadi sel kosong", () => {
    const csv = toCsv(columns, [{ nama: "Budi" }]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("Budi,");
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
  it("tidak melempar error saat dipanggil (dan tidak menulis file sungguhan)", () => {
    const writeSpy = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    try {
      expect(() =>
        exportPdf(columns, [{ nama: "Budi", catatan: "biasa" }], "Judul", "test.pdf"),
      ).not.toThrow();
      expect(writeSpy).toHaveBeenCalledWith("test.pdf", expect.anything());
    } finally {
      writeSpy.mockRestore();
    }
  });
});
