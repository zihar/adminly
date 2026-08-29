# Desain: SelectField jadi Combobox searchable (fase 1)

- **Tanggal:** 2026-08-29
- **Status:** Draft — menunggu review user sebelum lanjut ke plan implementasi
- **Fondasi:** lapisan CRUD generik adminly sudah ada (lihat `2026-07-03-adminly-crud-layer-design.md`); `components/crud/fields/select-field.tsx` saat ini native `<select>`.
- **Konteks pemicu:** dropdown di seluruh form (Adminly, dipakai fork Edelweiss & fork lain) mau dibuat lebih modern & seragam — searchable, walau opsinya sedikit. Repo kerja: `adminly` (upstream), BUKAN `edelweiss-web` — fork itu sedang ada pengerjaan lain dan tak disentuh dulu.

## Keputusan yang dikonfirmasi (dialog brainstorming 2026-08-29)
1. ✅ **Fase 1 = hanya `select-field.tsx`** (dropdown statis dari `meta.options`). Field lain (`async-select-field.tsx`, `multi-async-select-field.tsx`, `cascade-field.tsx`) — fase 2+, TIDAK disentuh spec ini.
2. ✅ **Semua dropdown seragam pakai Combobox (searchable)** — bukan Select biasa untuk opsi sedikit + Combobox untuk opsi banyak. Trade-off diterima: kotak cari tetap tampil walau opsi cuma 2.
3. ✅ **Pendekatan A** — tulis ulang langsung isi `select-field.tsx`, TANPA membuat wrapper/abstraksi bersama dulu. Ekstraksi ke helper bersama ditunda sampai fase 2 benar-benar butuh (menghindari abstraksi tebakan sebelum ada pemakai kedua nyata).
4. ✅ **`aria-invalid` ditambahkan** ke trigger Button (dari `fieldState.invalid` via `useController`) — perilaku baru, menyamakan border-error dengan `input.tsx` yang sudah punya `aria-invalid:border-destructive`. Saat ini native `<select>` tak punya border merah, cuma teks error di bawah.
5. ✅ **String kosong-hasil baru:** `common.noResults` = "Tidak ada hasil" (id) / "No results" (en) — dicek langsung ke `adminly/src/locales/id.ts`/`en.ts`, tak ada string existing yang pas. Yang ada cuma `common.empty` ("Belum ada data.") — itu konteks empty-state tabel resource, bukan hasil pencarian dropdown, jadi tetap perlu key baru.
6. ✅ **Repo kerja: `adminly` (upstream), bukan `edelweiss-web`.** `select-field.tsx` identik byte-per-byte di kedua repo saat ini (nol divergensi) — aman dikerjakan di adminly lalu di-merge ke fork nanti. Catatan untuk fase 2 nanti (bukan keputusan spec ini): `async-select-field.tsx` SUDAH bercabang jauh antara adminly dan edelweiss-web (edelweiss-web punya fix bug produksi "BUG B" + dukungan `optionsPath` yang belum ada di adminly) — perlu keputusan terpisah sebelum fase 2 dikerjakan di adminly, supaya fix itu tak diam-diam hilang saat merge.

---

## 1. Tujuan & Non-Tujuan

**Tujuan:** ganti isi `SelectField` (dropdown statis dari `meta.options`) dari native `<select>` jadi Combobox searchable (shadcn Popover+Command), tanpa mengubah kontrak `FieldProps` (`name`, `meta`) yang dipakai `resource-form.tsx` dan seluruh config resource turunannya.

**Non-tujuan (fase lanjutan, di luar spec ini):** `async-select-field.tsx`, `multi-async-select-field.tsx`, `cascade-field.tsx` — belum disentuh. Wrapper/abstraksi bersama untuk pola controlled-combobox — ditunda sampai ada pemakai kedua nyata. Perubahan apa pun di `edelweiss-web` — fork itu sedang ada pengerjaan lain, tak disentuh sampai kerjaan fase 1 ini selesai & siap di-merge lewat `upstream`.

**Kriteria sukses:** `SelectField` di-render lewat Combobox (trigger Button → Popover → Command search+list), value RHF tetap sinkron dua arah, existing test `select-field.test.tsx` diperbarui & tetap hijau, dan mutasi (cabut `field.onChange` di handler pilih-opsi) terbukti MERAH.

## 2. Keputusan Desain (ringkas)

| # | Keputusan | Sumber |
|---|---|---|
| D1 | Lingkup fase 1 = `select-field.tsx` saja | dialog Q1 |
| D2 | Combobox seragam untuk semua ukuran opsi | dialog Q2 |
| D3 | Rewrite langsung (Pendekatan A), tanpa wrapper baru | dialog Q3 |
| D4 | `aria-invalid` baru ditambahkan ke trigger | dialog Q3-lanjutan |
| D5 | String baru `common.noResults` | dialog Q4 |
| D6 | Dikerjakan di repo `adminly`, bukan `edelweiss-web` | dialog Q5 (divergensi file) |

## 3. Komponen & Arsitektur

Shadcn tidak punya satu komponen "Combobox" siap pakai — komposisi dari `Popover` + `Command` (paket `cmdk`) + `Button` (trigger, sudah ada di `components/ui/button.tsx`). Primitive baru yang ditambah lewat `npx shadcn add popover command`:
- `components/ui/popover.tsx`
- `components/ui/command.tsx` (menambah dependency `cmdk` ke `package.json`)

Bentuk render `SelectField`:
```
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" aria-invalid={fieldState.invalid}>
      {selectedLabel ?? t.common.selectPlaceholder}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Command>
      <CommandInput placeholder={t.common.searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{t.common.noResults}</CommandEmpty>
        <CommandGroup>
          {options.map(o => <CommandItem onSelect={...}>{o.label}</CommandItem>)}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

`FieldProps` (`name: string`, `meta: FieldMeta`) tidak berubah — pemanggil (`resource-form.tsx`, config resource) tak perlu tahu implementasi internalnya berubah.

## 4. Alur Data & Integrasi RHF

- `useController({ name })` menggantikan `register(name)` — field jadi terkendali (pola sama seperti yang sudah dipakai `async-select-field.tsx` untuk kasus lain).
- `value` dinormalisasi `null/undefined → ""` sebelum dibandingkan ke `meta.options`.
- Label yang ditampilkan di trigger dicari manual: `meta.options.find(o => String(o.value) === value)?.label`, fallback ke `t.common.selectPlaceholder` bila tak ada yang cocok/value kosong.
- Pilih item di `CommandItem.onSelect`: panggil `field.onChange(o.value)`, lalu tutup Popover (state lokal `open`, `useState`).
- Filter pencarian ditangani otomatis oleh `cmdk` (fuzzy match built-in ke teks children `CommandItem`) — tak butuh fetch/filter manual karena `meta.options` sudah statis di client.
- `meta.options` sebagai sumber data — TIDAK berubah bentuknya.

## 5. Error Handling

- `resource-form.tsx` tetap menampilkan teks error di bawah field lewat `form.formState.errors[f]?.message` — tak disentuh.
- **Baru:** trigger `Button` diberi `aria-invalid={fieldState.invalid}` (dari `useController`), memicu styling `aria-invalid:border-destructive` yang sudah ada di token Tailwind milik `input.tsx` — border merah otomatis konsisten dengan field teks lain saat validasi gagal. Sebelumnya native `<select>` tak punya border merah sama sekali.

## 6. Testing

`select-field.test.tsx` ditulis ulang: interaksi lama (`fireEvent.change(getByRole("combobox"), ...)`) tak berlaku untuk Combobox baru. Alur baru: klik trigger Button dulu (Popover render kontennya, opsi jadi ada di DOM) → assert `getByRole("option", { name: "Merah" })` ada → klik/pilih opsi → assert value RHF berubah (`ValueProbe` existing tetap dipakai). Tambahan uji baru: ketik teks yang tak cocok opsi mana pun di `CommandInput` → assert `common.noResults` muncul.

Sesuai proses tim: setiap uji yang bentuknya berubah dibuktikan lewat mutasi — cabut pemanggilan `field.onChange` di handler `onSelect`, tunjukkan test MERAH, kembalikan.

## 7. Risiko & Utang yang Sengaja Ditunda

- Wrapper/abstraksi bersama untuk pola controlled-combobox ditunda ke fase 2 (lihat keputusan §Keputusan-6 di atas soal divergensi `async-select-field.tsx` antara `adminly` dan `edelweiss-web` — perlu diputuskan terpisah sebelum fase 2 dimulai).
- Merge balik ke `edelweiss-web` (lewat remote `upstream`) sengaja BELUM dilakukan sebagai bagian task ini — menunggu fork itu selesai dengan pengerjaan lain yang sedang berjalan di sana.
