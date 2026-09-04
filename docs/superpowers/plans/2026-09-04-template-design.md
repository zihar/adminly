# Opsi Template Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User bisa memilih salah satu dari tiga template tampilan (Adminly, Kertas Kerja, Ruang Rapat) dari halaman Settings; pilihan bertahan antar-reload; developer yang nge-fork menetapkan default lewat satu konstanta.

**Architecture:** Registry pure di `src/config/templates.ts` mendaftarkan tiap template beserta shell/density/surface-nya. Pilihan disimpan di cookie dan dibaca `src/app/layout.tsx` (Server Component), lalu dipasang di `<html>` sebagai `data-template` / `data-density` / `data-surface` — cookie, bukan localStorage, karena shell ikut berganti dan itu berarti markup berbeda yang harus dirender server. Warna datang dari blok CSS `[data-template="…"]` yang menimpa lantai dasar `:root`; gaya komponen datang dari selektor `:where([data-slot="…"])` berspesifisitas nol sehingga tak satu pun file di `src/components/ui/` perlu disentuh. Sumbu terang/gelap tetap milik `next-themes` dan tidak diubah sama sekali.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (`@theme inline`), shadcn/ui (varian Base UI), `next-themes`, `next/font`, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-template-design-adminly-design.md`

## Global Constraints

- **Jangan sentuh `src/components/ui/`.** Semua override gaya komponen lewat `data-slot` + `:where()` di `src/app/themes/vocabulary.css`. Alasan: `npx shadcn@latest add` menimpa berkas di direktori itu.
- **Jangan sentuh `mode-toggle.tsx`, `sonner.tsx`, `theme-provider.tsx`, `proxy.ts`.** Sumbu terang/gelap tetap milik `next-themes`.
- **Nilai token Adminly tidak boleh berubah.** `src/app/themes/adminly.css` adalah salinan verbatim nilai `:root`/`.dark` yang ada sekarang.
- **Kosakata terkunci.** Hanya `density: "normal" | "lega"` dan `surface: "bergaris" | "terangkat"`. Nilai `"rapat"` dan `"rata"` menyusul bersama template Dispatch — jangan dibuat sekarang.
- **Cookie:** nama `adminly_template`, ditulis `path=/; max-age=31536000; samesite=lax` — sama persis dengan pola `adminly_locale` / `adminly_scope`.
- **Nama token baru:** `--font-app`, `--label-col`, `--lift`. Tidak ada nama lain.
- **Bahasa:** komentar kode dan string i18n Indonesia mengikuti gaya repo (komentar Indonesia, `en.ts` adalah sumber tipe).
- **Commit tiap task.** Branch `feat/design-templates`.

### Koreksi terhadap spec §4 (urutan `@import`)

Spec menulis bahwa berkas tema diimpor **setelah** blok `:root` di `globals.css`. Itu **tidak valid**: aturan `@import` di CSS wajib berada sebelum aturan lain, dan yang diletakkan setelahnya diabaikan tanpa pesan error. Rencana ini memindahkan lantai dasar ke `src/app/themes/base.css` juga, sehingga seluruh berkas token diimpor berurutan di kepala `globals.css` dan **urutan impor** yang mengatur cascade. Sifat yang dituju spec tetap terpenuhi: `[data-template="x"]` (0,1,0) mengalahkan `:root` (0,1,0) karena datang lebih belakang di urutan sumber.

### Koreksi terhadap spec §4.1 (aturan test integritas)

Spec menulis "setiap blok template wajib mendefinisikan himpunan nama custom property yang sama persis dengan `:root`". Untuk blok **gelap** itu keliru — `.dark` sendiri tidak mendefinisikan `--radius`, `--font-app`, `--label-col`. Aturan yang benar dan yang diuji di Task 3:

- **A.** Blok terang tiap template mendefinisikan himpunan token **sama persis** dengan `:root`.
- **B.** Blok gelap tiap template mendefinisikan **paling sedikit** himpunan token `.dark`, dan **tidak boleh** memuat nama yang tidak ada di `:root`.

---

## Peta berkas

**Dibuat:**

| Berkas | Tanggung jawab |
|---|---|
| `src/config/templates.ts` | Registry + `parseTemplate` + `DEFAULT_TEMPLATE`. Pure, tanpa React/ikon. |
| `src/config/__tests__/templates.test.ts` | Unit registry & parser. |
| `src/config/__tests__/template-css.test.ts` | Integritas token antara registry dan berkas CSS. |
| `src/app/themes/base.css` | Lantai dasar `:root` + `.dark` (pindahan dari `globals.css`). |
| `src/app/themes/adminly.css` | Blok `[data-template="adminly"]`, salinan verbatim lantai dasar. |
| `src/app/themes/kertas-kerja.css` | Palet Kertas Kerja terang + gelap. |
| `src/app/themes/ruang-rapat.css` | Palet Ruang Rapat terang + gelap. |
| `src/app/themes/vocabulary.css` | Satu-satunya tempat gaya komponen ditulis (`density`, `surface`). |
| `src/components/providers/template-provider.tsx` | State + cookie + atribut `<html>` + `router.refresh()`. |
| `src/components/providers/__tests__/template-provider.test.tsx` | Test provider. |
| `src/hooks/use-visible-nav.ts` | Satu sumber logika navigasi untuk kedua shell + breadcrumb. |
| `src/hooks/__tests__/use-visible-nav.test.tsx` | Test hook. |
| `src/components/layout/shells/sidebar-shell.tsx` | Shell sidebar (pindahan dari `(app)/layout.tsx`). |
| `src/components/layout/shells/topnav-shell.tsx` | Shell navigasi atas. |
| `src/components/layout/top-nav.tsx` | Bagian client dari shell top-nav (butuh `usePathname`/`useRbac`). |
| `src/components/layout/template-switcher.tsx` | Dropdown pemilih template di header. |
| `src/components/settings/template-picker.tsx` | Kartu pilihan berminiatur di tab Tampilan. |
| `e2e/template.spec.ts` | E2E persistensi + pergantian shell. |

**Diubah:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/settings/page.tsx`, `src/components/layout/app-sidebar.tsx`, `src/components/layout/site-header.tsx`, `src/components/crud/resource-form.tsx`, `src/locales/en.ts`, `src/locales/id.ts`, `README.md`.

---

## Task 1: Registry template

**Files:**
- Create: `src/config/templates.ts`
- Test: `src/config/__tests__/templates.test.ts`

**Interfaces:**
- Consumes: tidak ada.
- Produces: `TEMPLATES` (tuple const), `type TemplateId`, `type TemplateDef`, `type Shell = "sidebar" | "topnav"`, `type Density = "normal" | "lega"`, `type Surface = "bergaris" | "terangkat"`, `DEFAULT_TEMPLATE: TemplateId`, `TEMPLATE_COOKIE: string`, `templateById(id: string): TemplateDef`, `parseTemplate(value: string | undefined | null): TemplateId`.

Registry sengaja **hanya memuat `adminly`** di task ini. Entri `kertas-kerja` dan `ruang-rapat` ditambahkan di Task 8 dan 9 bersama berkas CSS-nya, supaya test integritas Task 3 tidak pernah merah gara-gara template yang terdaftar tapi belum punya palet.

- [ ] **Step 1: Tulis test yang gagal**

`src/config/__tests__/templates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE,
  TEMPLATES,
  TEMPLATE_COOKIE,
  parseTemplate,
  templateById,
} from "@/config/templates";

describe("parseTemplate", () => {
  it("mengembalikan id yang dikenal apa adanya", () => {
    expect(parseTemplate("adminly")).toBe("adminly");
  });

  it("jatuh ke DEFAULT_TEMPLATE untuk nilai asing, kosong, undefined, null", () => {
    expect(parseTemplate("tidak-ada")).toBe(DEFAULT_TEMPLATE);
    expect(parseTemplate("")).toBe(DEFAULT_TEMPLATE);
    expect(parseTemplate(undefined)).toBe(DEFAULT_TEMPLATE);
    expect(parseTemplate(null)).toBe(DEFAULT_TEMPLATE);
  });
});

describe("templateById", () => {
  it("mengembalikan definisi yang cocok", () => {
    expect(templateById("adminly").shell).toBe("sidebar");
  });

  it("jatuh ke template default untuk id asing", () => {
    expect(templateById("tidak-ada").id).toBe(DEFAULT_TEMPLATE);
  });
});

describe("registry", () => {
  it("punya id unik", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("DEFAULT_TEMPLATE benar-benar terdaftar", () => {
    expect(TEMPLATES.some((t) => t.id === DEFAULT_TEMPLATE)).toBe(true);
  });

  it("memakai nama cookie yang sama dengan preferensi lain", () => {
    expect(TEMPLATE_COOKIE).toBe("adminly_template");
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npx vitest run src/config/__tests__/templates.test.ts`
Expected: FAIL — `Failed to resolve import "@/config/templates"`.

- [ ] **Step 3: Tulis implementasi minimal**

`src/config/templates.ts`:

```ts
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
```

- [ ] **Step 4: Jalankan test, pastikan LULUS**

Run: `npx vitest run src/config/__tests__/templates.test.ts`
Expected: PASS, 6 test.

- [ ] **Step 5: Commit**

```bash
git add src/config/templates.ts src/config/__tests__/templates.test.ts
git commit -m "feat(templates): registry template + parseTemplate"
```

---

## Task 2: Lantai dasar CSS & pemisahan variabel huruf

**Files:**
- Create: `src/app/themes/base.css`, `src/app/themes/adminly.css`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: tidak ada (Task 1 belum dipakai di sini).
- Produces: token `--font-app`, `--label-col`, `--lift` tersedia di `:root`; variabel `next/font` Geist bernama `--font-geist`; blok `[data-template="adminly"]` dan `[data-template="adminly"].dark` tersedia untuk Task 3.

Setelah task ini aplikasi **harus tampil persis seperti sebelumnya**. Tidak ada perubahan visual yang diharapkan.

Kenapa variabel huruf dipisah: sekarang `next/font` Geist mengisi `--font-sans` **langsung**, dan `@theme inline` memetakan `--font-sans: var(--font-sans)`. Kalau `--font-app` ditambahkan tanpa memindahkan Geist, keduanya bertabrakan di nama yang sama dan huruf template tidak akan pernah kena — tanpa error apa pun.

- [ ] **Step 1: Pindahkan lantai dasar ke `themes/base.css`**

Buat `src/app/themes/base.css`. Isinya blok `:root` dan `.dark` yang **sekarang ada di `globals.css`**, disalin apa adanya, ditambah tiga token baru di `:root` saja:

```css
/*
 * Lantai dasar token. Dipakai saat elemen dirender TANPA atribut
 * `data-template` — cerita Storybook, test Vitest, komponen terisolasi.
 * Blok template di berkas tema lain menimpanya lewat `[data-template="…"]`.
 *
 * JANGAN pindahkan urutan @import di globals.css: `[data-template="x"]` dan
 * `:root` sama beratnya (0,1,0), jadi yang menang adalah urutan sumber.
 */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
  /* Token baru lapisan template. */
  --font-app: var(--font-geist);
  --label-col: 0px;
  --lift: none;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

- [ ] **Step 2: Buat `themes/adminly.css`**

Salinan verbatim isi kedua blok di atas, dibungkus selektor template. Duplikasi ini disengaja: lantai dasar melayani render tanpa atribut, blok template melayani render dengan atribut, dan fork boleh mengganti `:root` tanpa ikut mengubah arti "Adminly".

```css
/*
 * Template "Adminly" — tampilan bawaan. Nilai di sini adalah salinan
 * verbatim lantai dasar (themes/base.css) pada saat lapisan template
 * diperkenalkan. JANGAN diubah tanpa keputusan sadar: ini yang dipakai
 * fork yang tidak mau tampilannya bergeser.
 */
[data-template="adminly"] {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
  --font-app: var(--font-geist);
  --label-col: 0px;
  --lift: none;
}

[data-template="adminly"].dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

- [ ] **Step 3: Rombak kepala `globals.css`**

Hapus blok `:root` dan `.dark` dari `globals.css` (sudah pindah ke `base.css`), tambahkan impor, dan ubah pemetaan huruf. Kepala berkas jadi:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

/*
 * URUTAN IMPOR ADALAH BAGIAN DARI KONTRAK.
 * `[data-template="x"]` dan `:root` sama beratnya (0,1,0), jadi yang menang
 * adalah yang datang belakangan. `base.css` WAJIB pertama; berkas template
 * setelahnya; `vocabulary.css` terakhir. Menukar urutannya membuat template
 * berhenti menimpa lantai dasar — tanpa error apa pun.
 *
 * `@import` juga wajib berada sebelum aturan CSS lain, jadi blok ini tidak
 * boleh dipindah ke bawah `@theme` atau `:root`.
 */
@import "./themes/base.css";
@import "./themes/adminly.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-app);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  /* … sisa isi @theme inline tidak berubah … */
}
```

Sisa `globals.css` (seluruh `@theme inline` selain baris `--font-sans`, dan blok `@layer base`) **tidak berubah**.

- [ ] **Step 4: Ganti nama variabel `next/font` Geist**

`src/app/layout.tsx`, ubah satu baris:

```ts
const geistSans = Geist({
  // Dulu "--font-sans". Dipindah supaya `--font-sans` di @theme inline bebas
  // menunjuk `--font-app`, token yang boleh diganti tiap template.
  variable: "--font-geist",
  subsets: ["latin"],
});
```

`className` di `<html>` tetap `${geistSans.variable} ${geistMono.variable} h-full antialiased` — tidak berubah.

- [ ] **Step 5: Verifikasi tidak ada yang rusak**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: semuanya lulus, jumlah test sama seperti sebelum task ini.

Run: `npm run build`
Expected: build sukses tanpa peringatan CSS.

- [ ] **Step 6: Verifikasi visual**

Run: `npm run dev`, buka `http://localhost:3000/dashboard`, bandingkan dengan tampilan sebelum task ini. Latar putih, sidebar abu sangat terang, huruf Geist. Klik tombol terang/gelap — masih bekerja.

Kalau huruf berubah jadi huruf sistem, `--font-app` tidak terhubung: periksa `@theme inline` menunjuk `var(--font-app)` dan `:root` mendefinisikan `--font-app: var(--font-geist)`.

- [ ] **Step 7: Commit**

```bash
git add src/app/themes/base.css src/app/themes/adminly.css src/app/globals.css src/app/layout.tsx
git commit -m "refactor(css): pisah lantai dasar token ke themes/base.css + token --font-app"
```

---

## Task 3: Test integritas token

**Files:**
- Create: `src/config/__tests__/template-css.test.ts`

**Interfaces:**
- Consumes: `TEMPLATES` dari Task 1; berkas CSS dari Task 2.
- Produces: penjaga otomatis untuk Task 8 dan 9 — template yang didaftarkan tapi lupa dibuatkan palet akan merah di sini, bukan tampil sebagai halaman berwarna bolong.

- [ ] **Step 1: Tulis test**

`src/config/__tests__/template-css.test.ts`:

```ts
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
```

- [ ] **Step 2: Jalankan test, pastikan LULUS**

Run: `npx vitest run src/config/__tests__/template-css.test.ts`
Expected: PASS, 3 test (registry masih berisi `adminly` saja).

- [ ] **Step 3: Buktikan test benar-benar menangkap kesalahan**

Hapus sementara baris `--label-col: 0px;` dari blok `[data-template="adminly"]` di `src/app/themes/adminly.css`, lalu jalankan lagi.
Expected: FAIL pada "blok terang mendefinisikan token yang sama persis dengan :root".
Kembalikan barisnya, jalankan lagi, pastikan PASS.

- [ ] **Step 4: Commit**

```bash
git add src/config/__tests__/template-css.test.ts
git commit -m "test(templates): integritas token antara registry dan berkas CSS"
```

---

## Task 4: TemplateProvider & atribut di `<html>`

**Files:**
- Create: `src/components/providers/template-provider.tsx`
- Test: `src/components/providers/__tests__/template-provider.test.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `TEMPLATE_COOKIE`, `parseTemplate`, `templateById`, `TemplateId` dari Task 1.
- Produces: `TemplateProvider({ initialTemplate, children })`, `useTemplate(): { template: TemplateId; setTemplate: (next: TemplateId) => void }`. Task 10 dan 11 memakai `useTemplate`.

- [ ] **Step 1: Tulis test yang gagal**

`src/components/providers/__tests__/template-provider.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as React from "react";
import {
  TemplateProvider,
  useTemplate,
} from "@/components/providers/template-provider";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function Probe() {
  const { template, setTemplate } = useTemplate();
  return (
    <div>
      <span data-testid="id">{template}</span>
      <button onClick={() => setTemplate("adminly")}>set</button>
    </div>
  );
}

afterEach(() => {
  document.cookie = "adminly_template=; path=/; max-age=0";
  document.documentElement.removeAttribute("data-template");
  document.documentElement.removeAttribute("data-density");
  document.documentElement.removeAttribute("data-surface");
  refresh.mockClear();
});

describe("TemplateProvider", () => {
  it("memakai initialTemplate sebagai state awal", () => {
    render(
      <TemplateProvider initialTemplate="adminly">
        <Probe />
      </TemplateProvider>,
    );
    expect(screen.getByTestId("id").textContent).toBe("adminly");
  });

  it("setTemplate memasang tiga atribut, menulis cookie, dan me-refresh", () => {
    render(
      <TemplateProvider initialTemplate="adminly">
        <Probe />
      </TemplateProvider>,
    );
    act(() => {
      screen.getByText("set").click();
    });

    const el = document.documentElement;
    expect(el.dataset.template).toBe("adminly");
    expect(el.dataset.density).toBe("normal");
    expect(el.dataset.surface).toBe("bergaris");
    expect(document.cookie).toContain("adminly_template=adminly");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("useTemplate melempar error di luar provider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/TemplateProvider/);
    quiet.mockRestore();
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npx vitest run src/components/providers/__tests__/template-provider.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/providers/template-provider"`.

- [ ] **Step 3: Tulis implementasi**

`src/components/providers/template-provider.tsx`:

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  TEMPLATE_COOKIE,
  templateById,
  type TemplateId,
} from "@/config/templates";

type Ctx = {
  template: TemplateId;
  setTemplate: (next: TemplateId) => void;
};

const TemplateContext = React.createContext<Ctx | null>(null);

/**
 * Menyediakan template aktif ke Client Component. `initialTemplate` di-seed
 * dari cookie di server (root layout) agar konsisten dengan render server —
 * pola sama dengan `I18nProvider`.
 *
 * Melempar error bila dipakai di luar provider (beda dengan `useScope`):
 * tidak ada perilaku bawaan yang masuk akal untuk "template aktif", dan
 * diam-diam memakai default akan menyembunyikan shell yang salah pasang.
 */
export function TemplateProvider({
  initialTemplate,
  children,
}: {
  initialTemplate: TemplateId;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [template, setState] = React.useState<TemplateId>(initialTemplate);

  const setTemplate = React.useCallback(
    (next: TemplateId) => {
      const def = templateById(next);
      // 1. Pasang atribut lebih dulu supaya warna berganti SEKETIKA. Tanpa
      //    ini pergantian menunggu `router.refresh()` selesai dan terasa
      //    tersendat — shell dirender di server, jadi refresh tak terhindar.
      const el = document.documentElement;
      el.dataset.template = def.id;
      el.dataset.density = def.density;
      el.dataset.surface = def.surface;

      setState(next);
      document.cookie = `${TEMPLATE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // 2. Re-render Server Component agar shell (sidebar vs top-nav) ikut.
      router.refresh();
    },
    [router],
  );

  const value = React.useMemo<Ctx>(
    () => ({ template, setTemplate }),
    [template, setTemplate],
  );

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate(): Ctx {
  const ctx = React.useContext(TemplateContext);
  if (!ctx) {
    throw new Error("useTemplate harus dipakai di dalam <TemplateProvider>");
  }
  return ctx;
}
```

- [ ] **Step 4: Jalankan test, pastikan LULUS**

Run: `npx vitest run src/components/providers/__tests__/template-provider.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 5: Pasang di root layout**

`src/app/layout.tsx` — tambahkan impor, baca cookie, pasang atribut di `<html>`, bungkus anak dengan provider:

```tsx
import { TemplateProvider } from "@/components/providers/template-provider";
import { TEMPLATE_COOKIE, parseTemplate, templateById } from "@/config/templates";
```

Di dalam `RootLayout`, setelah `const locale = …`:

```tsx
  const template = parseTemplate(cookieStore.get(TEMPLATE_COOKIE)?.value);
  const templateDef = templateById(template);
```

Lalu pada elemen `<html>`, tambahkan tiga atribut (sisanya tidak berubah):

```tsx
    <html
      lang={locale}
      data-template={templateDef.id}
      data-density={templateDef.density}
      data-surface={templateDef.surface}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
```

Dan bungkus isi `ThemeProvider` dengan `TemplateProvider` — **di dalam** `ThemeProvider`, supaya `next-themes` tetap jadi lapisan terluar yang memasang `.dark`:

```tsx
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TemplateProvider initialTemplate={template}>
                <NuqsAdapter>{children}</NuqsAdapter>
                <Toaster richColors position="top-right" />
              </TemplateProvider>
            </ThemeProvider>
```

- [ ] **Step 6: Verifikasi**

Run: `npx tsc --noEmit && npx vitest run`
Expected: lulus semua.

Run: `npm run dev`, buka `http://localhost:3000/dashboard`, periksa di DevTools bahwa `<html>` punya `data-template="adminly" data-density="normal" data-surface="bergaris"`. Tampilan tidak berubah.

- [ ] **Step 7: Commit**

```bash
git add src/components/providers/template-provider.tsx src/components/providers/__tests__/template-provider.test.tsx src/app/layout.tsx
git commit -m "feat(templates): TemplateProvider + atribut template di <html>"
```

---

## Task 5: Hook `useVisibleNav`

**Files:**
- Create: `src/hooks/use-visible-nav.ts`
- Test: `src/hooks/__tests__/use-visible-nav.test.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`, `src/components/layout/site-header.tsx`

**Interfaces:**
- Consumes: `navMain`, `resourceNavItems`, `NavItem` dari `@/config/site`; `useRbac`; `ensureResourcesRegistered`.
- Produces: `useVisibleNav(): { items: NavItem[]; current: NavItem | undefined }`. Task 7 (`TopNav`) memakainya.

Ini yang membuat "dua shell" tidak berarti "dua kali kerja tiap menambah menu": penyaringan RBAC dan penentuan item aktif hidup di satu tempat; shell cuma menggambar.

**Penting:** `current` dihitung dari daftar **sebelum** disaring, persis seperti perilaku `site-header.tsx` sekarang. Kalau dihitung dari daftar tersaring, breadcrumb halaman yang aksesnya ditolak akan berubah — bukan bagian dari task ini.

- [ ] **Step 1: Tulis test yang gagal**

`src/hooks/__tests__/use-visible-nav.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVisibleNav } from "@/hooks/use-visible-nav";

const pathname = vi.hoisted(() => ({ value: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

const can = vi.hoisted(() => ({ fn: (_: string) => true }));
vi.mock("@/components/providers/rbac-provider", () => ({
  useRbac: () => ({ can: can.fn }),
}));

describe("useVisibleNav", () => {
  it("menyaring item yang permission-nya tidak dimiliki role aktif", () => {
    can.fn = (p: string) => p !== "users:manage";
    const { result } = renderHook(() => useVisibleNav());
    expect(result.current.items.some((i) => i.href === "/users")).toBe(false);
    expect(result.current.items.some((i) => i.href === "/dashboard")).toBe(true);
  });

  it("menandai item aktif dari pathname, termasuk sub-route", () => {
    can.fn = () => true;
    pathname.value = "/items/itm-1/edit";
    const { result } = renderHook(() => useVisibleNav());
    expect(result.current.current?.href).toBe("/items");
  });

  it("menentukan item aktif walau item itu tersaring dari daftar", () => {
    can.fn = (p: string) => p !== "users:manage";
    pathname.value = "/users";
    const { result } = renderHook(() => useVisibleNav());
    expect(result.current.current?.href).toBe("/users");
    expect(result.current.items.some((i) => i.href === "/users")).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

Run: `npx vitest run src/hooks/__tests__/use-visible-nav.test.tsx`
Expected: FAIL — `Failed to resolve import "@/hooks/use-visible-nav"`.

- [ ] **Step 3: Tulis implementasi**

`src/hooks/use-visible-nav.ts`:

```ts
"use client";

import { usePathname } from "next/navigation";

import { useRbac } from "@/components/providers/rbac-provider";
import { navMain, resourceNavItems, type NavItem } from "@/config/site";
import { ensureResourcesRegistered } from "@/config/resources/register";

/**
 * Satu sumber logika navigasi untuk semua shell dan breadcrumb: gabungkan
 * menu statis dengan menu turunan resource registry, saring lewat permission
 * role aktif, dan tentukan item yang cocok dengan URL sekarang.
 *
 * `current` sengaja dihitung dari daftar SEBELUM disaring — supaya breadcrumb
 * halaman yang aksesnya ditolak tetap menyebut halaman itu, persis perilaku
 * `site-header.tsx` sebelum hook ini ada.
 */
export function useVisibleNav(): {
  items: NavItem[];
  current: NavItem | undefined;
} {
  const pathname = usePathname();
  const { can } = useRbac();
  // Registry resource CRUD generik (mis. `items`) — idempotent.
  ensureResourcesRegistered();

  const all: NavItem[] = [...navMain, ...resourceNavItems()];
  const items = all.filter((item) => !item.permission || can(item.permission));
  const current = all.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return { items, current };
}
```

- [ ] **Step 4: Jalankan test, pastikan LULUS**

Run: `npx vitest run src/hooks/__tests__/use-visible-nav.test.tsx`
Expected: PASS, 3 test.

- [ ] **Step 5: Pakai hook di `app-sidebar.tsx`**

Ganti blok perhitungan nav. Hapus impor `usePathname`, `useRbac`, `navMain`, `resourceNavItems`, `NavItem`, `ensureResourcesRegistered`; tambahkan `import { useVisibleNav } from "@/hooks/use-visible-nav";`. Badan komponen jadi:

```tsx
export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { t } = useI18n();
  const { items, current } = useVisibleNav();
```

dan di dalam `.map`:

```tsx
            {items.map((item) => {
              const isActive = item.href === current?.href;
              const label = resolveNavLabel(t, item.key);
```

Sisa JSX tidak berubah.

- [ ] **Step 6: Pakai hook di `site-header.tsx`**

Hapus impor `usePathname`, `navMain`, `resourceNavItems`, `ensureResourcesRegistered`; tambahkan `import { useVisibleNav } from "@/hooks/use-visible-nav";`. Badan komponen jadi:

```tsx
export function SiteHeader() {
  const { t } = useI18n();
  const { current } = useVisibleNav();
```

Sisa JSX tidak berubah — `resolveNavLabel(t, current?.key ?? "dashboard")` tetap.

- [ ] **Step 7: Verifikasi**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: lulus semua.

Run: `npm run test:e2e -- rbac.spec.ts`
Expected: PASS — membuktikan penyaringan menu masih setara.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/use-visible-nav.ts src/hooks/__tests__/use-visible-nav.test.tsx src/components/layout/app-sidebar.tsx src/components/layout/site-header.tsx
git commit -m "refactor(layout): angkat logika navigasi ke useVisibleNav()"
```

---

## Task 6: Pisahkan shell sidebar

**Files:**
- Create: `src/components/layout/shells/sidebar-shell.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `templateById`, `parseTemplate`, `TEMPLATE_COOKIE` dari Task 1.
- Produces: `SidebarShell({ defaultOpen, children })` — Server Component. Task 7 menambah `TopNavShell` dengan bentuk props yang sama minus `defaultOpen`.

Tidak ada perubahan visual. Task ini cuma memindahkan kerangka supaya Task 7 punya tempat menaruh shell kedua.

- [ ] **Step 1: Buat `sidebar-shell.tsx`**

```tsx
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Shell "sidebar" — kerangka bawaan Adminly. Server Component: `SidebarProvider`
 * dan `AppSidebar` adalah Client Component yang dirender dari sini.
 *
 * `defaultOpen` dibaca dari cookie oleh `(app)/layout.tsx`, bukan di sini,
 * supaya shell tidak perlu tahu apa-apa soal cookie.
 */
export function SidebarShell({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Ubah `(app)/layout.tsx` jadi pemilih shell**

```tsx
import { cookies } from "next/headers";

import { SidebarShell } from "@/components/layout/shells/sidebar-shell";
import { RbacProvider } from "@/components/providers/rbac-provider";
import { ScopeProvider } from "@/components/providers/scope-provider";
import { ROLE_COOKIE, parseRole } from "@/config/rbac";
import { SCOPE_COOKIE, parseScope } from "@/config/scope";
import { ensureResourcesRegistered } from "@/config/resources/register";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Daftarkan resource CRUD generik (mis. `items`) sekali saat shell app
  // dirender di server — route dinamis `[resource]` bergantung pada registry ini.
  ensureResourcesRegistered();

  const cookieStore = await cookies();
  // Pertahankan state buka/tutup sidebar antar reload via cookie.
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  // Role aktif (DEMO) di-seed dari cookie agar konsisten dengan proxy.ts.
  const role = parseRole(cookieStore.get(ROLE_COOKIE)?.value);

  return (
    <RbacProvider initialRole={role}>
      <ScopeProvider initial={parseScope(cookieStore.get(SCOPE_COOKIE)?.value)}>
        <SidebarShell defaultOpen={defaultOpen}>{children}</SidebarShell>
      </ScopeProvider>
    </RbacProvider>
  );
}
```

Impor `TEMPLATE_COOKIE`, `parseTemplate`, `templateById` **belum ditambahkan** di task ini — pemilihan shell baru masuk di Task 7. Menambahkannya sekarang berarti variabel tak terpakai dan `npm run lint` gagal.

- [ ] **Step 3: Verifikasi**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Run: `npm run test:e2e -- items-list.spec.ts`
Expected: lulus semua; halaman tampil persis seperti sebelumnya.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/shells/sidebar-shell.tsx "src/app/(app)/layout.tsx"
git commit -m "refactor(layout): pindahkan kerangka sidebar ke SidebarShell"
```

---

## Task 7: Shell navigasi atas

**Files:**
- Create: `src/components/layout/shells/topnav-shell.tsx`, `src/components/layout/top-nav.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `useVisibleNav` (Task 5), `SidebarShell` (Task 6), `def.shell` (Task 1).
- Produces: `TopNavShell({ children })`. Dipakai saat template aktif punya `shell: "topnav"` — pertama kali benar-benar terpakai di Task 9.

- [ ] **Step 1: Buat komponen client `top-nav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Boxes } from "lucide-react";

import { ModeToggle } from "@/components/layout/mode-toggle";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ScopeSwitcher } from "@/components/layout/scope-switcher";
import { NavUser } from "@/components/layout/nav-user";
import { useI18n } from "@/components/providers/i18n-provider";
import { useVisibleNav } from "@/hooks/use-visible-nav";
import { siteConfig } from "@/config/site";
import { resolveNavLabel } from "@/locales";
import { cn } from "@/lib/utils";

/**
 * Navigasi horizontal di atas bidang `--sidebar`. Dipakai template yang
 * mendeklarasikan `shell: "topnav"` — dashboard yang ditampilkan ke ruangan
 * butuh seluruh lebar layar, dan sidebar kiri memakan ruang paling mahal.
 *
 * Daftar menu & item aktif datang dari `useVisibleNav()`, hook yang sama
 * dipakai `AppSidebar` — menambah item menu tetap sekali kerja.
 */
export function TopNav() {
  const { t } = useI18n();
  const { items, current } = useVisibleNav();

  return (
    <header className="sticky top-0 z-10 bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-6 px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Boxes className="size-5" />
          <span className="font-semibold">{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === current?.href ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                item.href === current?.href &&
                  "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              {resolveNavLabel(t, item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ScopeSwitcher />
          <LocaleSwitcher />
          <RoleSwitcher />
          <ModeToggle />
          <NavUser
            user={{ name: "Admin", email: "admin@example.com", avatar: "" }}
          />
        </div>
      </div>

      {/* Menu ringkas untuk layar sempit — top-nav tak punya laci samping. */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === current?.href ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/75",
              item.href === current?.href &&
                "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            )}
          >
            {resolveNavLabel(t, item.key)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Buat `topnav-shell.tsx`**

```tsx
import { TopNav } from "@/components/layout/top-nav";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Shell "topnav" — navigasi horizontal, konten selebar layar, tanpa sidebar.
 */
export function TopNavShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <TopNav />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 md:p-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 3: Sambungkan pemilih di `(app)/layout.tsx`**

Tambahkan impor yang sengaja ditunda dari Task 6:

```tsx
import { TopNavShell } from "@/components/layout/shells/topnav-shell";
import { TEMPLATE_COOKIE, parseTemplate, templateById } from "@/config/templates";
```

Baca template di dalam `AppLayout`, setelah `const role = …`:

```tsx
  // Template menentukan kerangka navigasi — karena itu dibaca di SERVER:
  // shell berbeda = markup berbeda, tak bisa ditunda ke client tanpa bikin
  // kerangka halaman berkedip tiap load.
  const def = templateById(
    parseTemplate(cookieStore.get(TEMPLATE_COOKIE)?.value),
  );
```

Lalu ganti bagian render:

```tsx
      <ScopeProvider initial={parseScope(cookieStore.get(SCOPE_COOKIE)?.value)}>
        {def.shell === "topnav" ? (
          <TopNavShell>{children}</TopNavShell>
        ) : (
          <SidebarShell defaultOpen={defaultOpen}>{children}</SidebarShell>
        )}
      </ScopeProvider>
```

- [ ] **Step 4: Verifikasi dengan template sementara**

Belum ada template ber-`shell: "topnav"` sampai Task 9, jadi buktikan jalurnya sekarang secara manual:

Ubah **sementara** `shell: "sidebar"` jadi `shell: "topnav"` pada entri `adminly` di `src/config/templates.ts`, jalankan `npm run dev`, buka `/dashboard`.
Expected: navigasi horizontal muncul, sidebar hilang, menu tetap menyaring sesuai role, halaman `/items` tetap jalan.
**Kembalikan ke `"sidebar"`** sebelum lanjut, lalu muat ulang dan pastikan sidebar kembali.

- [ ] **Step 5: Verifikasi otomatis**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: lulus semua.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/shells/topnav-shell.tsx src/components/layout/top-nav.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(layout): shell navigasi atas + pemilih shell dari template"
```

---

## Task 8: Template Kertas Kerja

**Files:**
- Create: `src/app/themes/kertas-kerja.css`, `src/app/themes/vocabulary.css`
- Modify: `src/config/templates.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/crud/resource-form.tsx`

**Interfaces:**
- Consumes: registry (Task 1), test integritas (Task 3).
- Produces: `TemplateId` melebar jadi `"adminly" | "kertas-kerja"`; penanda `data-slot="form-row"` di baris form; aturan `data-density="lega"`.

- [ ] **Step 1: Daftarkan template — test harus MERAH**

Tambahkan entri kedua di `TEMPLATES` (`src/config/templates.ts`), setelah `adminly`:

```ts
  {
    id: "kertas-kerja",
    labelKey: "template.kertasKerja.label",
    descKey: "template.kertasKerja.desc",
    shell: "sidebar",
    density: "lega",
    surface: "bergaris",
  },
```

- [ ] **Step 2: Jalankan test integritas, pastikan GAGAL**

Run: `npx vitest run src/config/__tests__/template-css.test.ts`
Expected: FAIL — `ENOENT: no such file or directory … themes/kertas-kerja.css`. Inilah gunanya test itu: template terdaftar tanpa palet ketahuan langsung.

- [ ] **Step 3: Tulis paletnya**

`src/app/themes/kertas-kerja.css`:

```css
/*
 * Template "Kertas Kerja" — untuk staf yang mengisi & mengoreksi form panjang
 * seharian.
 *
 * Kertasnya putih kebiruan yang DINGIN, bukan krem: krem menurunkan kontras
 * justru saat mata paling butuh. Kartu putih murni supaya terangkat dari
 * kertas tanpa perlu bayangan. Satu aksen saja — biru tinta, warna pena yang
 * mengoreksi formulir — dipakai hanya untuk fokus dan aksi utama, tak pernah
 * untuk dekorasi.
 */
[data-template="kertas-kerja"] {
  --background: oklch(0.982 0.004 245);
  --foreground: oklch(0.24 0.016 255);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.24 0.016 255);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.24 0.016 255);
  --primary: oklch(0.47 0.145 258);
  --primary-foreground: oklch(0.99 0.002 258);
  --secondary: oklch(0.945 0.006 250);
  --secondary-foreground: oklch(0.24 0.016 255);
  --muted: oklch(0.945 0.006 250);
  --muted-foreground: oklch(0.53 0.013 255);
  --accent: oklch(0.93 0.012 255);
  --accent-foreground: oklch(0.24 0.016 255);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.905 0.006 255);
  --input: oklch(0.905 0.006 255);
  --ring: oklch(0.47 0.145 258);
  --chart-1: oklch(0.47 0.145 258);
  --chart-2: oklch(0.58 0.115 245);
  --chart-3: oklch(0.67 0.09 232);
  --chart-4: oklch(0.75 0.07 220);
  --chart-5: oklch(0.83 0.05 210);
  --radius: 0.375rem;
  --sidebar: oklch(0.958 0.005 245);
  --sidebar-foreground: oklch(0.24 0.016 255);
  --sidebar-primary: oklch(0.47 0.145 258);
  --sidebar-primary-foreground: oklch(0.99 0.002 258);
  --sidebar-accent: oklch(0.925 0.01 250);
  --sidebar-accent-foreground: oklch(0.24 0.016 255);
  --sidebar-border: oklch(0.895 0.007 252);
  --sidebar-ring: oklch(0.47 0.145 258);
  --font-app: var(--font-public-sans);
  --label-col: 190px;
  --lift: none;
}

[data-template="kertas-kerja"].dark {
  --background: oklch(0.175 0.01 265);
  --foreground: oklch(0.925 0.008 265);
  --card: oklch(0.225 0.012 265);
  --card-foreground: oklch(0.925 0.008 265);
  --popover: oklch(0.225 0.012 265);
  --popover-foreground: oklch(0.925 0.008 265);
  --primary: oklch(0.735 0.105 268);
  --primary-foreground: oklch(0.175 0.01 265);
  --secondary: oklch(0.275 0.014 265);
  --secondary-foreground: oklch(0.925 0.008 265);
  --muted: oklch(0.275 0.014 265);
  --muted-foreground: oklch(0.665 0.018 265);
  --accent: oklch(0.295 0.016 265);
  --accent-foreground: oklch(0.925 0.008 265);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.3 0.014 265);
  --input: oklch(0.325 0.015 265);
  --ring: oklch(0.735 0.105 268);
  --chart-1: oklch(0.735 0.105 268);
  --chart-2: oklch(0.67 0.1 248);
  --chart-3: oklch(0.61 0.09 232);
  --chart-4: oklch(0.55 0.075 220);
  --chart-5: oklch(0.48 0.06 210);
  --sidebar: oklch(0.155 0.01 265);
  --sidebar-foreground: oklch(0.925 0.008 265);
  --sidebar-primary: oklch(0.735 0.105 268);
  --sidebar-primary-foreground: oklch(0.175 0.01 265);
  --sidebar-accent: oklch(0.275 0.014 265);
  --sidebar-accent-foreground: oklch(0.925 0.008 265);
  --sidebar-border: oklch(0.3 0.014 265);
  --sidebar-ring: oklch(0.735 0.105 268);
}
```

- [ ] **Step 4: Buat `vocabulary.css`**

```css
/*
 * KOSAKATA gaya komponen — SATU-SATUNYA tempat gaya komponen boleh ditulis.
 *
 * Semua selektor memakai `:where()` sehingga spesifisitasnya NOL: utility
 * Tailwind di `className` selalu menang, dan tak ada perang `!important`.
 * Yang di-hook adalah penanda `data-slot` yang sudah dibawa tiap komponen
 * shadcn — jadi tak satu pun berkas di src/components/ui/ perlu disentuh dan
 * `npx shadcn@latest add` tetap aman.
 *
 * Nilai yang ada di sini HANYA yang benar-benar dipakai template terdaftar.
 * `density: rapat` dan `surface: rata` menyusul bersama template Dispatch.
 */

/* ── Kepadatan ───────────────────────────────────────────────────────── */

/*
 * `lega`: label pindah ke kolom kiri sejajar dengan field, tiap baris dipisah
 * garis rambut. Pada form 20 field, mata bisa melacak barisnya sendiri.
 * Di layar sempit label kembali ke atas field — kolom 190px memakan lebar
 * yang memang tidak ada di sana.
 */
@media (min-width: 48rem) {
  [data-density="lega"] :where([data-slot="form-row"]) {
    display: grid;
    grid-template-columns: var(--label-col) 1fr;
    align-items: center;
    gap: 0 1.25rem;
    border-bottom: 1px solid var(--border);
    padding-block: 0.5rem;
  }

  [data-density="lega"] :where([data-slot="form-row"]:last-child) {
    border-bottom: 0;
  }
}

/*
 * Target klik lega untuk orang yang mengetik ratusan baris sehari. Sengaja
 * DILINGKUPI ke dalam baris form: kalau dipasang global, tombol ikon di
 * header dan trigger sidebar ikut membesar — bukan yang dimaksud.
 * `SelectField` sudah berupa Popover + Button, jadi trigger-nya ikut terkena
 * lewat [data-slot="button"] tanpa penanda tambahan.
 */
[data-density="lega"] [data-slot="form-row"] :where(input, textarea, [data-slot="button"]) {
  min-height: 2.625rem;
}
```

- [ ] **Step 5: Impor kedua berkas di `globals.css`**

Tambahkan setelah `@import "./themes/adminly.css";`:

```css
@import "./themes/kertas-kerja.css";
@import "./themes/vocabulary.css";
```

`vocabulary.css` **selalu terakhir** di antara berkas tema.

- [ ] **Step 6: Muat huruf Public Sans**

`src/app/layout.tsx` — tambah impor dan pemuat font:

```ts
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
```

```ts
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  // Bukan huruf bawaan: jangan dipreload. Peramban tetap mengunduhnya saat
  // template Kertas Kerja aktif; @font-face yang tak terpakai tidak ditarik.
  preload: false,
});
```

dan sisipkan `${publicSans.variable}` ke `className` di `<html>`:

```tsx
className={`${geistSans.variable} ${geistMono.variable} ${publicSans.variable} h-full antialiased`}
```

- [ ] **Step 7: Tandai baris form**

`src/components/crud/resource-form.tsx`, di dalam `renderField`, tambahkan satu atribut:

```tsx
  const renderField = (f: string) => (
    <div key={f} data-slot="form-row" className="space-y-1">
```

Sisa fungsi tidak berubah. Penanda ini netral terhadap semua template — hanya berarti saat `data-density="lega"` aktif.

- [ ] **Step 8: Jalankan test, pastikan LULUS**

Run: `npx vitest run`
Expected: PASS semua, termasuk test integritas yang tadi merah.

Run: `npx tsc --noEmit && npm run lint`
Expected: lulus.

- [ ] **Step 9: Verifikasi visual**

Run: `npm run dev`. Set cookie lewat konsol DevTools lalu muat ulang:

```js
document.cookie = "adminly_template=kertas-kerja; path=/; max-age=31536000; samesite=lax"; location.reload();
```

Buka `/items/itm-1/edit`.
Expected: latar putih kebiruan, huruf Public Sans, radius lebih kecil, label form berada di kolom kiri sejajar field dengan garis rambut antar baris, tinggi field bertambah. Klik terang/gelap — palet gelap Kertas Kerja muncul, bukan abu Adminly.

Sempitkan jendela di bawah 768px: label kembali ke atas field.

Kembalikan: `document.cookie = "adminly_template=adminly; path=/";`

- [ ] **Step 10: Commit**

```bash
git add src/app/themes/kertas-kerja.css src/app/themes/vocabulary.css src/config/templates.ts src/app/globals.css src/app/layout.tsx src/components/crud/resource-form.tsx
git commit -m "feat(templates): template Kertas Kerja + kosakata kepadatan"
```

---

## Task 9: Template Ruang Rapat

**Files:**
- Create: `src/app/themes/ruang-rapat.css`
- Modify: `src/config/templates.ts`, `src/app/themes/vocabulary.css`, `src/app/globals.css`, `src/app/layout.tsx`

**Interfaces:**
- Consumes: `TopNavShell` (Task 7), `vocabulary.css` (Task 8).
- Produces: `TemplateId` melebar jadi tiga id; aturan `data-surface="terangkat"`.

- [ ] **Step 1: Daftarkan template — test harus MERAH**

Tambahkan entri ketiga di `TEMPLATES`:

```ts
  {
    id: "ruang-rapat",
    labelKey: "template.ruangRapat.label",
    descKey: "template.ruangRapat.desc",
    shell: "topnav",
    density: "lega",
    surface: "terangkat",
  },
```

- [ ] **Step 2: Jalankan test integritas, pastikan GAGAL**

Run: `npx vitest run src/config/__tests__/template-css.test.ts`
Expected: FAIL — `ENOENT … themes/ruang-rapat.css`.

- [ ] **Step 3: Tulis paletnya**

`src/app/themes/ruang-rapat.css`:

```css
/*
 * Template "Ruang Rapat" — untuk yang ditampilkan ke ruangan.
 *
 * Proyektor memucatkan warna dan MERATAKAN kedalaman, jadi dua hal dibalik:
 * radius & skala naik, dan kedalaman dikembalikan lewat elevasi lembut
 * (`--lift`) — satu-satunya template yang memakai surface `terangkat`, dan di
 * sinilah itu punya alasan.
 *
 * Indigonya BUKAN titik aksen melainkan bidang padat di belakang navigasi
 * (token `--sidebar`, dipakai TopNav). Tanpa gradien.
 */
[data-template="ruang-rapat"] {
  --background: oklch(0.968 0.006 268);
  --foreground: oklch(0.21 0.03 268);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.21 0.03 268);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.21 0.03 268);
  --primary: oklch(0.36 0.14 268);
  --primary-foreground: oklch(0.99 0.002 268);
  --secondary: oklch(0.935 0.01 268);
  --secondary-foreground: oklch(0.21 0.03 268);
  --muted: oklch(0.935 0.01 268);
  --muted-foreground: oklch(0.53 0.024 268);
  --accent: oklch(0.92 0.016 268);
  --accent-foreground: oklch(0.21 0.03 268);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.915 0.008 268);
  --input: oklch(0.915 0.008 268);
  --ring: oklch(0.36 0.14 268);
  --chart-1: oklch(0.36 0.14 268);
  --chart-2: oklch(0.61 0.105 215);
  --chart-3: oklch(0.5 0.12 292);
  --chart-4: oklch(0.7 0.09 195);
  --chart-5: oklch(0.44 0.105 250);
  --radius: 0.75rem;
  --sidebar: oklch(0.36 0.14 268);
  --sidebar-foreground: oklch(0.99 0.002 268);
  --sidebar-primary: oklch(0.99 0.002 268);
  --sidebar-primary-foreground: oklch(0.36 0.14 268);
  --sidebar-accent: oklch(0.42 0.135 268);
  --sidebar-accent-foreground: oklch(0.99 0.002 268);
  --sidebar-border: oklch(0.44 0.13 268);
  --sidebar-ring: oklch(0.75 0.09 268);
  --font-app: var(--font-archivo);
  --label-col: 190px;
  --lift: 0 1px 2px oklch(0.21 0.03 268 / 6%), 0 8px 22px -10px oklch(0.21 0.03 268 / 28%);
}

[data-template="ruang-rapat"].dark {
  --background: oklch(0.172 0.016 275);
  --foreground: oklch(0.93 0.008 275);
  --card: oklch(0.235 0.022 275);
  --card-foreground: oklch(0.93 0.008 275);
  --popover: oklch(0.235 0.022 275);
  --popover-foreground: oklch(0.93 0.008 275);
  --primary: oklch(0.665 0.145 275);
  --primary-foreground: oklch(0.172 0.016 275);
  --secondary: oklch(0.285 0.024 275);
  --secondary-foreground: oklch(0.93 0.008 275);
  --muted: oklch(0.285 0.024 275);
  --muted-foreground: oklch(0.68 0.026 275);
  --accent: oklch(0.305 0.028 275);
  --accent-foreground: oklch(0.93 0.008 275);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.315 0.02 275);
  --input: oklch(0.345 0.022 275);
  --ring: oklch(0.665 0.145 275);
  --chart-1: oklch(0.665 0.145 275);
  --chart-2: oklch(0.735 0.105 215);
  --chart-3: oklch(0.62 0.13 292);
  --chart-4: oklch(0.78 0.085 195);
  --chart-5: oklch(0.57 0.1 250);
  --sidebar: oklch(0.3 0.115 273);
  --sidebar-foreground: oklch(0.96 0.006 275);
  --sidebar-primary: oklch(0.96 0.006 275);
  --sidebar-primary-foreground: oklch(0.3 0.115 273);
  --sidebar-accent: oklch(0.36 0.115 273);
  --sidebar-accent-foreground: oklch(0.96 0.006 275);
  --sidebar-border: oklch(0.38 0.11 273);
  --sidebar-ring: oklch(0.7 0.1 275);
  /* Bayangan di atas dasar gelap harus jauh lebih pekat agar terbaca. */
  --lift: 0 1px 2px oklch(0 0 0 / 40%), 0 10px 24px -12px oklch(0 0 0 / 70%);
}
```

- [ ] **Step 4: Tambahkan aturan permukaan di `vocabulary.css`**

Sisipkan di akhir berkas:

```css
/* ── Permukaan ───────────────────────────────────────────────────────── */

/*
 * `terangkat`: kartu kehilangan garisnya dan mendapat elevasi. Dipakai
 * template yang tampilannya diproyeksikan — proyektor meratakan kedalaman,
 * jadi elevasi yang mengembalikan hierarki.
 */
[data-surface="terangkat"] :where([data-slot="card"]) {
  border-color: transparent;
  box-shadow: var(--lift);
}

[data-surface="terangkat"] :where([data-slot="card-footer"]) {
  background: transparent;
}
```

- [ ] **Step 5: Impor + muat huruf Archivo**

`globals.css`, sisipkan **sebelum** baris `@import "./themes/vocabulary.css";`:

```css
@import "./themes/ruang-rapat.css";
```

`src/app/layout.tsx`:

```ts
import { Archivo, Geist, Geist_Mono, Public_Sans } from "next/font/google";
```

```ts
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  preload: false,
});
```

dan sisipkan `${archivo.variable}` ke `className` di `<html>`:

```tsx
className={`${geistSans.variable} ${geistMono.variable} ${publicSans.variable} ${archivo.variable} h-full antialiased`}
```

- [ ] **Step 6: Jalankan test, pastikan LULUS**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: lulus semua.

- [ ] **Step 7: Verifikasi visual**

Run: `npm run dev`, lalu di konsol:

```js
document.cookie = "adminly_template=ruang-rapat; path=/; max-age=31536000; samesite=lax"; location.reload();
```

Expected di `/dashboard`: navigasi horizontal di atas bidang indigo, **tidak ada sidebar**, kartu tanpa garis dengan bayangan lembut, huruf Archivo, radius lebih besar. Klik terang/gelap — bayangan menguat, bidang nav jadi indigo lebih dalam.

Buka `/items` — tabel dan tombol tetap berfungsi di shell ini.

Kembalikan ke `adminly`.

- [ ] **Step 8: Commit**

```bash
git add src/app/themes/ruang-rapat.css src/app/themes/vocabulary.css src/config/templates.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat(templates): template Ruang Rapat + kosakata permukaan"
```

---

## Task 10: Pemilih template di header + i18n

**Files:**
- Create: `src/components/layout/template-switcher.tsx`
- Modify: `src/locales/en.ts`, `src/locales/id.ts`, `src/components/layout/site-header.tsx`, `src/components/layout/top-nav.tsx`

**Interfaces:**
- Consumes: `useTemplate` (Task 4), `TEMPLATES` (Task 1), `resolveLabel` dari `@/locales`.
- Produces: `<TemplateSwitcher />`; kunci kamus `t.template.*` yang dipakai Task 11.

`ModeToggle` **tetap ada** — switcher ini dipasang di sampingnya, bukan menggantikannya.

- [ ] **Step 1: Tambah kunci kamus di `en.ts`**

`src/locales/en.ts` adalah sumber tipe. Sisipkan setelah baris `localeSwitcher: { label: "Language" },`:

```ts
  template: {
    label: "Template",
    tab: "Appearance",
    cardTitle: "Template",
    cardDesc: "Pick how Adminly looks. Your choice is saved on this device.",
    adminly: {
      label: "Adminly",
      desc: "Neutral, medium density. The default.",
    },
    kertasKerja: {
      label: "Kertas Kerja",
      desc: "Long forms, labels aligned in a left column, roomy click targets.",
    },
    ruangRapat: {
      label: "Ruang Rapat",
      desc: "Top navigation, large figures, for screens people read together.",
    },
  },
```

- [ ] **Step 2: Tambah terjemahan di `id.ts`**

Bentuknya wajib sama persis (tipe `Dictionary` diturunkan dari `en.ts`). Sisipkan setelah baris `localeSwitcher: { label: "Bahasa" },`:

```ts
  template: {
    label: "Template",
    tab: "Tampilan",
    cardTitle: "Template",
    cardDesc: "Pilih tampilan Adminly. Pilihanmu tersimpan di perangkat ini.",
    adminly: {
      label: "Adminly",
      desc: "Netral, kepadatan sedang. Bawaan.",
    },
    kertasKerja: {
      label: "Kertas Kerja",
      desc: "Form panjang, label sejajar di kolom kiri, target klik lega.",
    },
    ruangRapat: {
      label: "Ruang Rapat",
      desc: "Navigasi atas, angka besar, untuk layar yang dilihat bersama.",
    },
  },
```

- [ ] **Step 3: Buat `template-switcher.tsx`**

Meniru `locale-switcher.tsx` supaya konsisten dengan pemilih lain di header.

```tsx
"use client";

import { Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/providers/i18n-provider";
import { useTemplate } from "@/components/providers/template-provider";
import { TEMPLATES, type TemplateId } from "@/config/templates";
import { resolveLabel } from "@/locales";

/** Pemilih template ringkas di header. Terang/gelap tetap milik ModeToggle. */
export function TemplateSwitcher() {
  const { template, setTemplate } = useTemplate();
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
        aria-label={t.template.label}
      >
        <Palette className="size-[1.2rem]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.template.label}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={template}
          onValueChange={(value) => setTemplate(value as TemplateId)}
        >
          {TEMPLATES.map((tpl) => (
            <DropdownMenuRadioItem key={tpl.id} value={tpl.id}>
              {resolveLabel(t, tpl.labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Pasang di kedua shell**

`src/components/layout/site-header.tsx` — tambah impor dan sisipkan sebelum `<ModeToggle />`:

```tsx
import { TemplateSwitcher } from "@/components/layout/template-switcher";
```

```tsx
        <RoleSwitcher />
        <TemplateSwitcher />
        <ModeToggle />
```

`src/components/layout/top-nav.tsx` — sama, sisipkan sebelum `<ModeToggle />`.

- [ ] **Step 5: Verifikasi**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: lulus. Kalau `tsc` mengeluh soal bentuk `id.ts` tidak cocok, kunci di kedua kamus belum identik.

Run: `npm run dev`, buka `/dashboard`, klik ikon palet di header, pilih **Kertas Kerja**.
Expected: warna berganti seketika (sebelum halaman selesai refresh), lalu halaman tetap di shell sidebar. Pilih **Ruang Rapat** → sidebar berganti jadi navigasi atas. Muat ulang → pilihan bertahan.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/template-switcher.tsx src/locales/en.ts src/locales/id.ts src/components/layout/site-header.tsx src/components/layout/top-nav.tsx
git commit -m "feat(templates): pemilih template di header + kamus t.template"
```

---

## Task 11: Tab Tampilan di Settings

**Files:**
- Create: `src/components/settings/template-picker.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `useTemplate` (Task 4), `TEMPLATES` (Task 1), kamus `t.template.*` (Task 10).
- Produces: tidak ada — ini daun.

Kartu memuat miniatur asli yang dibungkus atribut template, sehingga tokennya berlaku ke subtree itu saja dan pratinjaunya tak pernah bisa basi terhadap templatenya. Kartu menampilkan template dalam **mode yang sedang aktif** — memaksa `.dark` ke dalam subtree saat halaman sedang terang butuh duplikasi selektor yang tidak sepadan hasilnya.

- [ ] **Step 1: Buat `template-picker.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import { useTemplate } from "@/components/providers/template-provider";
import { TEMPLATES } from "@/config/templates";
import { resolveLabel } from "@/locales";
import { cn } from "@/lib/utils";

/**
 * Kartu pilihan template. Tiap kartu memuat MINIATUR ASLI — bukan tangkapan
 * layar — yang dibungkus atribut template sendiri, jadi pratinjaunya tak
 * pernah bisa basi terhadap templatenya.
 *
 * Miniatur memakai token via `bg-sidebar`, `bg-card`, dst. dan mewarisi mode
 * terang/gelap halaman; ia sengaja TIDAK mencoba menampilkan kedua mode
 * sekaligus.
 */
export function TemplatePicker() {
  const { template, setTemplate } = useTemplate();
  const { t } = useI18n();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TEMPLATES.map((tpl) => {
        const selected = tpl.id === template;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setTemplate(tpl.id)}
            aria-pressed={selected}
            className={cn(
              "group rounded-lg border p-1 text-left transition-shadow",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              selected ? "border-primary ring-primary ring-1" : "hover:border-foreground/25",
            )}
          >
            <div
              data-template={tpl.id}
              data-density={tpl.density}
              data-surface={tpl.surface}
              className="bg-background overflow-hidden rounded-md"
            >
              {tpl.shell === "topnav" ? (
                <div className="bg-sidebar flex h-7 items-center gap-2 px-2">
                  <span className="bg-sidebar-foreground/85 size-2.5 rounded-sm" />
                  <span className="bg-sidebar-foreground/45 h-1.5 w-8 rounded-full" />
                  <span className="bg-sidebar-foreground/45 h-1.5 w-8 rounded-full" />
                </div>
              ) : null}
              <div className="flex h-24">
                {tpl.shell === "sidebar" ? (
                  <div className="bg-sidebar border-border w-12 shrink-0 space-y-1.5 border-r p-2">
                    <span className="bg-sidebar-primary block size-3 rounded-sm" />
                    <span className="bg-sidebar-foreground/25 block h-1.5 w-full rounded-full" />
                    <span className="bg-sidebar-foreground/25 block h-1.5 w-3/4 rounded-full" />
                  </div>
                ) : null}
                <div className="flex-1 space-y-2 p-2">
                  <div className="bg-card border-border rounded-md border p-2 shadow-(--lift)">
                    <span className="bg-foreground/70 block h-1.5 w-1/2 rounded-full" />
                    <span className="bg-muted-foreground/40 mt-1.5 block h-1.5 w-full rounded-full" />
                    <span className="bg-muted-foreground/40 mt-1 block h-1.5 w-4/5 rounded-full" />
                  </div>
                  <span className="bg-primary block h-4 w-14 rounded-md" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 px-2 py-2">
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                  selected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40",
                )}
              >
                {selected ? <Check className="size-3" /> : null}
              </span>
              <span>
                <span className="block text-sm font-medium">
                  {resolveLabel(t, tpl.labelKey)}
                </span>
                <span className="text-muted-foreground block text-sm">
                  {resolveLabel(t, tpl.descKey)}
                </span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Tambah tab di halaman Settings**

`src/app/(app)/settings/page.tsx` — tambah impor:

```tsx
import { TemplatePicker } from "@/components/settings/template-picker";
```

Tambah trigger tab ketiga:

```tsx
        <TabsList>
          <TabsTrigger value="general">{t.settings.tabGeneral}</TabsTrigger>
          <TabsTrigger value="account">{t.settings.tabAccount}</TabsTrigger>
          <TabsTrigger value="appearance">{t.template.tab}</TabsTrigger>
        </TabsList>
```

Dan tambah isinya setelah `<TabsContent value="account">…</TabsContent>`:

```tsx
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{t.template.cardTitle}</CardTitle>
              <CardDescription>{t.template.cardDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <TemplatePicker />
            </CardContent>
          </Card>
        </TabsContent>
```

- [ ] **Step 3: Verifikasi**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: lulus.

Run: `npm run dev`, buka `/settings`, klik tab **Tampilan**.
Expected: tiga kartu. Kartu Adminly dan Kertas Kerja menampilkan miniatur sidebar; kartu Ruang Rapat menampilkan bilah navigasi atas berwarna indigo dan kartunya berbayang. Masing-masing memakai warnanya sendiri, bukan warna halaman. Klik satu kartu → seluruh halaman berganti, kartu terpilih bertanda centang. Ganti terang/gelap → miniatur ikut.

Navigasi keyboard: Tab sampai kartu, tekan Enter/Spasi → template berganti; cincin fokus terlihat.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/template-picker.tsx "src/app/(app)/settings/page.tsx"
git commit -m "feat(templates): tab Tampilan di Settings dengan kartu pratinjau"
```

---

## Task 12: E2E + dokumentasi

**Files:**
- Create: `e2e/template.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: seluruh task sebelumnya.
- Produces: tidak ada.

- [ ] **Step 1: Tulis e2e**

`e2e/template.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

// Template diuji dengan menyetel cookie `adminly_template` langsung — persis
// yang ditulis TemplateProvider — lalu memverifikasi dua hal yang tak bisa
// dipalsukan dari client: atribut di <html> yang dirender server, dan shell
// mana yang benar-benar terpasang. Tidak memutasi store, aman paralel.
async function setTemplate(page: Page, id: string) {
  await page.context().addCookies([
    { name: "adminly_template", value: id, url: "http://localhost:3000" },
  ]);
}

test.describe("Template — persistensi", () => {
  test("tanpa cookie memakai template default", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-template", "adminly");
    await expect(page.locator("html")).toHaveAttribute("data-density", "normal");
    await expect(page.locator("html")).toHaveAttribute("data-surface", "bergaris");
  });

  test("cookie asing jatuh ke default, bukan halaman rusak", async ({ page }) => {
    await setTemplate(page, "template-yang-tidak-ada");
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-template", "adminly");
  });

  test("pilihan di Settings bertahan setelah reload", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("tab", { name: /appearance|tampilan/i }).click();
    await page.getByRole("button", { name: /kertas kerja/i }).click();

    await expect(page.locator("html")).toHaveAttribute("data-template", "kertas-kerja");
    await expect(page.locator("html")).toHaveAttribute("data-density", "lega");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-template", "kertas-kerja");
  });
});

test.describe("Template — pergantian shell", () => {
  test("template sidebar merender sidebar", async ({ page }) => {
    await setTemplate(page, "adminly");
    await page.goto("/dashboard");
    // `sidebar.tsx` memasang data-slot="sidebar" di beberapa cabang (laci
    // mobile, non-collapsible, desktop) — pakai .first() supaya tidak kena
    // strict mode Playwright.
    await expect(page.locator('[data-slot="sidebar"]').first()).toBeVisible();
  });

  test("template topnav merender navigasi atas dan tanpa sidebar", async ({ page }) => {
    await setTemplate(page, "ruang-rapat");
    await page.goto("/dashboard");
    await expect(page.locator("html")).toHaveAttribute("data-surface", "terangkat");
    await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0);
    // Menu tetap terisi dari registry nav yang sama.
    await expect(page.getByRole("link", { name: /analytics/i }).first()).toBeVisible();
  });
});

test.describe("Template — sumbu terang/gelap tetap berdiri sendiri", () => {
  test("ganti mode tidak mengubah template aktif", async ({ page }) => {
    await setTemplate(page, "kertas-kerja");
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /toggle theme|ganti tema/i }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).toHaveAttribute("data-template", "kertas-kerja");
  });
});
```

- [ ] **Step 2: Jalankan e2e**

Run: `npm run test:e2e -- template.spec.ts`
Expected: PASS, 6 test.

- [ ] **Step 3: Buktikan test menangkap regresi nyata**

Cabut `router.refresh()` dari `setTemplate` di `src/components/providers/template-provider.tsx`, lalu jalankan lagi.
Expected: test "pilihan di Settings bertahan setelah reload" tetap lulus (cookie tetap ditulis), tapi jalankan juga skenario manual: pilih **Ruang Rapat** dari picker di `/settings` — shell **tidak** berganti sampai halaman dimuat ulang. Inilah yang dijaga `router.refresh()`.

Kembalikan barisnya dan jalankan ulang seluruh e2e:

Run: `npm run test:e2e`
Expected: semua spec lulus, termasuk yang lama.

- [ ] **Step 4: Perbarui README**

Di `README.md`, ganti poin 4 pada bagian "Using it for a new project":

```markdown
4. **Branding/colors**: pick a built-in template in **Settings → Appearance**, or
   set `DEFAULT_TEMPLATE` in `src/config/templates.ts` to choose the default for
   your fork. To restyle a template, edit its CSS variables in
   `src/app/themes/<id>.css`. `src/app/themes/base.css` holds the fallback
   tokens used when no template attribute is present (Storybook, unit tests).
```

Dan tambahkan bagian baru setelah "Generic CRUD resources + scaffold generator":

```markdown
## Design templates

A **template** bundles three things: colour and type tokens, the navigation
shell, and component density/surface. Three ship with Adminly:

| Template | For | Shell |
|---|---|---|
| Adminly | neutral default | sidebar |
| Kertas Kerja | long forms, master data | sidebar |
| Ruang Rapat | dashboards read together on a screen | top navigation |

Users pick one in **Settings → Appearance**; the choice is stored in the
`adminly_template` cookie. Light/dark stays a separate axis — every template
works in both.

**Adding a template:** add an entry to `TEMPLATES` in `src/config/templates.ts`,
create `src/app/themes/<id>.css` with a light block and a `.dark` block, and
import it in `globals.css` **before** `vocabulary.css`. The import order is part
of the contract — theme files must come after `base.css`, or they stop
overriding it. `src/config/__tests__/template-css.test.ts` fails if a registered
template is missing tokens.

Component styling lives only in `src/app/themes/vocabulary.css`, keyed off the
`data-slot` markers shadcn components already carry — nothing in
`src/components/ui/` is modified, so `npx shadcn@latest add` stays safe.
```

- [ ] **Step 5: Verifikasi penuh**

Run: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build && npm run test:e2e`
Expected: semuanya lulus.

- [ ] **Step 6: Commit**

```bash
git add e2e/template.spec.ts README.md
git commit -m "test(templates): e2e persistensi & pergantian shell + dokumentasi"
```

---

## Verifikasi akhir

Sebelum menyatakan selesai, jalankan seluruh rangkaian dan **tempelkan keluarannya**:

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
npm run test:e2e
```

Lalu periksa dengan mata, karena test tidak bisa menilai ini — untuk **masing-masing dari enam kombinasi** (3 template × terang/gelap):

1. `/dashboard` — kartu, grafik, dan angka terbaca; tidak ada teks yang menyatu dengan latarnya.
2. `/items` — tabel terbaca, baris terpilih dan baris ter-hover masih terbedakan.
3. `/items/itm-1/edit` — form terbaca; pada Kertas Kerja dan Ruang Rapat label berada di kolom kiri di layar lebar dan kembali ke atas field di bawah 768px.
4. `/settings` → tab Tampilan — ketiga miniatur memakai warnanya sendiri.
5. Cincin fokus keyboard terlihat di semua template, termasuk di atas bidang indigo Ruang Rapat.

Kontras teks utama terhadap latarnya wajib memenuhi WCAG AA (4.5:1) di keenam kombinasi. Kalau ada yang meleset, sesuaikan nilai `--foreground` atau `--muted-foreground` template itu — jangan menambal dengan utility di komponen.
