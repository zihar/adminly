/**
 * Registry template tampilan (pure — aman dipakai di server, client, maupun
 * proxy; tidak mengimpor React atau lucide-react).
 *
 * Sebuah "template" menentukan tiga hal sekaligus:
 *  - warna & tipografi  → blok CSS `[data-template="<id>"]` di src/app/themes/
 *  - kerangka navigasi  → `shell`, dipakai src/app/(app)/layout.tsx
 *  - bentuk komponen    → `density` + `surface`, dipasang sebagai atribut di
 *                         <html> dan dibaca src/app/themes/vocabulary.css
 *
 * Nama keluarga huruf TIDAK disimpan di sini — ia hidup sebagai token
 * `--font-app` di blok CSS template masing-masing, supaya satu nilai tidak
 * hidup di dua tempat.
 */

export type Shell = "sidebar" | "topnav";
export type Density = "normal" | "lega";
export type Surface = "bergaris" | "terangkat";

type TemplateEntry = {
  readonly id: string;
  /** Kunci i18n judul kartu, mis. "template.adminly.label". */
  readonly labelKey: string;
  /** Kunci i18n kalimat "untuk siapa" di kartu picker. */
  readonly descKey: string;
  readonly shell: Shell;
  readonly density: Density;
  readonly surface: Surface;
};

export const TEMPLATES = [
  {
    id: "adminly",
    labelKey: "template.adminly.label",
    descKey: "template.adminly.desc",
    shell: "sidebar",
    density: "normal",
    surface: "bergaris",
  },
  {
    id: "kertas-kerja",
    labelKey: "template.kertasKerja.label",
    descKey: "template.kertasKerja.desc",
    shell: "sidebar",
    density: "lega",
    surface: "bergaris",
  },
] as const satisfies readonly TemplateEntry[];

/** Union id yang benar-benar terdaftar — ikut melebar saat entri ditambah. */
export type TemplateId = (typeof TEMPLATES)[number]["id"];
export type TemplateDef = (typeof TEMPLATES)[number];

/** Fork mengganti nilai ini untuk menetapkan tampilan bawaan project-nya. */
export const DEFAULT_TEMPLATE: TemplateId = "adminly";

export const TEMPLATE_COOKIE = "adminly_template";

/** Definisi template; id asing jatuh ke template default. */
export function templateById(id: string): TemplateDef {
  for (const t of TEMPLATES) {
    if (t.id === id) return t;
  }
  for (const t of TEMPLATES) {
    if (t.id === DEFAULT_TEMPLATE) return t;
  }
  return TEMPLATES[0];
}

/** Validasi nilai cookie → TemplateId aman (fallback ke DEFAULT_TEMPLATE). */
export function parseTemplate(value: string | undefined | null): TemplateId {
  if (!value) return DEFAULT_TEMPLATE;
  for (const t of TEMPLATES) {
    if (t.id === value) return t.id;
  }
  return DEFAULT_TEMPLATE;
}
