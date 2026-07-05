"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { FieldProps } from "./index";

// Mock upload v1: belum ada endpoint multipart/storage sungguhan (fitur terpisah
// yang ditunda). Untuk sekarang file yang dipilih dibaca sebagai data-URL via
// FileReader lalu disimpan langsung ke value RHF agar cocok dg mock backend.
export function FileField({ name, meta }: FieldProps) {
  const { setValue } = useFormContext();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setValue(name, reader.result as string, { shouldDirty: true });
    };
    reader.readAsDataURL(file);
  }

  return <input id={name} type="file" accept={meta.accept} onChange={handleChange} />;
}
