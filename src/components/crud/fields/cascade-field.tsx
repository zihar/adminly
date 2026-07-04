"use client";
import * as React from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { getResource } from "@/config/resources/index";
import { useI18n } from "@/components/providers/i18n-provider";
import { resolveLabel } from "@/locales";
import type { FieldMeta } from "@/lib/crud/define-resource";
import type { FieldProps } from "./index";

type CascadeLevelMeta = NonNullable<FieldMeta["cascade"]>[number];

/**
 * Field N-level berjenjang (mis. country → state → city), digerakkan oleh
 * satu deskriptor `meta.cascade` (Task 6). `name` sengaja diabaikan — tiap
 * level punya field RHF sendiri (`level.key`), jadi field ini murni wadah
 * yang me-render satu `<select>` per level.
 */
export function CascadeField({ meta }: FieldProps) {
  const levels = meta.cascade ?? [];
  return (
    <div className="space-y-2">
      {levels.map((level, i) => (
        <CascadeLevel key={level.key} level={level} levels={levels} index={i} />
      ))}
    </div>
  );
}

/**
 * Satu level = satu komponen, supaya jumlah pemanggilan hook per level tetap
 * konsisten antar-render (bukan hook di dalam loop dg jumlah variabel).
 * Level root (index 0) tidak watch field induk apa pun — opsinya diambil
 * tanpa filter `parent` (route options mengembalikan root saat parent
 * kosong/absen, lihat `regions/options/route.ts`).
 */
function CascadeLevel({
  level,
  levels,
  index,
}: {
  level: CascadeLevelMeta;
  levels: CascadeLevelMeta[];
  index: number;
}) {
  const { t } = useI18n();
  const { register, setValue, getFieldState } = useFormContext();
  const parentFieldKey = index > 0 ? levels[index - 1].key : undefined;
  // `useWatch` selalu dipanggil (jumlah hook stabil); level root watch nama
  // field placeholder yang tak pernah ter-register → hasilnya selalu undefined.
  const parentValue = useWatch({ name: parentFieldKey ?? "__cascade_root__" });
  const ownValue = useWatch({ name: level.key });

  const source = getResource(level.optionsFrom);
  const parentParam = level.parentParam ?? "parentId";
  const parent = index > 0 ? { [parentParam]: String(parentValue ?? "") } : undefined;
  const query = source?.api.useOptions({ parent });

  // Reset berjenjang TERJAMIN: begitu value level INI berubah karena AKSI
  // USER, langsung hapus SEMUA level yang lebih dalam sekaligus — bukan
  // mengandalkan efek watch-berantai per-level (rapuh bila satu level tak ikut
  // ter-trigger).
  //
  // Kunci anti-hapus-prefill: `reset(one.data)` di mode edit (ResourceForm)
  // mengubah value induk `undefined → "c1"` pada render BELAKANGAN (setelah
  // fetch async) — bukan di mount pertama — jadi `mounted` saja tak cukup.
  // Solusi: reset level lebih dalam HANYA saat field ini `dirty`. `reset()`
  // menetapkan default baru (non-dirty), sedangkan user yang mengubah select
  // menandai field ini `dirty`. `useFormState({ name })` men-subscribe status
  // dirty field ini agar reaktif; `getFieldState(name, formState)` membacanya
  // per-field. Ref `mounted` tetap dipertahankan sebagai jaring pengaman untuk
  // mount pertama.
  const formState = useFormState({ name: level.key });
  const fieldDirty = getFieldState(level.key, formState).isDirty;
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // Abaikan perubahan value yang berasal dari `reset()` (field non-dirty) —
    // itu prefill default, bukan pilihan user.
    if (!fieldDirty) return;
    for (const deeper of levels.slice(index + 1)) {
      setValue(deeper.key, "");
    }
  }, [ownValue, fieldDirty, levels, index, setValue]);

  const disabled = index > 0 && !parentValue;

  return (
    <div className="space-y-1">
      <label htmlFor={level.key} className="text-sm font-medium">
        {resolveLabel(t, level.labelKey ?? level.key)}
      </label>
      <select
        id={level.key}
        {...register(level.key)}
        disabled={disabled}
        className="border rounded px-2 py-1"
      >
        <option value="">{t.common.selectPlaceholder}</option>
        {(query?.data ?? []).map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
