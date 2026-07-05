"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { useI18n } from "@/components/providers/i18n-provider";
import type { FieldProps } from "./index";

/** Select statis: opsi datang dari `meta.options` (label sudah final, tak perlu re-i18n). */
export function SelectField({ name, meta }: FieldProps) {
  const { t } = useI18n();
  const { register } = useFormContext();
  const options = meta.options ?? [];
  return (
    <select id={name} {...register(name)} className="border rounded px-2 py-1">
      <option value="">{t.common.selectPlaceholder}</option>
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}
