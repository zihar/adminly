"use client";
import { useController } from "react-hook-form";
import { useI18n } from "@/components/providers/i18n-provider";
import { Combobox } from "@/components/ui/combobox";
import type { FieldProps } from "./index";

/**
 * Select statis: opsi datang dari `meta.options` (label sudah final, tak
 * perlu re-i18n). Pembungkus tipis yang menyambung `useController` ke
 * `Combobox`; `Combobox.onChange` selalu mengirim `String(o.value)` -- native
 * `<select>` yang digantikannya SELALU mengirim string lewat `e.target.value`,
 * jadi tipe itu dilestarikan biar config resource ber-value numerik tak
 * diam-diam berubah tipe tersimpannya di form.
 */
export function SelectField({ name, meta, disabled }: FieldProps) {
  const { t } = useI18n();
  const { field, fieldState } = useController({ name });
  const value = field.value === undefined || field.value === null ? "" : String(field.value);

  return (
    <Combobox
      ref={field.ref}
      options={meta.options ?? []}
      value={value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      invalid={fieldState.invalid}
      disabled={disabled}
      placeholder={t.common.selectPlaceholder}
      searchPlaceholder={t.common.searchPlaceholder}
      emptyLabel={t.common.noResults}
    />
  );
}
