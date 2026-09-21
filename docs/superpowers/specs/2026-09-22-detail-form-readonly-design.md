# Desain: detail menggunakan form read-only

- **Tanggal:** 2026-09-22
- **Status:** Menunggu review pengguna
- **Pemilik generik:** `adminly`; **adopsi domain:** `edelweiss-web`

## Tujuan

Satu definisi `form` pada `ResourceDef` menjadi sumber kebenaran bagi edit dan
detail. Halaman detail menampilkan field, tab, section, dan urutan yang persis
sama dengan edit, tetapi tidak memungkinkan mutasi data. Ketika sebuah fork
menambah atau mengubah form edit, detail generik ikut berubah tanpa salinan
layout kedua.

## Ruang lingkup

Adminly menambahkan:

1. Rute generik `src/app/(app)/[resource]/[id]/page.tsx` yang merender
   `ResourceForm` dengan `mode="detail"`.
2. Prop eksplisit `mode?: "edit" | "detail"` pada `ResourceForm`; mode default
   tetap perilaku saat ini (`edit` untuk record ber-id, create bila tanpa id).
3. Context read-only internal yang dikonsumsi seluruh field renderer. Setiap
   kontrol input, select/popover, radio, checkbox, date/datetime, cascade,
   file, dan rich text menerima status disabled dari satu sumber, bukan
   conditional per-halaman.
4. Perilaku detail: data tetap dimuat lewat `useGetOne`, tab dapat dipilih,
   tetapi submit, mutation create/update, tombol workflow, dan panel yang dapat
   memutasi data tidak dirender. Tombol navigasi kembali tetap tersedia.
5. Kontrak komponen kustom yang jelas: `components.form` menerima
   `mode?: "edit" | "detail"`; rute detail mendahulukan `components.detail`
   bila ada, karena layar yang memang bukan form (misalnya buku besar atau
   jurnal berbaris) tidak boleh dipaksa menjadi form read-only.

`mode="detail"` membutuhkan `id`; pemakaian tanpa id adalah kesalahan pemrograman
dan harus gagal jelas pada development/test, agar detail tidak tanpa sengaja
masuk jalur create.

## Keputusan desain dan perilaku

Detail mempertahankan kartu, label, tab, section, loading, galat pemuatan, dan
nilai field dari `ResourceForm`. Ia tidak memakai definition list terpisah.
Kontrol yang disabled tetap menampilkan nilai yang sama seperti edit supaya
struktur visual dan semantik field tidak bercabang.

Disabled harus diterapkan oleh tiap field renderer melalui context mode, bukan
hanya `<fieldset disabled>`. Alasannya, beberapa field memakai trigger button
dan popover yang tidak dijamin tertutup oleh fieldset; seluruh titik interaksi
harus menerima `disabled` eksplisit. Field `hidden` tetap terdaftar tetapi tidak
merender kontrol visual.

Workflow tetap boleh menampilkan status dan audit timeline, tetapi tidak ada
`WorkflowTransitionButton` pada detail. Custom `formTabs` tidak dirender secara
default pada mode detail karena kontrak lamanya tidak menjamin read-only.
Komponen yang perlu tampil pada detail menggunakan `components.detail` atau
kelak opt-in read-only yang terpisah; ini mencegah panel mutatif bocor ke detail.

## Adopsi Edelweiss

Sesudah perubahan Adminly tersedia, Edelweiss mengganti jalur detail generiknya
untuk merender `ResourceForm mode="detail"` dan menghapus `ResourceDetail`
hanya setelah seluruh perilaku yang harus dipertahankan dipetakan. Fitur
Edelweiss khusus—Cetak Profil PDF, aksi funnel, dan resource dengan
`components.detail`—tetap menjadi tanggung jawab fork.

Resource yang sudah memiliki `components.detail` tidak berubah secara otomatis.
Masing-masing diklasifikasikan sebagai (a) layout form yang dapat dialihkan ke
mode detail atau (b) visualisasi domain yang tetap kustom. Form kustom menerima
prop mode dan wajib memilih apakah mendukung detail read-only atau tetap
mengandalkan `components.detail`.

## Pengujian

Unit/component test Adminly membuktikan:

1. Mode detail memuat record dan merender field/tab/section yang sama dengan
   edit.
2. Semua jenis field yang terdaftar menerima disabled dalam mode detail;
   tab tetap dapat diubah.
3. Tombol simpan dan tombol transisi workflow tidak ada, dan tidak ada mutation
   update/create saat pengguna mencoba berinteraksi.
4. Rute detail memakai komponen detail kustom bila resource mendeklarasikannya;
   selain itu memakai form mode detail.
5. Mode detail tanpa id gagal jelas.

Setiap assertion diuji dengan mutasi: cabut penerusan mode ke field renderer,
render kembali submit/transisi, atau alihkan rute ke mode edit. Masing-masing
harus membuat test terkait merah sebelum kode dipulihkan. Satu mutasi tambahan
yang tidak ditulis di plan akan ditentukan pelaksana dari lokasi pemanggilan
penjaga yang ditemukan saat implementasi.

Adopsi Edelweiss menambahkan test rute dan component yang membuktikan detail
generik memakai mode detail; lalu menguji tiap custom detail berdasarkan
klasifikasinya. Verifikasi visual/manual mencakup form dengan tab, select,
cascade, file, dan workflow pada lebar layar kecil serta desktop.

## Batasan

Tidak ada perubahan API, schema, permission server, atau data. `disabled` adalah
perlindungan UX; otorisasi mutasi tetap sepenuhnya dijaga API. Tidak ada migrasi
massal atas detail kustom sebelum klasifikasinya selesai.
