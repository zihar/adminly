# Desain: opsi template design di Adminly

- **Tanggal:** 2026-09-04
- **Status:** Draft — menunggu review user sebelum lanjut ke plan implementasi
- **Fondasi:** token warna sudah berupa CSS variable di `src/app/globals.css` (`:root` + `.dark`); `next-themes` sudah terpasang; pola "preferensi user → cookie → dibaca layout server → provider client tulis cookie + `router.refresh()`" sudah mapan di locale (`i18n-provider.tsx`), role (`rbac-provider.tsx`), dan scope (`scope-provider.tsx`).
- **Konteks pemicu:** Adminly dipakai sebagai starter yang di-fork tiap project baru. Sampai sekarang setiap fork mewarisi satu tampilan; branding dilakukan dengan menyunting `globals.css` langsung (README §"Using it for a new project" poin 4). Tujuan spec ini: menyediakan beberapa template siap pakai yang bisa dipilih, tanpa menghapus tampilan yang sekarang.
- **Repo kerja:** `adminly` (upstream), branch `feat/design-templates`. Fork `edelweiss-web` tidak disentuh.

## Keputusan yang dikonfirmasi (dialog brainstorming 2026-09-04)

1. ✅ **Cakupan template = skin + shell + gaya komponen.** Bukan sekadar paket warna: template juga menentukan kerangka navigasi dan bentuk/kepadatan komponen.
2. ✅ **Developer menetapkan default, user boleh menimpanya.** Default di `DEFAULT_TEMPLATE`; user mengganti lewat picker di Settings, tersimpan per-perangkat lewat cookie.
3. ✅ **Dua sumbu: template × terang/gelap.** Sempat diputuskan satu sumbu (template menentukan terang/gelapnya, tombol mode dihapus), lalu **dibalik** setelah ongkosnya dihitung ulang — lihat D3 di bawah. Tombol terang/gelap yang sekarang tetap ada dan tidak diubah.
4. ✅ **Tiga template dibangun sekarang:** Adminly (yang sekarang, dipertahankan utuh), Kertas Kerja, Ruang Rapat. Dispatch dan Tahun Ajaran dirancang di dialog tapi **ditunda** — bukan dibatalkan.
5. ✅ **Gaya komponen ditulis lewat kosakata terkunci**, bukan CSS bebas per template: `data-density` dan `data-surface`, masing-masing hanya nilai yang benar-benar dipakai.
6. ✅ **Tidak satu pun file di `src/components/ui/` disentuh.** Override memakai penanda `data-slot` yang sudah dibawa tiap komponen shadcn, supaya `npx shadcn@latest add` tetap aman.

---

## 1. Tujuan & Non-Tujuan

**Tujuan:** user bisa memilih salah satu dari tiga template dari halaman Settings; pilihan bertahan antar-reload; developer yang nge-fork bisa menetapkan default lewat satu konstanta. Template mengubah warna, tipografi, radius, kepadatan, bentuk permukaan, dan kerangka navigasi — dan tampilan Adminly yang sekarang tetap tersedia sebagai salah satu pilihan dengan nilai token yang tidak berubah sedikit pun.

**Non-tujuan:**
- Template **Dispatch** dan **Tahun Ajaran** — sudah dirancang (palet, huruf, kepadatan, dan untuk Tahun Ajaran sebuah pita konteks di bawah header), tapi tidak dibangun di spec ini. Menambahkannya nanti = menambah satu entri registry + satu file CSS + nilai kosakata yang kurang; arsitekturnya tidak berubah.
- **Nilai kosakata yang belum ada pemakainya**: `density: "rapat"` dan `surface: "rata"` menyusul bersama Dispatch. Pita konteks menyusul bersama Tahun Ajaran.
- **Mengunci daftar template** (fork melarang template tertentu, atau mematikan picker) — tidak diminta, tidak dibangun.
- **Versi gelap Dispatch/Tahun Ajaran**, editor tema di UI, tema kustom per-user, sinkronisasi pilihan lintas perangkat.

**Kriteria sukses:**
1. Memilih Kertas Kerja di Settings mengubah warna seketika; setelah reload masih terpasang.
2. Memilih Ruang Rapat merender navigasi atas dan **tidak** merender sidebar.
3. Tombol terang/gelap tetap bekerja untuk ketiga template, dan kombinasi apa pun dari 3 template × 2 mode menghasilkan halaman yang terbaca.
4. Menghapus cookie mengembalikan tampilan ke `DEFAULT_TEMPLATE`.
5. Seluruh test dan cerita Storybook yang ada sekarang tetap hijau tanpa disunting untuk mengakomodasi template.
6. Mutasi terbukti merah: mencabut `router.refresh()` dari `setTemplate` membuat test shell gagal.

## 2. Keputusan Desain (ringkas)

| # | Keputusan | Alasan |
|---|---|---|
| D1 | Registry sebagai modul pure `src/config/templates.ts` | Mengikuti `rbac.ts` / `scope.ts`; aman diimpor dari server, client, maupun `proxy.ts` tanpa menarik React/`lucide-react` |
| D2 | Template disimpan di **cookie**, bukan localStorage | Shell berbeda = markup berbeda, jadi server wajib tahu template aktif sebelum render. localStorage bikin kerangka halaman berkedip tiap load |
| D3 | **Dua sumbu** (template × mode), bukan satu | Selisih sesungguhnya cuma 2 palet (6 vs 8 saat itu), sementara satu sumbu menuntut mencopot `next-themes` lalu memasang ulang kelas `.dark` sendiri demi 22 utility `dark:` di `src/components/ui/` — membangun ulang yang sudah ada demi menghapus sebuah tombol. Dua sumbu juga mempertahankan pengikutan otomatis ke setelan sistem |
| D4 | `:root` dan `.dark` yang sekarang **dipertahankan sebagai lantai dasar** | Komponen yang dirender tanpa `data-template` (Storybook, vitest, komponen terisolasi) tetap punya token lengkap dan tampil persis seperti sekarang |
| D5 | Gaya komponen lewat `data-slot` + `:where()`, bukan fork komponen | Spesifisitas nol → utility Tailwind di `className` selalu menang, tak ada perang `!important`; dan `src/components/ui/` tetap bisa ditimpa `npx shadcn add` |
| D6 | Kosakata terkunci (`density`, `surface`) dengan nilai terbatas | Template baru mengombinasikan yang sudah teruji, bukan menambah permukaan baru yang bisa rusak |
| D7 | Logika navigasi diangkat ke `useVisibleNav()` | Dua shell menggambar nav berbeda tapi memakai satu sumber logika; menambah item menu tetap sekali kerja |
| D8 | Atribut dipasang di `documentElement` **sebelum** `router.refresh()` | Warna berganti seketika; struktur menyusul. Tanpa ini pergantian terasa tersendat |
| D9 | Kartu pratinjau di picker menampilkan mode yang sedang aktif saja | Memaksa `.dark` ke dalam subtree saat halaman terang butuh duplikasi selektor yang tidak sepadan hasilnya |

## 3. Registry

`src/config/templates.ts` — pure, tanpa import React/ikon.

```ts
export type TemplateId = "adminly" | "kertas-kerja" | "ruang-rapat";
export type Shell      = "sidebar" | "topnav";
export type Density    = "normal" | "lega";
export type Surface    = "bergaris" | "terangkat";

export type TemplateDef = {
  id: TemplateId;
  labelKey: string;   // → t.template.<key>, mis. "template.kertasKerja"
  descKey: string;    // kalimat "untuk siapa" di kartu picker
  shell: Shell;
  density: Density;
  surface: Surface;
};

export const TEMPLATES: TemplateDef[];
export function templateById(id: TemplateId): TemplateDef;

/** Fork mengganti nilai ini untuk menetapkan tampilan bawaan project-nya. */
export const DEFAULT_TEMPLATE: TemplateId = "adminly";

export const TEMPLATE_COOKIE = "adminly_template";

/** Validasi cookie → TemplateId aman (fallback ke DEFAULT_TEMPLATE). */
export function parseTemplate(value: string | undefined | null): TemplateId;
```

Isi registry:

| id | shell | density | surface | huruf (lewat CSS) |
|---|---|---|---|---|
| `adminly` | sidebar | normal | bergaris | Geist |
| `kertas-kerja` | sidebar | lega | bergaris | Public Sans |
| `ruang-rapat` | topnav | lega | terangkat | Archivo |

Kolom huruf **tidak** disimpan di registry: ia ditentukan oleh token `--font-app` di blok CSS template masing-masing (§4.1). Registry hanya memuat hal yang dibaca TypeScript — shell dipakai `(app)/layout.tsx`, density dan surface dipasang sebagai atribut. Menaruh nama huruf di registry berarti satu nilai yang sama hidup di dua tempat.

`parseTemplate` memakai pola yang sama persis dengan `parseLocale`/`parseRole`: nilai tak dikenal jatuh ke `DEFAULT_TEMPLATE`, sehingga cookie karangan tidak bisa membuat aplikasi merender entah apa.

## 4. Susunan CSS

```
src/app/globals.css          ← @theme inline, :root, .dark, @layer base (lantai dasar)
  @import "./themes/adminly.css";
  @import "./themes/kertas-kerja.css";
  @import "./themes/ruang-rapat.css";
  @import "./themes/vocabulary.css";
```

Bentuk tiap file tema:

```css
[data-template="kertas-kerja"]      { /* token terang */ }
[data-template="kertas-kerja"].dark { /* token gelap  */ }
```

**Urutan impor adalah bagian dari kontrak.** `[data-template="x"]` dan `:root` sama beratnya (0,1,0), jadi yang menang adalah urutan sumber — impor tema wajib **setelah** blok dasar. Untuk mode gelap, `[data-template="x"].dark` (0,2,0) menang telak atas `.dark` (0,1,0). Ini ditulis sebagai komentar di `globals.css` supaya tidak ada yang menggeser impornya tanpa sadar.

`adminly.css` berisi **salinan verbatim** nilai `:root` dan `.dark` yang sekarang, dibungkus selektor `[data-template="adminly"]`. Tidak ada satu nilai pun yang diubah. Duplikasi ini disengaja: lantai dasar melayani render tanpa atribut, blok template melayani render dengan atribut, dan keduanya harus bisa bergerak sendiri kalau nanti fork mengganti warna brand di `:root`.

### 4.1 Token yang wajib ada di tiap template

Setiap blok template wajib mendefinisikan **himpunan nama custom property yang sama persis** dengan `:root`. Ini diuji otomatis (§8) — template yang lupa satu token akan tampil sebagai halaman dengan warna bolong, dan itu jenis kerusakan yang mudah lolos dari mata.

Selain token yang sudah ada, spec ini menambah tiga token baru ke `:root` dan ke setiap blok template:

| Token | Untuk | Nilai di `:root` |
|---|---|---|
| `--font-app` | keluarga huruf template; `@theme inline` memetakan `--font-sans` ke sini | `var(--font-geist)` |
| `--label-col` | lebar kolom label pada form baris-label-kiri | `0` (tidak dipakai saat density `normal`) |
| `--lift` | bayangan permukaan `terangkat` | `none` |

`--font-app` menuntut satu perubahan kecil di `src/app/layout.tsx`: `next/font` Geist sekarang mengisi `--font-sans` **langsung** (`Geist({ variable: "--font-sans" })`), dan `@theme inline` memetakan `--font-sans` ke dirinya sendiri. Variabel Geist diganti jadi `--font-geist`, lalu `@theme inline` diarahkan ke `--font-sans: var(--font-app)`. Tanpa pemisahan ini keduanya bertabrakan di nama yang sama dan huruf template tidak akan pernah kena.

### 4.2 Palet — Kertas Kerja

Kertas putih kebiruan yang dingin, bukan krem; kartu putih murni supaya terangkat tanpa bayangan. Satu aksen: biru tinta, warna pena yang mengoreksi formulir, dipakai hanya untuk fokus dan aksi utama.

| Peran | Terang | Gelap |
|---|---|---|
| `--background` | `oklch(0.982 0.004 245)` | `oklch(0.175 0.010 265)` |
| `--card`, `--popover` | `oklch(1 0 0)` | `oklch(0.225 0.012 265)` |
| `--sidebar` | `oklch(0.958 0.005 245)` | `oklch(0.155 0.010 265)` |
| `--foreground` | `oklch(0.24 0.016 255)` | `oklch(0.925 0.008 265)` |
| `--muted-foreground` | `oklch(0.53 0.013 255)` | `oklch(0.665 0.018 265)` |
| `--border`, `--input` | `oklch(0.905 0.006 255)` | `oklch(0.30 0.014 265)` |
| `--primary` | `oklch(0.47 0.145 258)` | `oklch(0.735 0.105 268)` |
| `--primary-foreground` | `oklch(0.99 0.002 258)` | `oklch(0.175 0.010 265)` |
| `--radius` | `0.375rem` | sama |
| `--label-col` | `190px` | sama |
| `--font-app` | `var(--font-public-sans)` | sama |

### 4.3 Palet — Ruang Rapat

Dirancang untuk dibaca dari jauh dan lewat proyektor: skala huruf naik, dan kedalaman yang diratakan proyektor dikembalikan lewat elevasi lembut. Indigonya bukan titik aksen melainkan bidang padat di belakang navigasi. Tanpa gradien.

| Peran | Terang | Gelap |
|---|---|---|
| `--background` | `oklch(0.968 0.006 268)` | `oklch(0.172 0.016 275)` |
| `--card`, `--popover` | `oklch(1 0 0)` | `oklch(0.235 0.022 275)` |
| `--sidebar` (bidang nav) | `oklch(0.36 0.140 268)` | `oklch(0.30 0.115 273)` |
| `--sidebar-foreground` | `oklch(0.99 0.002 268)` | `oklch(0.96 0.006 275)` |
| `--foreground` | `oklch(0.21 0.030 268)` | `oklch(0.930 0.008 275)` |
| `--muted-foreground` | `oklch(0.53 0.024 268)` | `oklch(0.680 0.026 275)` |
| `--border`, `--input` | `oklch(0.915 0.008 268)` | `oklch(0.315 0.020 275)` |
| `--primary` | `oklch(0.36 0.140 268)` | `oklch(0.665 0.145 275)` |
| `--chart-2` (pendukung) | `oklch(0.61 0.105 215)` | `oklch(0.735 0.105 215)` |
| `--radius` | `0.75rem` | sama |
| `--lift` | `0 1px 2px oklch(0.21 0.03 268 / 6%), 0 8px 22px -10px oklch(0.21 0.03 268 / 28%)` | `0 1px 2px oklch(0 0 0 / 40%), 0 10px 24px -12px oklch(0 0 0 / 70%)` |
| `--font-app` | `var(--font-archivo)` | sama |

Token `--chart-1..5` untuk kedua template baru diturunkan dari `--primary` dan `--chart-2`-nya masing-masing, menggantikan tangga abu-abu bawaan.

### 4.4 Kosakata — `vocabulary.css`

Satu-satunya tempat gaya komponen boleh ditulis.

```css
/* Permukaan */
[data-surface="terangkat"] :where([data-slot="card"]) {
  border-color: transparent;
  box-shadow: var(--lift);
}
[data-surface="terangkat"] :where([data-slot="card-footer"]) {
  background: transparent;
}

/* Kepadatan */
[data-density="lega"] :where([data-slot="form-row"]) {
  display: grid;
  grid-template-columns: var(--label-col) 1fr;
  align-items: center;
  gap: 0 1.25rem;
  border-bottom: 1px solid var(--border);
  padding-block: 0.5rem;
}
[data-density="lega"] :where([data-slot="form-row"]:last-child) { border-bottom: 0; }
[data-density="lega"] [data-slot="form-row"] :where(input, textarea, [data-slot="button"]) {
  min-height: 2.625rem;
}
```

Aturan tinggi kontrol sengaja dilingkupi ke dalam `[data-slot="form-row"]`. Kalau dipasang global, tombol ikon di header dan trigger sidebar ikut membesar — bukan yang dimaksud. `SelectField` sudah berupa Popover + Button, jadi trigger-nya ikut terkena lewat `[data-slot="button"]` tanpa perlu penanda tambahan.

`:where()` menjaga spesifisitas tetap nol — tapi itu cuma menyelesaikan
perebutan **di dalam** `vocabulary.css` sendiri (aturan di sini tak saling
berebut satu sama lain). Yang menentukan menang-lawan-utility-Tailwind adalah
hal lain: seluruh berkas ini hidup di layer `adminly-vocabulary`, dideklarasikan
di `globals.css` SETELAH layer `utilities` bawaan Tailwind
(`@layer theme, base, components, utilities, adminly-vocabulary;`). Urutan
layer diputuskan sebelum spesifisitas dipertimbangkan sama sekali, jadi aturan
di sini MENIMPA utility yang di-hardcode shadcn ke `className` komponennya
sendiri (mis. `ring-1` di `card.tsx`) — itulah mekanisme yang membuat template
bisa mengubah bentuk komponen tanpa menyentuh `src/components/ui/`.
Konsekuensinya: utility Tailwind di `className` konsumen TIDAK lagi otomatis
menang atas aturan kosakata; menimpanya secara lokal perlu modifier penting
Tailwind (mis. `shadow-none!`).

> **Catatan implementasi (menggantikan D5 & paragraf di atas):** rancangan
> awal berasumsi spesifisitas nol dari `:where()` sudah cukup membuat "utility
> Tailwind di `className` selalu menang". Itu ternyata mustahil: shadcn
> menulis gaya komponennya SEBAGAI utility class di `className`, bukan sebagai
> CSS custom bikinan sendiri — jadi "utility selalu menang" dan "template bisa
> merestyle komponen tanpa menyentuh `src/components/ui/`" memperebutkan slot
> cascade yang sama, dan tidak bisa dua-duanya benar sekaligus. Mekanisme layer
> di atas dipilih selama implementasi sebagai gantinya.

Aturan `form-row` di atas dibungkus `@media (min-width: 48rem)` — di layar sempit label kembali ke atas field, karena kolom label 190px memakan lebar yang tidak ada.

## 5. Alur cookie & provider

```
src/app/layout.tsx (Server Component)
  ├ const id  = parseTemplate(cookieStore.get(TEMPLATE_COOKIE)?.value)
  ├ const def = templateById(id)
  ├ <html data-template={id} data-density={def.density} data-surface={def.surface}>
  └ <ThemeProvider> → <TemplateProvider initialTemplate={id}> → …
```

`TemplateProvider` (client) meniru `I18nProvider`:

```ts
setTemplate(next) {
  const def = templateById(next);
  const el = document.documentElement;              // 1. warna berganti seketika
  el.dataset.template = next;
  el.dataset.density  = def.density;
  el.dataset.surface  = def.surface;
  setState(next);
  document.cookie = `${TEMPLATE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  router.refresh();                                  // 2. shell server ikut berganti
}
```

Langkah 1 ada karena shell dirender di server: tanpa itu, warna baru menunggu `router.refresh()` selesai dan pergantian terasa tersendat.

**`next-themes` tidak disentuh sama sekali.** Ia tetap memasang kelas `.dark`, tetap menyuntik skrip anti-flash, dan `mode-toggle.tsx`, `sonner.tsx`, serta `theme-provider.tsx` tidak berubah satu baris pun.

Nilai `--font-app` menunjuk ke variabel `next/font`. `src/app/layout.tsx` memuat tiga keluarga: Geist (sudah ada), Public Sans, Archivo — semuanya sebagai CSS variable di `<html>`, dengan `preload: false` untuk yang bukan default. Peramban hanya mengunduh face yang benar-benar dirender; `@font-face` yang tidak terpakai tidak ditarik, jadi yang bertambah nyata cuma beberapa kilobyte CSS.

## 6. Shell

Dua komponen di `src/components/layout/shells/`:

- **`sidebar-shell.tsx`** — isi `src/app/(app)/layout.tsx` yang sekarang (SidebarProvider + AppSidebar + SiteHeader + main + SiteFooter), dipindah hampir verbatim.
- **`topnav-shell.tsx`** — baru: navigasi horizontal di atas bidang `--sidebar`, konten selebar layar, footer sama.

`src/app/(app)/layout.tsx` menyusut jadi pemilih:

```tsx
const def   = templateById(parseTemplate(cookieStore.get(TEMPLATE_COOKIE)?.value));
const Shell = def.shell === "topnav" ? TopNavShell : SidebarShell;
```

Provider (`RbacProvider`, `ScopeProvider`) tetap di `(app)/layout.tsx`, di luar shell — supaya kedua shell tidak perlu tahu apa-apa soal itu.

`src/hooks/use-visible-nav.ts` mengangkat logika yang sekarang ada di `app-sidebar.tsx`: `ensureResourcesRegistered()`, gabung `navMain` dengan `resourceNavItems()`, saring lewat `can()`, tentukan item aktif dari `pathname`. `app-sidebar.tsx` dan `topnav-shell.tsx` memakainya; yang berbeda cuma cara menggambarnya. `site-header.tsx` juga ikut memakainya untuk breadcrumb, menghapus duplikasi pencarian item aktif yang sekarang ada di dua tempat.

## 7. Picker

**Header** — `template-switcher.tsx`, dropdown radio yang meniru `locale-switcher.tsx`, dipasang di `site-header.tsx` **di samping** `ModeToggle`, bukan menggantikannya. Shell top-nav memasang switcher yang sama di barisnya.

**Settings** — tab ketiga `Tampilan` di `src/app/(app)/settings/page.tsx`, berisi kartu pilihan. Tiap kartu memuat miniatur asli (sidebar, header, beberapa baris tabel, satu tombol) yang dibungkus:

```tsx
<div data-template={t.id} data-density={t.density} data-surface={t.surface}>
```

sehingga tokennya berlaku ke subtree itu saja. Kartu menampilkan template dalam mode yang sedang aktif (D9).

Teks kartu menyebut untuk siapa, bukan menjual rasanya:

| Template | Judul | Deskripsi |
|---|---|---|
| `adminly` | Adminly | Netral dan padat sedang. Bawaan. |
| `kertas-kerja` | Kertas Kerja | Form panjang, label sejajar di kolom kiri, target klik lega. |
| `ruang-rapat` | Ruang Rapat | Navigasi atas, angka besar, untuk layar yang dilihat bersama. |

**i18n:** kunci baru `t.template.*` di `src/locales/en.ts` (sumber tipe) dan `src/locales/id.ts` — label dan deskripsi tiap template, judul tab, plus label picker.

## 8. Pengujian

| Lapis | Yang diuji |
|---|---|
| Unit (`config/__tests__/templates.test.ts`) | `parseTemplate` jatuh ke `DEFAULT_TEMPLATE` untuk nilai asing, string kosong, `undefined`, dan `null`; `templateById` mengembalikan definisi yang benar |
| Integritas token (`config/__tests__/template-css.test.ts`) | Membaca `src/app/globals.css` dan `src/app/themes/*.css` lewat `fs`; untuk tiap `id` di `TEMPLATES` memastikan ada blok terang **dan** gelap, dan bahwa himpunan nama custom property di tiap blok **sama persis** dengan yang di `:root`. Menangkap template yang didaftarkan tapi lupa dibuatkan token — kerusakan yang gampang lolos dari mata |
| Komponen (`providers/__tests__/template-provider.test.tsx`) | `setTemplate` menulis cookie, memasang ketiga atribut di `documentElement`, dan memanggil `router.refresh()`. Mengikuti pola `scope-provider.test.tsx` yang sudah ada |
| Komponen (`hooks/__tests__/use-visible-nav.test.tsx`) | Menyaring item yang permission-nya tidak dimiliki role aktif; menandai item aktif dari `pathname` termasuk sub-route |
| E2E (`e2e/template.spec.ts`) | Pilih Kertas Kerja di Settings → `data-template` berubah → reload → masih terpasang. Pilih Ruang Rapat → navigasi atas terlihat, sidebar tidak ada. Hapus cookie → kembali ke default. Ganti terang/gelap pada Kertas Kerja → `.dark` terpasang dan `data-template` tidak berubah |

**Mutasi yang wajib terbukti merah:** mencabut `router.refresh()` dari `setTemplate` harus membuat E2E pergantian shell gagal (warna sudah berganti lewat langkah 1, tapi shell tidak) — ini yang membuktikan test benar-benar menguji jalur server, bukan cuma atribut di client.

## 9. Berkas yang tersentuh

**Baru:**
```
src/config/templates.ts
src/config/__tests__/templates.test.ts
src/config/__tests__/template-css.test.ts
src/app/themes/adminly.css
src/app/themes/kertas-kerja.css
src/app/themes/ruang-rapat.css
src/app/themes/vocabulary.css
src/components/providers/template-provider.tsx
src/components/providers/__tests__/template-provider.test.tsx
src/components/layout/shells/sidebar-shell.tsx
src/components/layout/shells/topnav-shell.tsx
src/components/layout/template-switcher.tsx
src/components/settings/template-picker.tsx
src/hooks/use-visible-nav.ts
src/hooks/__tests__/use-visible-nav.test.tsx
e2e/template.spec.ts
```

**Diubah:**
```
src/app/layout.tsx                  cookie + atribut html + TemplateProvider + 2 font baru
src/app/(app)/layout.tsx            menyusut jadi pemilih shell
src/app/globals.css                 3 token baru, impor tema, komentar urutan
src/app/(app)/settings/page.tsx     tab "Tampilan"
src/components/layout/app-sidebar.tsx   pakai useVisibleNav()
src/components/layout/site-header.tsx   pakai useVisibleNav() + TemplateSwitcher
src/components/crud/resource-form.tsx   satu data-slot="form-row"
src/locales/en.ts, src/locales/id.ts    kunci t.template.*
README.md                           bagian template + arahan branding baru
```

**Tidak tersentuh:** seluruh `src/components/ui/`, `mode-toggle.tsx`, `sonner.tsx`, `theme-provider.tsx`, `proxy.ts`, seluruh lapisan CRUD selain satu `data-slot`.

## 10. Risiko

| Risiko | Penanganan |
|---|---|
| `npx shadcn add` menimpa komponen dengan markup baru dan `data-slot` bergeser, membuat override meleset diam-diam | Override cuma menyentuh 4 penanda: `card`, `card-footer`, `button` (dilingkupi ke dalam form-row), dan `form-row` yang kita pasang sendiri. E2E Ruang Rapat memeriksa kartu benar-benar punya bayangan, jadi pergeseran ketahuan |
| Seseorang menggeser urutan `@import` dan template berhenti menimpa lantai dasar | Komentar di `globals.css` + test integritas token yang membaca kedua lapis |
| `--label-col` 190px memakan lebar di layar sempit | Aturan `form-row` dibungkus `@media (min-width: 48rem)` |
| Kontras palet baru tidak lolos di salah satu mode | Tiap palet diperiksa terhadap WCAG AA untuk pasangan teks/latar sebelum ditandai selesai |
| Duplikasi nilai Adminly antara `:root` dan `[data-template="adminly"]` jadi tidak sinkron | Test integritas menuntut himpunan nama token yang sama; perbedaan **nilai** memang dibolehkan karena fork boleh mengganti `:root` |

## 11. Yang ditunda, dan biayanya nanti

Dispatch (operasional, `density: rapat`, `surface: rata`, IBM Plex Sans, palet biru-batu dengan sistem warna status) dan Tahun Ajaran (sekolah, pita konteks scope di bawah header, Asap, palet hijau lembaga dengan amber untuk data yang belum diisi) sudah dirancang lengkap di dialog brainstorming dan rupanya sudah dilihat lewat pratinjau.

Menambahkan Dispatch nanti = satu entri registry + satu file CSS + dua nilai kosakata baru di `vocabulary.css`. Menambahkan Tahun Ajaran = satu entri + satu file CSS + satu boolean `scopeBand` di `sidebar-shell.tsx` yang memindahkan `ScopeSwitcher` dari header ke pita di bawahnya. Tidak ada yang menuntut perubahan arsitektur.
