# Rombak tampilan: template bawaan `adminly` jadi gaya "Dataran Tinggi", percontohan Modul Ajar

Tanggal: 2026-10-30 · Jalur: UI/design-system · Status: **arah visual disetujui pemilik produk** ("aku suka design nya", 2026-10-30); K3 dan K6 diputuskan pemilik produk 2026-10-30 (template `adminly` ikut diubah).

Menggantikan rencana lama 9 mockup tema (22 Oktober, artifact belum pernah dipilih).
Mockup acuan: [`evidence/2026-10-30-rombak-tema-modul-ajar-mockup.html`](../evidence/2026-10-30-rombak-tema-modul-ajar-mockup.html)
(artifact privat: https://claude.ai/artifact/VGzoFV4emftivi7dzFwVSQ).

> Salinan dari repo `zihar/edelweiss` (docs#219/#221, 2026-10-30).

## 1. Latar & tujuan

Keluhan pemilik produk: tampilan adminly/edelweiss-web **terlalu kaku dan polos**.
Dropdown masih `<select>` bawaan browser, tabel tiap halaman sederhana, nyaris
tanpa warna, sehingga guru cepat bosan. Pengamatan layar adminly (2026-10-30):
sidebar putih dengan ikon monokrom identik, dashboard hanya kartu stat abu-abu,
badge status satu warna, kolom boolean berupa teks "Yes/No", form tanpa kartu,
tab bernama "umum" (label i18n belum rapi).

**Tujuan:** tampilan lebih berwarna dan menarik **tanpa mengorbankan keterbacaan**
(dipakai berjam-jam), diwujudkan sebagai sistem komponen yang bisa dipakai
semua modul, bukan penataan per halaman.

**Sukses berarti:**
1. Template bawaan `adminly` (default adminly dan edelweiss-web) tampil bergaya Dataran Tinggi lewat mekanisme template yang sudah ada.
2. Halaman daftar Modul Ajar tampil sesuai mockup: chip filter status, dropdown bisa dicari, tabel dengan badge status berwarna, avatar inisial, titik warna mata pelajaran, keadaan kosong yang memberi arah.
3. Tidak ada perubahan perilaku data, RBAC, atau kontrak API.
4. Template `kertas-kerja` dan `ruang-rapat`: token mereka tidak berubah, uji dan e2e lulus, dan tampilannya tidak rusak. (Komponen struktural baru seperti chip, badge, avatar, keadaan kosong, dan combobox filter dipakai bersama, jadi "tidak berubah satu piksel" tidak realistis.)
5. Terlulus audit `/web-design-guidelines` dan kontras WCAG AA di terang dan gelap.

## 2. Keputusan yang SUDAH diambil

| # | Keputusan | Sumber |
|---|---|---|
| K1 | Palet: teal `#0e3b53` + emas `#f7d01a`, Fraunces untuk judul/angka hero, Figtree untuk isi. Selaras identitas "Dataran Tinggi" di edelweiss-web (web#13). | pemilik produk 2026-10-30 |
| K2 | Kalem, bukan ramai: warna dipakai fungsional (status, modul, mata pelajaran). Tanpa kartu ringkasan berwarna di atas tabel pada tahap ini. | default usul, 2026-10-30 |
| K3 | **Template `adminly` itu sendiri yang diubah** (token di `src/app/themes/adminly.css`, font di `layout.tsx`, `src/config/templates.ts` bila perlu), bukan template baru. Dasarnya: dari repo lokal hanya edelweiss-web yang memakai adminly sebagai starter; belum ada fork lain yang terbukti. | pemilik produk 2026-10-30 |
| K4 | Perubahan generik dikerjakan di **adminly dulu**, lalu digabung ke edelweiss-web lewat remote `upstream` (satu arah). | memori `feedback-adminly-satu-arah-ke-fork` |
| K5 | Modul percontohan: daftar **Modul Ajar**. | default usul, 2026-10-30 |
| K6 | Karena yang diubah template bawaan, gaya baru otomatis menjadi **default** di adminly dan edelweiss-web. Template lain tetap pilihan. | pemilik produk 2026-10-30 |

## 3. Desain

### 3.1 Template
Ubah blok `adminly` di `src/app/themes/adminly.css` (token warna terang+gelap, radius, bayangan), tambah font Fraunces + Figtree di `layout.tsx` lewat mekanisme font template lain, dan sesuaikan `shell`/`density`/`surface` di `TEMPLATES` bila mockup memerlukannya. Kunci i18n `template.adminly.label/desc` diperbarui bila namanya berubah. Semua warna lewat token CSS; komponen **tidak boleh** memakai warna literal.

### 3.2 Token (nilai awal dari mockup)
- Permukaan: bg `#f3f6f7`, surface `#fff`, garis `#dfe7ea`, teks `#14262f`, redam `#5d727c` (gelap: bg `#0b171d`, surface `#122530`).
- Merek: `--brand #0e3b53` (gelap `#7cc3e4`), `--gold #f7d01a`.
- Semantik status (pasangan latar/teks, bukan warna merek): Draf abu, Diajukan kuning, Disetujui hijau, Ditolak merah.
- Warna modul/mata pelajaran: empat warna aksen (`--m1..m4`).
- Radius: kartu 16px, kontrol 10px, pil 999px. Bayangan satu tingkat lembut.

### 3.3 Komponen baru/diubah (di `src/components/`)
| Komponen | Isi |
|---|---|
| `ui/combobox` | **Diekstrak dari `SelectField`**, yang sudah berupa combobox bisa dicari (Popover + cmdk). Satu-satunya `<select>` bawaan browser tersisa ada di `ResourceFilter` (`resource-table.tsx`); ganti dengan `Combobox` bersama. Nilai tetap string, `onBlur` dan `required` dipertahankan. |
| `ui/badge` (sudah ada) | Tambah varian `success` dan `warning` plus titik penanda; pemetaan status workflow (draft=abu, submitted=kuning, approved=hijau, rejected=merah) lewat `variant` di definisi resource. Bukan komponen `status-badge` baru. |
| `ui/filter-chips` | Grup chip status, `aria-pressed`, memakai mekanisme filter `filter_<field>` yang ada. **Tanpa hitungan**: API daftar tidak punya agregat per status (hitungan = utang, §3.4). |
| `ui/avatar` (sudah ada) | Dipakai untuk inisial berwarna deterministik per nama. |
| `crud/resource-table` | Header tegas (lengket), hover baris, kolom angka `tabular-nums`, keadaan kosong dengan aksi "Hapus semua filter", kolom boolean jadi badge. |
| `crud/resource-form` | Bungkus kartu, tab beraksen emas, label tab dari i18n. |
| `crud/resource-page` | Header halaman dengan ikon berwarna modul. |
| `ui/sidebar` | Ikon berwarna per kelompok menu (token `--m*`), bukan monokrom. |

Komponen memakai token, bukan percabangan per template, jadi `kertas-kerja` dan `ruang-rapat` tetap tampil seperti sekarang (komponen baru ikut, tetapi dengan token mereka sendiri; periksa tidak ada yang rusak).

### 3.4 Di luar cakupan
Hitungan per chip filter (butuh agregat dari API daftar; utang), dashboard/chart (grafik "Overview" yang tampak kosong adalah masalah terpisah), template lain, semua modul selain Modul Ajar (disebar sesudah percontohan disetujui), perubahan perilaku/RBAC/API.

## 4. Urutan kerja
1. **Plan**: [`plans/2026-10-30-rombak-tema-dataran-tinggi.md`](../plans/2026-10-30-rombak-tema-dataran-tinggi.md) (10 task; implementasi dikerjakan pemilik produk di Claude web).
2. Worktree adminly: `/Users/zihar/Projects/adminly/.worktrees/dataran-tinggi` (path absolut; `npm ci`; baca `node_modules/next/dist/docs/` sebelum menulis kode Next, sesuai AGENTS.md adminly).
3. Task 1: template + token + font (halaman contoh Storybook). Task 2: `combobox`, `status-badge`, `filter-chips` dengan story dan uji. Task 3: tabel/form/sidebar. Task 4: halaman `items` di adminly sebagai bukti, bukan Modul Ajar (data Modul Ajar milik edelweiss-web).
4. Gabung ke edelweiss-web lewat `upstream`, audit selisih `components/crud` dan `lib/crud` (memori `adminly-edelweiss-web-backlog-divergensi`), lalu terapkan ke Modul Ajar.
5. Verifikasi: browser tiga peran, 375px dan 1366px, terang dan gelap, `/web-design-guidelines`.

## 5. Risiko
- **Fork lain di masa depan:** README menyebut adminly starter untuk di-fork; mengubah template bawaan mengubah titik awal mereka. Diterima pemilik produk karena belum ada fork lain.
- **Selisih adminly↔edelweiss-web:** edelweiss-web sudah menyimpang; penggabungan bisa konflik. Mitigasi: audit selisih dulu di langkah 4.
- **Kontras tema gelap:** warna status di mockup belum diukur. Mitigasi: ukur rasio kontras sebelum token dikunci.
- **Combobox dan formulir:** `SelectField` sudah combobox; mengekstraknya harus mempertahankan nilai string, `onBlur`, `required`, perilaku cascade/async-select, dan uji e2e yang ada. `ResourceFilter` berpindah dari `<select>` ke `Combobox`.
- **Font Fraunces memperberat muatan:** pakai subset dan `display: swap`.

## 6. Pertanyaan terbuka
Tidak ada. Template default sudah diputuskan (K3, K6). Karena gaya baru menjadi default begitu digabung, peralihan layar yang belum dirombak (tabel/dropdown masih polos tetapi terbaca lewat token) diterima.
