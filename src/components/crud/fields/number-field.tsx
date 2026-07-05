"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { FieldProps } from "./index";

export function NumberField({ name }: FieldProps) {
  const { register } = useFormContext();
  return <Input id={name} type="number" {...register(name, { valueAsNumber: true })} />;
}
