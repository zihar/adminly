# Skin "Ceria Pendidikan" + Dashboard — Design

- **Tanggal**: 2026-07-05
- **Status**: Disetujui arah, menunggu review spec
- **Cakupan pass ini**: token warna + skin komponen bersama + halaman Dashboard

## Konteks & masalah

`edelweiss-web` sudah punya fondasi modern yang bagus (Next.js + shadcn/ui + Tailwind v4 + CRUD engine generik, i18n, tanstack-query/table). Tapi secara visual masih **palet default shadcn full grayscale** (`globals.css` semua token `oklch(x 0 0)` = tanpa warna) sehingga terasa steril/generik. Dashboard juga masih memakai data placeholder ala SaaS (Revenue $45.2K, Uptime 99.98%) yang tidak relevan dengan domain sekolah.

Aplikasi Edelweiss existing (Sximo) sebaliknya terasa ceria dan hangat — ikon kartu berwarna, chart pastel, metrik pendidikan nyata (Total Pendaftar/Siswa/Staff) — meski tampilannya sudah jadul/boxy.

Tujuan: bawa **kehangatan & tema pendidikan** dari existing ke atas **fondasi modern** yang sudah ada, tanpa merombak arsitektur.

## Keputusan desain (terkunci)

- **Arah**: modern + ceria pendidikan (pertahankan fondasi shadcn, ganti lapisan visual saja).
- **Warna primary**: biru langit.
- **Aksen sekunder**: oranye/amber hangat, dipakai hemat (badge perhatian, satu ikon metrik) — **bukan** dengan menimpa token `--accent` shadcn (yang bermakna surface hover low-emphasis).
- **Kategori/chart**: multi-warna pastel (biru, hijau, kuning/amber, pink, ungu) senada semangat existing.
- **Sudut**: sedikit lebih membulat (radius naik) agar terasa ramah.
- **Default tema**: light (sudah di-set di `layout.tsx`); dark mode tetap didukung dan tombol toggle tetap berfungsi.

## Non-goals (YAGNI)

- **Tidak** mengubah arsitektur, routing, CRUD engine, atau kontrak API.
- **Tidak** menyambung angka dashboard ke API nyata pada pass ini (belum ada endpoint metrik). Dashboard memakai data representatif dengan seam yang jelas untuk disambung belakangan.
- **Tidak** meredesain per-halaman CRUD secara bespoke — halaman CRUD ikut berubah otomatis karena memakai komponen bersama yang sama; poles kecil per halaman dilakukan di pass terpisah bila perlu.
- **Tidak** menambah ilustrasi/maskot atau tipografi kustom (itu opsi "brand bold" yang tidak dipilih).

## 1. Token warna (`src/app/globals.css`)

Ganti nilai token di blok `:root` (light) dan `.dark`. Nilai di bawah adalah **titik awal**; disetel halus saat implementasi dengan cek kontras WCAG AA (teks/ikon di atas primary, antar warna chart, paritas dark mode).

### Light (`:root`)

| Token | Sekarang | Usulan (awal) | Catatan |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.99 0.004 240)` | putih dengan sedikit sejuk |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.21 0.02 250)` | |
| `--card` / `--popover` | `oklch(1 0 0)` | `oklch(1 0 0)` | tetap putih bersih |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.62 0.15 240)` | biru langit |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.99 0.01 240)` | teks di atas primary |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.96 0.012 240)` | surface tenang, tint sejuk |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.96 0.008 240)` | |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.52 0.02 250)` | |
| `--accent` (hover surface) | `oklch(0.97 0 0)` | `oklch(0.95 0.02 240)` | tint biru tipis untuk hover — tetap low-emphasis |
| `--accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.30 0.05 250)` | |
| `--border` / `--input` | `oklch(0.922 0 0)` | `oklch(0.90 0.01 240)` | |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.62 0.15 240)` | samakan dengan primary |
| `--radius` | `0.625rem` | `0.75rem` | sudut lebih membulat |
| `--chart-1` | abu | `oklch(0.70 0.13 240)` | biru |
| `--chart-2` | abu | `oklch(0.72 0.14 155)` | hijau |
| `--chart-3` | abu | `oklch(0.80 0.13 85)` | kuning/amber |
| `--chart-4` | abu | `oklch(0.72 0.14 350)` | pink |
| `--chart-5` | abu | `oklch(0.65 0.15 300)` | ungu |
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.99 0.004 240)` | putih bersih |
| `--sidebar-primary` | `oklch(0.205 0 0)` | `oklch(0.62 0.15 240)` | pil item aktif |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.99 0.01 240)` | |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `oklch(0.95 0.02 240)` | hover item |
| `--sidebar-ring` / `--sidebar-border` | abu | ikut `--ring` / `--border` | |

### Dark (`.dark`)

Pertahankan surface gelap yang sudah ada, tapi:
- `--primary`: `oklch(0.70 0.14 240)` (biru sedikit lebih terang agar kontras di atas gelap), `--primary-foreground`: `oklch(0.20 0.03 250)`.
- `--ring`: samakan dengan primary dark.
- `--chart-1..5`: pakai pastel yang sama, naikkan sedikit lightness bila perlu agar terlihat di latar gelap.
- `--sidebar-primary`: samakan biru langit (ganti nilai ungu `oklch(0.488 0.243 264.376)` yang ada sekarang).
- Token surface lain (`--background`, `--card`, `--secondary`, `--muted`, `--accent`, `--border`) tetap, boleh diberi tint sejuk sangat tipis.

## 2. Skin komponen bersama

### `src/components/dashboard/stat-card.tsx`
- Tambah prop opsional `tone?: "blue" | "green" | "amber" | "pink" | "purple"`.
- Render ikon di dalam **chip bulat lembut**: latar tint warna tone (`bg-*/10`) + ikon berwarna tone penuh, menggantikan ikon abu polos di sudut.
- Peta tone → warna memakai token chart (`--chart-1..5`) atau util kelas Tailwind yang setara, agar konsisten dengan palet.
- Delta naik/turun tetap seperti sekarang (hijau/merah).

### `src/components/dashboard/overview-chart.tsx`
- Sudah pakai `var(--chart-1)` / `var(--chart-3)` → otomatis ikut pastel baru. Verifikasi dua seri terbedakan jelas (mis. biru vs hijau, bukan biru vs kuning yang tipis di area gradasi).
- Gradasi area & garis membulat (`type="natural"`) dipertahankan.

### Sidebar (`src/components/ui/sidebar.tsx` + komponen nav layout)
- Item aktif: pil `--sidebar-primary` (biru langit) dengan teks kontras; hover memakai `--sidebar-accent`.
- Ikon nav boleh diberi warna aksen tipis pada state aktif (opsional, jaga agar tidak ramai).
- Perubahan idealnya cukup lewat token; sentuh komponen hanya bila styling aktif saat ini hardcoded netral.

### Radius
- Kenaikan `--radius` otomatis merambat ke card, button, input, badge (semua turunkan dari `--radius-*`). Tidak perlu edit per komponen.

## 3. Konten Dashboard (`src/app/(app)/dashboard/page.tsx` + i18n)

Ganti empat StatCard placeholder SaaS menjadi metrik sekolah, meniru existing:

| Sekarang | Menjadi | tone | ikon (lucide) |
|---|---|---|---|
| Revenue | **Total Pendaftar** | blue | `UserPlus` |
| Active users | **Total Siswa** | green | `GraduationCap` |
| Transactions | **Total Staff** | purple | `Users` |
| Uptime | **Kehadiran Hari Ini** (%) | amber | `CalendarCheck` |

- `OverviewChart`: ubah dua seri jadi relevan pendidikan (mis. **Pendaftar** vs **Siswa Aktif** per bulan, atau tren pendaftaran) via kamus i18n; struktur komponen tetap.
- Kartu "Recent activity" dipertahankan (aktivitas terbaru tetap relevan), teks contoh bonafide domain sekolah.
- **Data**: tetap representatif/placeholder pada pass ini, dibentuk agar mudah diganti sumber API nanti (lihat Follow-ups). Angka contoh selaras existing (mis. Pendaftar 222, Siswa 274, Staff 88).

### i18n (`src/locales/`)
- Perbarui kunci di bawah `dashboard.stats` (ganti `revenue/activeUsers/transactions/uptime` → `totalPendaftar/totalSiswa/totalStaff/kehadiran`) dan `chart` (label seri + judul) pada **semua locale** yang ada (id & en).
- Pastikan `page.tsx` dan `overview-chart.tsx` merujuk kunci baru; hapus kunci lama yang tak terpakai.

## File yang disentuh

- `src/app/globals.css` — token light & dark.
- `src/components/dashboard/stat-card.tsx` — prop `tone` + chip ikon berwarna.
- `src/components/dashboard/overview-chart.tsx` — verifikasi/atur seri pastel + label.
- `src/app/(app)/dashboard/page.tsx` — metrik & ikon pendidikan.
- `src/locales/*` — kunci `dashboard.stats` & `chart` (semua locale).
- `src/components/ui/sidebar.tsx` / komponen nav — hanya bila state aktif hardcoded netral.

## Aksesibilitas

- Kontras teks/ikon di atas `--primary` ≥ WCAG AA (4.5:1 untuk teks kecil).
- Lima warna chart harus saling terbedakan (termasuk untuk defisiensi warna umum) — cek berpasangan, bukan hanya sekilas.
- Paritas dark mode: setiap perubahan light punya padanan dark yang kontras.
- Chip ikon tone: rasio ikon-vs-latar-chip cukup; jangan andalkan warna saja untuk makna (delta tetap pakai ikon panah + warna).

## Verifikasi

- Jalankan app (`PORT=3100 npm run dev`, sudah berjalan) dan tinjau Dashboard di light & dark — bandingkan dengan `dashboard-general.png` (existing) untuk "rasa" ceria.
- Screenshot before/after dashboard.
- Cek beberapa halaman CRUD generik memastikan skin ikut berubah wajar (tidak ada regresi kontras/keterbacaan).
- Test yang ada tetap hijau (`npm test`); komponen yang disentuh punya test — sesuaikan bila kunci i18n berubah.
- Typecheck/lint bersih.

## Rollout & follow-ups

- Halaman CRUD generik (`[resource]`) mewarisi skin otomatis lewat komponen bersama — poles per halaman (bila perlu) di pass terpisah.
- **Follow-up (pass lain)**: sambungkan angka dashboard ke `edelweiss-api` (butuh endpoint agregat metrik: total pendaftar/siswa/staff, kehadiran harian, tren bulanan). Definisikan hook di `src/hooks/api` mengikuti pola yang ada, ganti data placeholder tanpa mengubah tampilan.
