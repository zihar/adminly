"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { FieldProps } from "./index";

/**
 * Grup radio statis dari `meta.options`. Semua input berbagi `name` (via
 * `register(name)`) agar hanya satu yang bisa terpilih. Radio pertama diberi
 * `id={name}` supaya `<Label htmlFor={name}>` di `resource-form.tsx` (label
 * grup) tetap bisa memfokuskan salah satu input.
 */
export function RadioField({ name, meta }: FieldProps) {
  const { register } = useFormContext();
  const options = meta.options ?? [];
  return (
    <div className="flex flex-col gap-2">
      {options.map((o, i) => (
        <label key={String(o.value)} className="flex items-center gap-2 text-sm font-normal">
          <input
            id={i === 0 ? name : undefined}
            type="radio"
            value={String(o.value)}
            {...register(name)}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}
