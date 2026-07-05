/** Kolom untuk ekspor CSV/PDF: header tampilan + nama field pada row. */
export type ExportColumn = { header: string; field: string };

// Karakter yang memaksa sebuah sel CSV dibungkus tanda kutip (RFC 4180-ish).
const NEEDS_QUOTE = /[",\r\n]/;

// Karakter awal yang membuat Excel/Sheets membaca sel sebagai formula
// (formula injection). Sel yang diawali salah satu ini diberi prefiks `'`
// agar dibaca sebagai teks literal, bukan dieksekusi.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Escape satu nilai sel CSV: bungkus kutip + gandakan `"` internal bila perlu. */
function escapeCsvCell(value: string): string {
  // Cegah formula injection dulu, sebelum cek kebutuhan quoting — sel yang
  // sudah diberi prefiks `'` bisa saja tetap butuh dibungkus kutip (mis. bila
  // ia juga mengandung koma).
  const safeValue = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (!NEEDS_QUOTE.test(safeValue)) return safeValue;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

/**
 * Ubah kolom + baris data menjadi teks CSV (baris header dulu, lalu satu
 * baris per row). Nilai yang tak ada pada row jadi sel kosong. Sel yang
 * mengandung `,`, `"`, atau baris baru dibungkus tanda kutip.
 */
export function toCsv(columns: ExportColumn[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map((c) => escapeCsvCell(c.header)).join(",")];
  for (const row of rows) {
    lines.push(
      columns.map((c) => escapeCsvCell(String(row[c.field] ?? ""))).join(","),
    );
  }
  return lines.join("\r\n");
}

/**
 * Trigger download file di browser dari sebuah `Blob`. No-op di lingkungan
 * non-browser (mis. SSR/testing tanpa DOM) karena `document` tak tersedia.
 */
export function downloadBlob(filename: string, mime: string, content: BlobPart): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Ekspor kolom + baris data ke PDF (tabel via jspdf-autotable) lalu simpan
 * sebagai file. `jspdf`/`jspdf-autotable` di-import secara dinamis (lazy)
 * agar library besar ini tak ikut ter-bundle ke initial chunk halaman list —
 * hanya dimuat saat pengguna benar-benar mengklik ekspor PDF. Browser-
 * oriented — tak diuji unit secara ketat, hanya dipastikan tak melempar
 * error (lihat `resource-table.tsx`/manual test).
 */
export async function exportPdf(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  title: string,
  filename: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.text(title, 14, 15);
  autoTable(doc, {
    startY: 20,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.field] ?? ""))),
  });
  doc.save(filename);
}
