"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { FieldProps } from "./index";

export function TextareaField({ name }: FieldProps) {
  const { register } = useFormContext();
  return (
    <textarea
      id={name}
      {...register(name)}
      className={cn(
        "h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
      )}
    />
  );
}
