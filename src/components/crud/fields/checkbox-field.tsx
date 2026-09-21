"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { FieldProps } from "./index";

/**
 * Checkbox tunggal bernilai boolean. Tidak ada `ui/checkbox` di repo ini,
 * jadi dipakai `<input type="checkbox">` native — RHF otomatis memperlakukan
 * checkbox tunggal (tanpa sibling bernama sama) sebagai value boolean.
 */
export function CheckboxField({ name, disabled }: FieldProps) {
  const { register } = useFormContext();
  return <input id={name} type="checkbox" disabled={disabled} {...register(name)} />;
}
