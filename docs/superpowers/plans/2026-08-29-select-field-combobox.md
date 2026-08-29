# SelectField → Combobox Searchable (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti isi `SelectField` (`src/components/crud/fields/select-field.tsx`) dari native `<select>` jadi Combobox searchable (shadcn Popover + Command), tanpa mengubah kontrak `FieldProps` yang dipakai `resource-form.tsx` dan seluruh config resource.

**Architecture:** Dua task. Task 1 menambah dua primitive shadcn baru (`popover.tsx`, `command.tsx`) yang belum ada di repo. Task 2 menulis ulang `SelectField` memakai primitive itu + `useController` (react-hook-form) untuk jadi controlled component, plus satu string i18n baru (`common.noResults`). Repo ini (`adminly`) memakai style shadcn **base-nova** (primitif `@base-ui/react`, BUKAN Radix) — komposisi trigger pakai prop `render={<Button .../>}`, bukan `asChild`.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, react-hook-form, shadcn/ui (Base UI variant) + `cmdk` (via Command), Tailwind v4, vitest + @testing-library/react + @testing-library/user-event.

**Spec:** `docs/superpowers/specs/2026-08-29-select-field-combobox-design.md`

## Global Constraints

- Lingkup fase 1 = `select-field.tsx` SAJA. `async-select-field.tsx`, `multi-async-select-field.tsx`, `cascade-field.tsx` TIDAK disentuh (spec D1).
- Semua dropdown yang disentuh di fase ini seragam pakai Combobox searchable, walau opsinya sedikit — jangan cabang balik ke Select biasa (spec D2).
- Tulis ulang langsung `select-field.tsx`; JANGAN membuat file wrapper/abstraksi bersama baru di fase ini (spec D3).
- Trigger Combobox WAJIB dapat `aria-invalid={fieldState.invalid}` — behavior baru, menyamakan border-error dengan `input.tsx` (spec D4).
- String kosong-hasil baru: `common.noResults` = "Tidak ada hasil" (id) / "No results" (en) — key baru, bukan reuse `common.empty` (spec D5).
- Kerjakan HANYA di repo `adminly` (branch `feat/select-combobox`, sudah ada dari `origin/main`). JANGAN sentuh `edelweiss-web` (spec D6, sedang ada pengerjaan lain di sana).
- `field.onChange` WAJIB dipanggil dengan `String(o.value)` (bukan `o.value` mentah) — native `<select>` yang digantikan selalu mengirim string lewat `e.target.value`; melestarikan tipe ini mencegah regresi diam-diam di config resource yang menyimpan value numerik.

---

### Task 1: Tambah primitive shadcn Popover + Command

**Files:**
- Create: `src/components/ui/popover.tsx` (via CLI shadcn)
- Create: `src/components/ui/command.tsx` (via CLI shadcn)
- Modify: `package.json`, `package-lock.json` (dependency baru, minimal `cmdk`)

**Interfaces:**
- Consumes: tidak ada (primitive baru, tak bergantung ke kode CRUD yang ada)
- Produces (dipakai Task 2): dari `@/components/ui/popover` — `Popover`, `PopoverTrigger`, `PopoverContent`. Dari `@/components/ui/command` — `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`. Ini nama standar shadcn (dipakai lintas-style Radix maupun Base UI, karena `Command` sendiri membungkus paket `cmdk` langsung, tidak lewat primitive Radix/Base UI). **Sebelum mulai Task 2, konfirmasi nama-nama ini benar ada di file yang di-generate step 2 di bawah** — kalau CLI menghasilkan nama berbeda, catat nama sebenarnya dan pakai itu di Task 2, bukan daftar di atas.

- [ ] **Step 1: Jalankan CLI shadcn untuk generate kedua primitive**

Dari root repo `adminly`:

```bash
npx shadcn add popover command -y
```

Flag `-y` skip prompt konfirmasi (dicek lewat `npx shadcn add --help` — CLI ini sudah ada di `devDependencies`, tak butuh akses jaringan untuk CLI-nya sendiri, cuma untuk fetch template komponen dari registry shadcn).

- [ ] **Step 2: Verifikasi file ter-generate & baca export-nya**

```bash
ls src/components/ui/popover.tsx src/components/ui/command.tsx
grep -n "^export function\|^export const\|^function.*Props" src/components/ui/popover.tsx src/components/ui/command.tsx
```

Expected: kedua file ada, dan grep menunjukkan komponen dengan nama yang cocok daftar "Produces" di atas (`Popover`, `PopoverTrigger`, `PopoverContent`, `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`). Kalau ada nama yang beda, tulis catatan di commit message step 5 supaya Task 2 memakai nama yang benar.

- [ ] **Step 3: Cek `cmdk` masuk sebagai dependency baru**

```bash
grep -n "\"cmdk\"" package.json
```

Expected: ada baris `"cmdk": "^..."` baru di `dependencies`.

- [ ] **Step 4: Jalankan baseline (typecheck + suite penuh) — pastikan primitive baru tak merusak apa pun yang sudah ada**

```bash
npx tsc --noEmit
npm test
```

Expected: keduanya PASS — primitive baru belum dipakai siapa pun, jadi ini murni pastikan tak ada konflik nama/tipe.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/ui/popover.tsx src/components/ui/command.tsx
git commit -m "chore(ui): tambah primitive Popover + Command (shadcn base-nova) untuk Combobox SelectField"
```

---

### Task 2: Rewrite SelectField jadi Combobox searchable + string i18n baru

**Files:**
- Modify: `src/locales/en.ts` (tambah `common.noResults`)
- Modify: `src/locales/id.ts` (tambah `common.noResults`)
- Modify: `src/components/crud/fields/select-field.tsx` (rewrite penuh)
- Modify: `src/components/crud/fields/__tests__/select-field.test.tsx` (rewrite penuh)

**Interfaces:**
- Consumes: `FieldProps = { name: string; meta: FieldMeta }` dari `@/components/crud/fields/index` (TAK berubah); `FieldMeta.options?: { value: string | number; label: string }[]` dari `@/lib/crud/define-resource`; `useI18n()` dari `@/components/providers/i18n-provider` → `{ t }`; `Popover`/`PopoverTrigger`/`PopoverContent`, `Command*` dari Task 1; `Button` dari `@/components/ui/button`; `useController` dari `react-hook-form`.
- Produces: `export function SelectField({ name, meta }: FieldProps)` — signature identik dengan sebelumnya. `src/components/crud/fields/index.tsx` (registry `registerField("select", SelectField)`) TIDAK perlu diubah.

- [ ] **Step 1: Tambah key `common.noResults` ke `en.ts`**

Di `src/locales/en.ts`, dalam blok `common: {...}`, tambahkan setelah baris `all: "All",`:

```ts
    all: "All",
    noResults: "No results",
```

- [ ] **Step 2: Tambah key sepadan ke `id.ts`**

Di `src/locales/id.ts`, dalam blok `common: {...}`, tambahkan setelah baris `all: "Semua",`:

```ts
    all: "Semua",
    noResults: "Tidak ada hasil",
```

- [ ] **Step 3: Verifikasi tipe `Dictionary` tetap konsisten**

```bash
npx tsc --noEmit
```

Expected: PASS (id.ts wajib punya bentuk identik `en.ts` karena `id: Dictionary = {...}` — kalau salah satu lupa ditambah, ini akan gagal dengan error properti hilang).

- [ ] **Step 4: Tulis ulang `select-field.test.tsx` (test dulu, sebelum implementasi)**

Ganti seluruh isi `src/components/crud/fields/__tests__/select-field.test.tsx` jadi:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { SelectField } from "@/components/crud/fields/select-field";
import { I18nProvider } from "@/components/providers/i18n-provider";

// `SelectField` memakai `useI18n()` untuk placeholder/no-results, jadi butuh
// mock manual `useRouter()` di luar App Router (sama seperti sebelumnya).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function ValueProbe() {
  const value = useWatch({ name: "warna" });
  return <span data-testid="warna-value">{String(value ?? "")}</span>;
}

function Harness({ triggerError }: { triggerError?: boolean }) {
  const form = useForm({ defaultValues: { warna: "" } });
  React.useEffect(() => {
    if (triggerError) {
      form.setError("warna", { type: "manual", message: "Wajib diisi" });
    }
  }, [triggerError, form]);
  return (
    <I18nProvider initialLocale="en">
      <FormProvider {...form}>
        <SelectField
          name="warna"
          meta={{
            type: "select",
            options: [
              { value: "merah", label: "Merah" },
              { value: "biru", label: "Biru" },
            ],
          }}
        />
        <ValueProbe />
      </FormProvider>
    </I18nProvider>
  );
}

describe("SelectField", () => {
  it("opsi tak ada di DOM sebelum trigger diklik, muncul sesudahnya", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole("option", { name: "Merah" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("option", { name: "Merah" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Biru" })).toBeInTheDocument();
  });

  it("memilih opsi mengubah value RHF ke value opsi tsb (string)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("option", { name: "Biru" }));
    expect(screen.getByTestId("warna-value")).toHaveTextContent("biru");
  });

  it("mengetik teks yang tak cocok opsi mana pun menampilkan noResults", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button"));
    await user.type(screen.getByRole("textbox"), "zzz-tidak-ada-yang-cocok");
    expect(await screen.findByText("No results")).toBeInTheDocument();
  });

  it("trigger dapat aria-invalid=true saat field ada error validasi", () => {
    render(<Harness triggerError />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-invalid", "true");
  });
});
```

- [ ] **Step 5: Jalankan test ini, konfirmasi GAGAL (komponen lama belum berubah)**

```bash
npx vitest run src/components/crud/fields/__tests__/select-field.test.tsx
```

Expected: FAIL. Test lama komponen native masih pakai `getByRole("combobox")`+`fireEvent.change`; test baru ini akan gagal karena tak ada opsi ter-render di dalam Popover manapun (komponennya belum diubah), dan `t.common.noResults`/`aria-invalid` belum ada sama sekali di implementasi lama.

- [ ] **Step 6: Tulis ulang `select-field.tsx`**

Ganti seluruh isi `src/components/crud/fields/select-field.tsx` jadi:

```tsx
"use client";
import * as React from "react";
import { useController } from "react-hook-form";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { FieldProps } from "./index";

/**
 * Select statis: opsi datang dari `meta.options` (label sudah final, tak
 * perlu re-i18n). `field.onChange` selalu dipanggil dengan `String(o.value)`
 * — native `<select>` yang digantikan komponen ini SELALU mengirim string
 * lewat `e.target.value`, jadi tipe itu dilestarikan biar config resource
 * ber-value numerik tak diam-diam berubah tipe tersimpannya di form.
 */
export function SelectField({ name, meta }: FieldProps) {
  const { t } = useI18n();
  const { field, fieldState } = useController({ name });
  const [open, setOpen] = React.useState(false);
  const options = meta.options ?? [];
  const value = field.value === undefined || field.value === null ? "" : String(field.value);
  const selected = options.find((o) => String(o.value) === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (!next) field.onBlur();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            ref={field.ref}
            variant="outline"
            className="w-full justify-start font-normal"
            aria-invalid={fieldState.invalid}
          />
        }
      >
        {selected?.label ?? t.common.selectPlaceholder}
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={t.common.searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{t.common.noResults}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={String(o.value)}
                  value={o.label}
                  onSelect={() => {
                    field.onChange(String(o.value));
                    setOpen(false);
                  }}
                >
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

Kalau nama export `Popover`/`Command*` hasil Task 1 berbeda dari yang dipakai di atas, sesuaikan import ini ke nama sebenarnya (lihat catatan Task 1 Step 2).

- [ ] **Step 7: Jalankan test yang sama, konfirmasi LULUS**

```bash
npx vitest run src/components/crud/fields/__tests__/select-field.test.tsx
```

Expected: PASS, ke-4 test.

- [ ] **Step 8: Mutasi — cabut `field.onChange` di handler `onSelect`, buktikan test soal pilih-opsi jadi MERAH**

Ubah sementara baris `field.onChange(String(o.value));` jadi komentar (atau hapus baris itu saja, biarkan `setOpen(false);` tetap ada), lalu jalankan:

```bash
npx vitest run src/components/crud/fields/__tests__/select-field.test.tsx
```

Expected: MERAH — khusus test `"memilih opsi mengubah value RHF ke value opsi tsb (string)"` gagal (value tetap `""`, assertion `toHaveTextContent("biru")` gagal). Test lain tetap lulus (mereka tak bergantung ke perubahan value). Ini membuktikan test itu benar-benar menggigit logic pemilihan opsi, bukan cuma merender.

- [ ] **Step 9: Kembalikan baris yang dicabut, verifikasi lulus lagi**

```bash
npx vitest run src/components/crud/fields/__tests__/select-field.test.tsx
```

Expected: PASS, ke-4 test lagi (identik Step 7).

- [ ] **Step 10: Jalankan suite penuh + typecheck sebagai regresi — pastikan tak ada konsumen lain `SelectField` yang ikut rusak**

```bash
npx tsc --noEmit
npm test
```

Expected: semua PASS. Kalau ada test lain yang gagal (mis. `resource-form.test.tsx` atau story lain yang merender field bertipe `select`), itu regresi nyata — investigasi sebelum lanjut, JANGAN commit dulu.

- [ ] **Step 11: Commit**

```bash
git add src/locales/en.ts src/locales/id.ts \
  src/components/crud/fields/select-field.tsx \
  src/components/crud/fields/__tests__/select-field.test.tsx
git commit -m "feat(select-field): ganti native <select> jadi Combobox searchable (Popover+Command)

Fase 1 dari spec 2026-08-29-select-field-combobox-design.md. Kontrak
FieldProps tak berubah. aria-invalid baru mengikuti pola input.tsx.
Field lain (async-select-field dkk) belum disentuh -- fase 2 terpisah."
```
