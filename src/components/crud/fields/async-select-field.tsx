"use client";
import * as React from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { getResource } from "@/config/resources/index";
import { useI18n } from "@/components/providers/i18n-provider";
import type { FieldProps } from "./index";

export function AsyncSelectField({ name, meta }: FieldProps) {
  const { t } = useI18n();
  const { setValue, register, getFieldState } = useFormContext();
  const dependsOn = meta.dependsOn ?? [];
  const parentValues = useWatch({ name: dependsOn });
  const source = meta.optionsFrom ? getResource(meta.optionsFrom) : undefined;
  const parent = dependsOn.reduce<Record<string, unknown>>((acc, key, i) => {
    acc[key] = Array.isArray(parentValues) ? parentValues[i] : parentValues;
    return acc;
  }, {});
  const query = source?.api.useOptions({ parent: parent as Record<string, string> });

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
    <select id={name} {...register(name)} className="border rounded px-2 py-1">
      <option value="">{t.common.selectPlaceholder}</option>
      {(query?.data ?? []).map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}
