"use client";
import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { getResource } from "@/config/resources/index";
import type { FieldMeta } from "@/lib/crud/define-resource";

export function AsyncSelectField({ name, meta }: { name: string; meta: FieldMeta }) {
  const { setValue, register } = useFormContext();
  const parentValues = useWatch({ name: meta.dependsOn ?? [] });
  const source = meta.optionsFrom ? getResource(meta.optionsFrom) : undefined;
  const parent = (meta.dependsOn ?? []).reduce<Record<string, unknown>>((acc, key, i) => {
    acc[key] = Array.isArray(parentValues) ? parentValues[i] : parentValues;
    return acc;
  }, {});
  const query = source?.api.useOptions({ parent: parent as Record<string, string> });

  const parentKey = JSON.stringify(parent);
  React.useEffect(() => { setValue(name, ""); }, [name, setValue, parentKey]); // reset saat parent berubah

  return (
    <select {...register(name)} className="border rounded px-2 py-1">
      <option value="">-- pilih --</option>
      {(query?.data ?? []).map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}
