import type { Locale } from "@/config/i18n";
import { en, type Dictionary } from "./en";
import { id } from "./id";

export const dictionaries: Record<Locale, Dictionary> = { en, id };

export type { Dictionary };

/** Ganti placeholder `{name}` dst. pada string kamus. */
export function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

/**
 * Resolve `labelKey` dot-path (mis. "items.nama") ke string kamus.
 * Dipakai bersama oleh layer CRUD generik (ResourceForm, kolom tabel, dst.)
 * agar label field selalu lewat i18n, bukan raw key.
 *
 * Fallback: jika path tidak ditemukan atau bukan string, pakai segmen
 * terakhir dari key (mis. "items.nama" → "nama") supaya UI tetap terbaca.
 */
export function resolveLabel(dict: Dictionary, key: string): string {
  const segments = key.split(".");
  let current: unknown = dict;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null) {
      current = undefined;
      break;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (typeof current === "string") return current;
  return segments[segments.length - 1] ?? key;
}

/**
 * Resolve label item navigasi sidebar/breadcrumb dari `key` (lihat `NavItem`
 * di `@/config/site`).
 * - Item statis (key ada di `t.nav`, mis. "dashboard") → `t.nav[key]`.
 * - Item resource dari registry (key = nama resource, mis. "items") →
 *   `resolveLabel(t, "<name>.title")`, konsisten dgn pola label resource
 *   lain (`resource-page.tsx`, dst.).
 */
/** Label tampilan resource Edelweiss (nav sidebar & breadcrumb). */
const RESOURCE_LABELS: Record<string, string> = {
  agama: "Agama",
  bahasarumah: "Bahasa Rumah",
  kewarganegaraan: "Kewarganegaraan",
  pekerjaan: "Pekerjaan",
  pendidikan: "Pendidikan",
  penilaian: "Penilaian",
  situasibelajar: "Situasi Belajar",
  slider: "Slider",
  sumber: "Sumber Silabus",
  semester: "Semester",
  unit: "Unit",
  jenisprogram: "Jenis Program",
  tahunajaran: "Tahun Ajaran",
  program: "Program",
  provinsi: "Provinsi",
  kabupaten: "Kabupaten",
  kecamatan: "Kecamatan",
  kelurahan: "Kelurahan",
  kelas: "Kelas",
  jambelajar: "Jam Belajar",
  menumobile: "Menu Mobile",
  parameter: "Parameter",
  paramjabatan: "Parameter Jabatan",
  silabusindikator: "Silabus Indikator",
  roles: "Role",
  staff: "Staff",
  users: "Pengguna",
};

export function resolveNavLabel(dict: Dictionary, key: string): string {
  if (key in dict.nav) return dict.nav[key as keyof Dictionary["nav"]];
  if (key in RESOURCE_LABELS) return RESOURCE_LABELS[key];
  return resolveLabel(dict, `${key}.title`);
}
