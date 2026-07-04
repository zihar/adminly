"use client";
import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { getResource } from "@/config/resources/index";
import { useI18n } from "@/components/providers/i18n-provider";
import type { FieldProps } from "./index";

export function AsyncSelectField({ name, meta }: FieldProps) {
  const { t } = useI18n();
  const { setValue, register } = useFormContext();
  const parentValues = useWatch({ name: meta.dependsOn ?? [] });
  const source = meta.optionsFrom ? getResource(meta.optionsFrom) : undefined;
  const parent = (meta.dependsOn ?? []).reduce<Record<string, unknown>>((acc, key, i) => {
    acc[key] = Array.isArray(parentValues) ? parentValues[i] : parentValues;
    return acc;
  }, {});
  const query = source?.api.useOptions({ parent: parent as Record<string, string> });

  // Efek ini juga terpicu saat mount pertama; ref `mounted` memastikan reset
  // hanya berjalan saat parent BERUBAH (bukan saat form baru dirender), supaya
  // value yang sudah terisi (mis. form edit) tidak ikut terhapus.
  const parentKey = JSON.stringify(parent);
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    setValue(name, "");
  }, [name, setValue, parentKey]); // reset saat parent berubah

  return (
    <select id={name} {...register(name)} className="border rounded px-2 py-1">
      <option value="">{t.common.selectPlaceholder}</option>
      {(query?.data ?? []).map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}
