"use client";
import * as React from "react";
import { useController, useFormContext, useFormState, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { getResource } from "@/config/resources/index";
import { useI18n } from "@/components/providers/i18n-provider";
import type { FieldProps } from "./index";

export function AsyncSelectField({ name, meta }: FieldProps) {
  const { t } = useI18n();
  const { setValue, getFieldState } = useFormContext();
  const dependsOn = meta.dependsOn ?? [];
  const parentValues = useWatch({ name: dependsOn });
  const parent = dependsOn.reduce<Record<string, unknown>>((acc, key, i) => {
    acc[key] = Array.isArray(parentValues) ? parentValues[i] : parentValues;
    return acc;
  }, {});
  // `optionsPath` MENGALAHKAN `optionsFrom` kalau keduanya diisi — dipakai field
  // yang endpoint resource masternya digerbangi permission yang tak dimiliki
  // peran pemakai form (lih. docblock `optionsPath` di `FieldMeta`). Field yang
  // HANYA punya `optionsFrom` (mayoritas app) tak tersentuh: `source` dievaluasi
  // persis seperti sebelumnya saat `optionsPath` kosong.
  const source = !meta.optionsPath && meta.optionsFrom ? getResource(meta.optionsFrom) : undefined;
  // `meta.optionsPath`/`optionsFrom` tak pernah berganti untuk instance field
  // yang sama (properti statis dari `FieldMeta`, ditentukan saat resource
  // didefinisikan) — jadi urutan hook tetap stabil per instance, PERSIS pola
  // yang sudah dipakai baris di bawah (`source?.api.useOptions(...)`, yang
  // sama-sama memanggil hook secara kondisional lewat optional-chaining
  // berdasar `meta.optionsFrom`; eslint tak menandainya karena callee-nya
  // member-expression, bukan identifier `useQuery` polos). Requiring
  // `QueryClientProvider` tanpa syarat di SEMUA pemakai `AsyncSelectField`
  // (termasuk field lama yang tak pernah butuh react-query sungguhan di test)
  // adalah regresi yang lebih mahal daripada satu disable bertarget ini.
  //
  // `fetchOptionsByPath` diimpor DINAMIS di dalam `queryFn`, BUKAN statis di
  // atas berkas ini — review G5 menemukan impor statis `create-resource-api.ts`
  // menyeret evaluasi modul `apiClient`/`getApiBaseUrl()` ke waktu IMPOR
  // `async-select-field.tsx` (dipakai transitif oleh SETIAP `ResourceForm`),
  // lebih awal daripada `vi.stubEnv()`/MSW sempat pasang di test yang bahkan
  // tak merender field `optionsPath` — 3 test `resource-form.test.tsx` gantung
  // (fetch nyata ke jaringan yang di-blackhole sandbox) karenanya. Impor
  // dinamis menunda evaluasi modul itu sampai `queryFn` benar-benar jalan,
  // yaitu hanya saat ADA field `optionsPath` yang di-render & query-nya aktif.
  const pathQuery = meta.optionsPath
    ? // eslint-disable-next-line react-hooks/rules-of-hooks -- lih. komentar di atas
      useQuery({
        queryKey: [meta.optionsPath, parent] as const,
        queryFn: async () => {
          const { fetchOptionsByPath } = await import("@/lib/crud/create-resource-api");
          return fetchOptionsByPath(meta.optionsPath!, { parent: parent as Record<string, string> });
        },
      })
    : undefined;
  const query = pathQuery ?? source?.api.useOptions({ parent: parent as Record<string, string> });

  // BUG B (reload jadwal_* kosong): `<select {...register(name)}>` adalah
  // TAK-TERKENDALI — `register()` menaruh nilai ke DOM lewat `ref.value = ...`
  // HANYA saat `reset(one.data)` dipanggil. Opsi (`<option>`) untuk field ini
  // datang dari `query` (fetch terpisah ke `optionsFrom`) yang bisa RESOLVE
  // SETELAH `reset()`. Saat itu terjadi, `ref.value = 42` tak menemukan
  // `<option value="42">` apa pun di DOM → browser diam-diam membuang
  // assignment (select jatuh ke opsi pertama/placeholder). Ketika opsi
  // akhirnya muncul lewat re-render, TIDAK ADA mekanisme yang menerapkan
  // ulang value — sebab select tak-terkendali, React tak menyentuh
  // `.value`-nya lagi. Dibuktikan lewat test reproduksi terisolasi
  // (options resolve setelah reset → select tetap "").
  //
  // Perbaikan asli (langsung) menjadikan select terkendali lewat
  // `useWatch`/`setValue` tangan-sendiri — TAPI itu diam-diam MEN-DE-REGISTER
  // field-nya dari RHF: tak ada lagi `name`/`ref`/`onBlur`, dan `setValue`
  // tanpa `shouldValidate` tak memicu re-validate `reValidateMode` (error
  // 422 yang dipetakan `resource-form.tsx` ke field ini tak pernah hilang
  // walau usernya sudah memperbaiki pilihan), `shouldFocusError` tak bisa
  // fokus/scroll ke field ini (tak ada ref terdaftar), dan `touchedFields`
  // tak pernah terisi (tak ada `onBlur`). Perbaikan BENAR: `useController`
  // — primitif RHF sendiri utk komponen terkendali kustom, di-`{...field}`
  // spread LANGSUNG ke `<select>` (bukan properti satu-satu — eslint-plugin-
  // react-hooks salah kira `field.ref`/`field.name`/dst. dibaca sebagai
  // `.current` ref saat render bila diakses satu-satu; spread menghindarinya
  // sekaligus tetap membawa `name`/`ref`/`onChange`/`onBlur`). `value=`
  // dioper TERPISAH SETELAH spread (JSX: prop belakangan menang) supaya
  // tetap kita yang menormalkan `null`/`undefined` → `""` — bukan
  // `field.value` mentah — dan tetap TERSINKRON ULANG tiap render saat opsi
  // datang belakangan (MENJAGA fix BUG B).
  const { field } = useController({ name });
  const value = field.value === undefined || field.value === null ? "" : String(field.value);

  // Reset value HANYA saat perubahan parent berasal dari AKSI USER.
  //
  // Kunci anti-hapus-prefill: `reset(one.data)` di mode edit (ResourceForm)
  // mengisi parent `undefined → nilai` pada render BELAKANGAN (setelah fetch
  // async), bukan di mount pertama — jadi ref `mounted` saja tak cukup. `reset()`
  // menetapkan default baru (parent non-dirty), sedangkan user yang mengubah
  // parent menandainya `dirty`. Jadi reset field ini hanya bila SALAH SATU
  // parent `dirty`. `useFormState({ name: dependsOn })` men-subscribe status
  // dirty parent agar reaktif; `getFieldState` membacanya per-field. Ref
  // `mounted` tetap dipertahankan sebagai jaring pengaman untuk mount pertama.
  const formState = useFormState({ name: dependsOn });
  const parentDirty = dependsOn.some((key) => getFieldState(key, formState).isDirty);
  const parentKey = JSON.stringify(parent);
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // Abaikan perubahan value yang berasal dari `reset()` (parent non-dirty).
    if (!parentDirty) return;
    setValue(name, "");
  }, [name, setValue, parentKey, parentDirty]); // reset saat parent berubah oleh user

  return (
    <select
      id={name}
      {...field}
      value={value}
      className="border rounded px-2 py-1"
    >
      <option value="">{t.common.selectPlaceholder}</option>
      {(query?.data ?? []).map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}
