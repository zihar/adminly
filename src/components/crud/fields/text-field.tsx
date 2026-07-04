"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { FieldProps } from "./index";

export function TextField({ name }: FieldProps) {
  const { register } = useFormContext();
  return <Input {...register(name)} />;
}
