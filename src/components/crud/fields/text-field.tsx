"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { FieldMeta } from "@/lib/crud/define-resource";

export function TextField({ name }: { name: string; meta: FieldMeta }) {
  const { register } = useFormContext();
  return <Input {...register(name)} />;
}
