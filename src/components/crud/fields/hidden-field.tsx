"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { FieldProps } from "./index";

export function HiddenField({ name }: FieldProps) {
  const { register } = useFormContext();
  return <input type="hidden" {...register(name)} />;
}
