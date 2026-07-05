"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { FieldProps } from "./index";

// Field tanggal + waktu lokal; value RHF berupa string "YYYY-MM-DDTHH:mm".
export function DateTimeField({ name }: FieldProps) {
  const { register } = useFormContext();
  return <Input id={name} type="datetime-local" {...register(name)} />;
}
