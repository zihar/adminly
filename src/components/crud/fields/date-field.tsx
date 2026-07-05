"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { FieldProps } from "./index";

// Field tanggal (tanpa waktu); value RHF berupa string "YYYY-MM-DD".
export function DateField({ name }: FieldProps) {
  const { register } = useFormContext();
  return <Input id={name} type="date" {...register(name)} />;
}
