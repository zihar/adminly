# Rombak Tema "Dataran Tinggi" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Template bawaan `adminly` tampil bergaya Dataran Tinggi (teal + emas, badge status berwarna, combobox, chip filter, tabel dan form berkartu), lalu digabung ke edelweiss-web dan terbukti di daftar Modul Ajar.

**Architecture:** Warna dan font hidup sebagai token di `src/app/themes/*.css` (mekanisme template yang sudah ada). Komponen memakai token, tanpa percabangan per template. Bagian A dikerjakan di repo `adminly` (Task 1–8), Bagian B di `edelweiss-web` lewat remote `upstream` (Task 9–10).

**Tech Stack:** Next.js 16 (App Router), React, Tailwind v4, `@base-ui/react`, `cmdk`, vitest, Storybook, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-rombak-tema-dataran-tinggi-design.md` (salinan di repo ini). Mockup: `docs/superpowers/evidence/2026-10-30-rombak-tema-modul-ajar-mockup.html`.

> **Salinan:** dokumen ini disalin dari repo `zihar/edelweiss` (docs#219, docs#221, 2026-10-30) supaya sesi yang bekerja di `adminly` tidak butuh akses ke repo itu. Bagian B (Task 9–10) bekerja di `edelweiss-web`.

## Global Constraints

- Next.js versi ini berbeda dari pengetahuan umum: baca panduan terkait di `node_modules/next/dist/docs/` sebelum menulis kode Next (AGENTS.md adminly).
- Palet: teal `#0e3b53` (merek), emas `#f7d01a` (aksen); tema gelap merek `#7cc3e4`. Permukaan terang: bg `#f3f6f7`, surface `#fff`, garis `#dfe7ea`, teks `#14262f`, redam `#5d727c`. Gelap: bg `#0b171d`, surface `#122530`. Token adminly memakai `oklch()`; konversi nilai hex di atas ke `oklch()` agar konsisten dengan berkas tema yang ada.
- Font: Fraunces untuk h1–h3 dan angka hero, Figtree untuk isi; keduanya lewat `next/font/google`, `display: swap`, subset `latin`.
- Radius: kartu 16px, kontrol 10px, pil 999px. Satu tingkat bayangan lembut.
- Status workflow: draft = abu, submitted = kuning, approved = hijau, rejected = merah (pasangan latar/teks, bukan warna merek).
- Warna aksen modul `--m1..--m4`; empat saja.
- Semua warna lewat token CSS; komponen tidak boleh memakai warna literal.
- Kontras teks ≥ 4.5:1 (WCAG AA) di terang dan gelap.
- Template `kertas-kerja` dan `ruang-rapat`: token yang sudah ada tidak berubah; hanya boleh ditambah token baru bernilai netral setara.
- Tidak ada perubahan perilaku data, RBAC, atau kontrak API.
- Jangan membaca berkas `.env*`. Commit selalu dengan pathspec eksplisit, tanpa `git add -A`.

## Review Focus

Masukan yang tidak disebut spec tetapi paling mungkin menggigit pengguna:
1. Teks redam dan teks badge di **tema gelap** (paling mudah gagal kontras) → diuji di Task 1 dan Task 2.
2. Opsi bernilai **angka** pada Combobox harus tetap tersimpan sebagai string, seperti `SelectField` lama → Task 3.
3. **Tidak ada hasil** karena filter/cari: pesan kosong memberi tombol "Hapus semua filter" yang benar-benar membersihkan URL → Task 5.
4. **Nama** kosong, satu kata, atau sangat panjang untuk avatar inisial → tidak crash, inisial wajar → Task 1 (`initialsOf`) dan Task 5.
5. Nilai status yang **tidak ada di workflow** (data lama) → badge jatuh ke teks biasa, tidak crash → Task 2.

---

## Bagian A — repo `adminly`

Persiapan: branch baru dari `origin/main` (checkout utama `/Users/zihar/Projects/adminly` tertinggal 7 commit dan jangan disentuh). Lokal: `git -C /Users/zihar/Projects/adminly fetch origin && git -C /Users/zihar/Projects/adminly worktree add -b feat/template-dataran-tinggi /Users/zihar/Projects/adminly/.worktrees/dataran-tinggi origin/main`, lalu `npm ci` di worktree. Di Claude web cukup branch baru dari `origin/main`.

### Task 1: Token, font, dan helper bersama

**Files:**
- Modify: `src/app/themes/base.css` (tambah token baru di `:root` dan `.dark`)
- Modify: `src/app/themes/adminly.css` (nilai Dataran Tinggi; perbarui komentar kepala: berkas ini sekarang tampilan Dataran Tinggi atas keputusan pemilik produk 2026-10-30)
- Modify: `src/app/themes/kertas-kerja.css`, `src/app/themes/ruang-rapat.css` (token baru bernilai netral setara)
- Modify: `src/app/layout.tsx` (Fraunces + Figtree, pola sama dengan Archivo/Public_Sans)
- Modify: `src/config/templates.ts` (`adminly`: `surface: "terangkat"`)
- Modify: `src/config/__tests__/templates.test.ts`, `e2e/template.spec.ts:18` (asersi `data-surface` jadi `terangkat`)
- Create: `src/lib/tone.ts`, `src/lib/__tests__/tone.test.ts`
- Create: `src/config/__tests__/contrast.test.ts`

**Interfaces:**
- Produces token baru (nama tetap, dipakai task lain): `--status-draft-bg|fg`, `--status-submitted-bg|fg`, `--status-approved-bg|fg`, `--status-rejected-bg|fg`, `--gold`, `--m1`, `--m2`, `--m3`, `--m4`, `--font-heading`.
- Produces `toneOf(key: string): 1 | 2 | 3 | 4` (deterministik dari hash string) dan `initialsOf(name: string): string` (maks 2 huruf kapital; kosong → `"?"`) di `src/lib/tone.ts`.

- [ ] **Step 1: Tulis tes kontras yang gagal** di `contrast.test.ts`: helper `contrastRatio(fg: string, bg: string): number` (terima `oklch(...)`, konversi ke sRGB). Asersi ≥ 4.5 untuk pasangan: `--foreground/--background`, `--muted-foreground/--background`, `--primary-foreground/--primary`, keempat pasangan `--status-*-fg/-bg`, masing-masing di blok `[data-template="adminly"]` dan `[data-template="adminly"].dark`.
- [ ] **Step 2: Tulis tes `tone`:** `toneOf("a")` selalu sama untuk input sama dan ∈ {1,2,3,4}; `initialsOf("")` = `"?"`, `initialsOf("Budi")` = `"B"`, `initialsOf("Ani Rahma Putri")` = `"AR"`, `initialsOf("  ")` = `"?"`.
- [ ] **Step 3: Jalankan** `npx vitest run src/config/__tests__/contrast.test.ts src/lib/__tests__/tone.test.ts src/config/__tests__/template-css.test.ts`. Expected: FAIL (token/berkas belum ada).
- [ ] **Step 4: Implementasi.** Token baru wajib muncul di `base.css` `:root` dan `.dark` DAN di tiap blok template (tes `template-css.test.ts` menuntut himpunan token identik). Nilai Dataran Tinggi hanya di `adminly.css`; dua template lain memakai nilai netral. Pasang Fraunces sebagai `--font-heading` yang dipakai h1–h3 di `adminly.css`; template lain mengisi `--font-heading: var(--font-app)`. `src/lib/tone.ts` murni, tanpa import React.
- [ ] **Step 5: Jalankan** tes yang sama plus `npx vitest run`. Expected: PASS. Bila kontras gagal, ubah nilai token (bukan tesnya) sampai ≥ 4.5.
- [ ] **Step 6: Commit** `feat(tema): token dan font Dataran Tinggi pada template adminly`.

### Task 2: Badge status berwarna

**Files:**
- Modify: `src/components/ui/badge.tsx` (varian `success`, `warning`, titik penanda di depan teks)
- Modify: `src/config/resources/items.ts:69-72` (submitted → `warning`, approved → `success`)
- Modify: tipe `variant` workflow status (cari dengan `grep -rn "variant" src/lib/crud/define-resource.ts`) agar menerima varian baru
- Modify: `src/components/crud/resource-table.tsx:304` (render `boolean` jadi `Badge` Ya/Tidak)
- Test: `src/components/ui/__tests__/badge.test.tsx`, `src/components/crud/__tests__/resource-table.test.tsx`

**Interfaces:**
- Consumes: token `--status-*` dari Task 1.
- Produces: `Badge` variant `"success" | "warning"` (kelas memakai `--status-approved-*` / `--status-submitted-*`).

- [ ] **Step 1: Tes gagal:** `badge.test.tsx` — `render(<Badge variant="success">Disetujui</Badge>)` memuat atribut `data-variant="success"`; `resource-table.test.tsx` — baris dengan status `approved` merender badge `success`, baris dengan status yang **tidak ada di workflow** merender teks mentah tanpa melempar galat (Review Focus 5), kolom `boolean` merender badge bertulisan `common.yes`/`common.no`.
- [ ] **Step 2: Jalankan** `npx vitest run src/components/ui/__tests__/badge.test.tsx src/components/crud/__tests__/resource-table.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementasi** sesuai file di atas. Titik penanda: elemen `<span aria-hidden>` berwarna `currentColor`.
- [ ] **Step 4: Jalankan** tes yang sama dan `npx tsc --noEmit`. Expected: PASS, tanpa galat tipe.
- [ ] **Step 5: Commit** `feat(ui): badge status success/warning dan kolom boolean berupa badge`.

### Task 3: Combobox bersama menggantikan `<select>` filter

Catatan temuan: `SelectField` (`src/components/crud/fields/select-field.tsx`) **sudah** berupa Popover + `cmdk` yang bisa dicari. Yang masih `<select>` bawaan browser hanyalah filter di `resource-table.tsx:95`. Task ini mengekstrak pola `SelectField` menjadi komponen bersama, bukan membuat dari nol.

**Files:**
- Create: `src/components/ui/combobox.tsx`, `src/components/ui/combobox.stories.tsx`
- Modify: `src/components/crud/fields/select-field.tsx` (pakai `Combobox`)
- Modify: `src/components/crud/resource-table.tsx:70-108` (`ResourceFilter` pakai `Combobox`)
- Modify: `e2e/items-filter.spec.ts` (ganti `selectOption` dengan interaksi combobox)
- Test: `src/components/ui/__tests__/combobox.test.tsx`; tes `fields/__tests__` yang sudah ada harus tetap hijau

**Interfaces:**
- Produces: `Combobox(props: { options: { value: string | number; label: string }[]; value: string; onChange: (value: string) => void; placeholder?: string; clearLabel?: string; invalid?: boolean; onBlur?: () => void; ref?: React.Ref<HTMLButtonElement> })`. Bila `clearLabel` ada, opsi pertama bernilai `""` berlabel itu (untuk filter "Semua"). `onChange` selalu menerima `String(option.value)`.

- [ ] **Step 1: Tes gagal** di `combobox.test.tsx` (user-event): mengetik di kotak cari menyaring opsi; memilih opsi bernilai angka `7` memanggil `onChange("7")` (string; Review Focus 2); Esc menutup panel; `onBlur` terpanggil juga saat memilih opsi (perilaku yang kini dijaga komentar di `select-field.tsx`); dengan `clearLabel="Semua"`, memilihnya memanggil `onChange("")`.
- [ ] **Step 2: Jalankan** `npx vitest run src/components/ui/__tests__/combobox.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementasi `Combobox`** dengan memindahkan logika Popover/Command dari `SelectField` apa adanya (termasuk `close()` terpusat); `SelectField` menjadi pembungkus tipis yang menyambung `useController` ke `Combobox`.
- [ ] **Step 4: Ganti `<select>` di `ResourceFilter`** dengan `Combobox` (`clearLabel={t.common.all}`), pertahankan `<label>`.
- [ ] **Step 5: Jalankan** `npx vitest run` (seluruh suite; tes select/cascade/async-select lama harus tetap hijau) lalu `npx playwright test e2e/items-filter.spec.ts`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(ui): Combobox bersama; filter tabel tak lagi memakai select bawaan browser`.

### Task 4: Chip filter status

Catatan: spec mockup menampilkan hitungan per chip. API daftar tidak punya agregat per status, jadi **hitungan tidak termasuk** tahap ini (dicatat sebagai utang di spec).

**Files:**
- Create: `src/components/ui/filter-chips.tsx`, `src/components/ui/filter-chips.stories.tsx`
- Modify: `src/components/crud/resource-table.tsx` (tampilkan chip di atas tabel bila `def.workflow` ada; memakai kunci filter `filter_<field status>` yang sama dengan `ResourceFilter`; baca sekitar baris 518 untuk nama field status dari `def.workflow`, dan sembunyikan `ResourceFilter` untuk field itu agar tidak ganda)
- Test: `src/components/ui/__tests__/filter-chips.test.tsx`, tambahan di `resource-table.test.tsx`

**Interfaces:**
- Produces: `FilterChips(props: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; allLabel: string })`. Chip aktif memakai `aria-pressed="true"`; chip "Semua" bernilai `""`.

- [ ] **Step 1: Tes gagal:** mengklik chip memanggil `onChange(value)`; hanya satu chip `aria-pressed=true` pada satu waktu; navigasi papan ketik (Tab, Enter/Space) bekerja; di `resource-table.test.tsx`, mengklik chip "Disetujui" menyetel `filter_<field>=approved` di URL (nuqs) dan daftar difilter.
- [ ] **Step 2: Jalankan** `npx vitest run src/components/ui/__tests__/filter-chips.test.tsx src/components/crud/__tests__/resource-table.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementasi** `FilterChips` (tombol `type="button"`, tanpa warna literal) dan sambungkan di `ResourceTable`.
- [ ] **Step 4: Jalankan** tes yang sama, lalu `npx playwright test e2e/items-filter.spec.ts e2e/items-list.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(crud): chip filter status pada tabel berworkflow`.

### Task 5: Tabel — header tegas, avatar, keadaan kosong

**Files:**
- Modify: `src/components/crud/resource-table.tsx` (header lengket, hover baris, kolom angka `tabular-nums`, sel `avatar`, keadaan kosong baris ~512)
- Modify: union tipe `render` kolom (cari `grep -rn '"currency"' src/lib/crud/`) → tambah `"avatar"`
- Modify: `src/config/resources/items.ts` bila ada kolom nama yang cocok untuk memamerkan `render: "avatar"`
- Modify: kamus i18n `src/config/i18n.ts` (kunci `common.clearFilters`, en + id: "Clear all filters" / "Hapus semua filter")
- Test: `resource-table.test.tsx`

**Interfaces:**
- Consumes: `initialsOf`, `toneOf` (Task 1), `Avatar` (`@/components/ui/avatar`).
- Produces: nilai `render: "avatar"` pada definisi kolom: sel berisi lingkaran inisial berwarna `--m<toneOf(nama)>` dan teks nama.

- [ ] **Step 1: Tes gagal:** sel `avatar` untuk `"Ani Rahma Putri"` menampilkan `AR`; untuk nama kosong menampilkan `?` tanpa melempar galat dan untuk nama 200 karakter tidak memecah tata letak (kelas `truncate`); saat daftar kosong **dan** ada `q`/`filter_*` aktif, muncul tombol "Hapus semua filter" yang bila diklik menghapus `q` dan semua `filter_*` dari URL (Review Focus 3, 4); saat daftar kosong tanpa filter, tombol itu tidak muncul.
- [ ] **Step 2: Jalankan** `npx vitest run src/components/crud/__tests__/resource-table.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementasi** sesuai daftar file.
- [ ] **Step 4: Jalankan** tes yang sama, `npx tsc --noEmit`, dan `npx storybook build` bila story tabel terdampak. Expected: PASS.
- [ ] **Step 5: Commit** `feat(crud): tabel dengan header tegas, avatar inisial, dan keadaan kosong yang memberi arah`.

### Task 6: Form berkartu dan label tab

**Files:**
- Modify: `src/components/crud/resource-form.tsx` (bungkus kartu; label tab lewat i18n; baca baris 78–120 untuk melihat bagaimana label tab dicetak sekarang)
- Modify: `src/app/themes/vocabulary.css` atau `adminly.css` (garis bawah emas `--gold` pada tab aktif, memakai hook `data-slot` yang ada, tanpa menyentuh `src/components/ui/tabs.tsx`)
- Modify: `src/config/i18n.ts` (kunci `form.tab.umum` dst., en + id)
- Test: `src/components/crud/__tests__/resource-form.test.tsx`

- [ ] **Step 1: Tes gagal:** tab dengan `tabKey: "umum"` tampil sebagai label hasil i18n (id: "Umum"), bukan kunci mentah; bila kunci i18n tidak ada, jatuh ke `tabKey` dengan huruf awal kapital (tidak crash).
- [ ] **Step 2: Jalankan** `npx vitest run src/components/crud/__tests__/resource-form.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementasi** sesuai daftar file.
- [ ] **Step 4: Jalankan** tes yang sama dan `npx playwright test e2e/items-validation.spec.ts e2e/crud-items.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(crud): form berkartu, label tab dari i18n, tab aktif beraksen emas`.

### Task 7: Sidebar berikon warna dan judul halaman

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx:55-70` (ikon item diberi `data-tone={toneOf(item.key)}`)
- Modify: `src/app/themes/adminly.css` (warna ikon `[data-tone="1".."4"]` dari `--m1..--m4`; item aktif beraksen emas)
- Modify: `src/components/layout/page-header.tsx` (h1 memakai `--font-heading`)
- Test: `src/components/layout/__tests__` (tes sidebar yang ada + asersi `data-tone`)

**Interfaces:**
- Consumes: `toneOf` (Task 1), token `--m1..--m4`.

- [ ] **Step 1: Tes gagal:** dua render sidebar dengan item sama menghasilkan `data-tone` identik; semua nilai ∈ {1,2,3,4}.
- [ ] **Step 2: Jalankan** `npx vitest run src/components/layout`. Expected: FAIL.
- [ ] **Step 3: Implementasi.** Pastikan ikon tidak membawa warna di template lain (aturan warna hanya di `adminly.css`).
- [ ] **Step 4: Jalankan** `npx vitest run` dan `npx playwright test e2e/template.spec.ts`. Expected: PASS (shell `topnav` dan `kertas-kerja` tetap normal).
- [ ] **Step 5: Commit** `feat(layout): ikon sidebar berwarna dan judul halaman Fraunces`.

### Task 8: Verifikasi menyeluruh dan PR adminly

**Files:** README adminly bagian template (satu paragraf: template bawaan kini bergaya Dataran Tinggi; cara kembali ke abu-abu netral lewat mengganti nilai token).

- [ ] **Step 1:** `npm run lint` (catatan: skrip `lint` adminly = `eslint` tanpa `--fix`; di edelweiss-web berbeda, jangan campur), `npx vitest run`, `npm run build`, `npx playwright test`. Expected: semua hijau.
- [ ] **Step 2: Cek visual di browser** pada `/items` dan `/settings`: lebar 375 dan 1366, terang dan gelap, template `adminly`, `kertas-kerja`, `ruang-rapat`. Simpan tangkapan layar di `docs/` PR. Yang harus terlihat: tidak ada teks tak terbaca di gelap, `kertas-kerja`/`ruang-rapat` tidak rusak, pergantian template di Settings tetap bekerja.
- [ ] **Step 3:** Jalankan `/web-design-guidelines` pada `resource-table.tsx`, `combobox.tsx`, `filter-chips.tsx`, `resource-form.tsx`, `app-sidebar.tsx`; perbaiki temuan yang relevan.
- [ ] **Step 4:** Buka PR ke `zihar/adminly` (`gh pr create -R zihar/adminly`), sebut Review Focus dan hasil kontras di deskripsi.

---

## Bagian B — repo `edelweiss-web`

Gunakan `gh ... -R zihar/edelweiss-web`. Worktree sejajar checkout utama, path absolut. Jangan menggabung sebelum PR adminly (Task 8) ter-merge.

### Task 9: Gabung dari `upstream` dan selesaikan selisih

**Files:** `src/app/themes/*`, `src/components/ui/*`, `src/components/crud/*`, `src/app/layout.tsx`, `src/config/templates.ts` (hasil merge), dan identitas Dataran Tinggi yang sudah ada di edelweiss-web.

- [ ] **Step 1: Audit selisih** `src/components/crud` dan `src/lib/crud` antara `upstream/main` dan `main` (audit lama 2026-08-29 sudah basi). Catat berkas yang berbeda dari adminly.
- [ ] **Step 2:** Branch baru, `git fetch upstream && git merge upstream/main`. Selesaikan konflik dengan aturan: token warna/font dari adminly menang; hapus duplikasi identitas Dataran Tinggi lama di edelweiss-web (satu sumber kebenaran); logika bisnis dan config resource sekolah/RBAC milik edelweiss-web tetap.
- [ ] **Step 3:** `npm run sync:modules` bila konfigurasi modul tersentuh; `npm test` **penuh** (bukan hanya e2e), lint, build. Expected: hijau.
- [ ] **Step 4: Commit** merge dan buka PR ke `zihar/edelweiss-web`.

### Task 10: Percontohan Modul Ajar dan serah-terima

- [ ] **Step 1:** Pastikan daftar Modul Ajar memakai fitur baru: status lewat varian badge `warning`/`success`/`destructive`/`secondary`, chip filter status, `Combobox` untuk Kelas dan Mata pelajaran, `render: "avatar"` untuk kolom guru, titik warna mapel bila sudah ada datanya (kalau belum, catat sebagai utang, jangan mengarang).
- [ ] **Step 2: Uji di browser tiga peran** (akun fixture ada di memori `edelweiss-akun-fixture-uji`; jangan salin kredensial ke repo) pada 375 dan 1366, terang dan gelap, bandingkan dengan mockup.
- [ ] **Step 3: Bersihkan** data uji (`ZZVERIF`) bila ada; laporkan hasil dengan bahasa guru/kepala yayasan (tanpa istilah teknis) sesuai aturan laporan produk.
- [ ] **Step 4:** Setelah PR ter-merge: perbarui spec (tandai selesai, catat utang: hitungan per chip, dashboard/chart, modul lain), perbarui memori, hapus worktree, dan deploy lewat `edelweiss-deploy` bila pemilik produk meminta.
