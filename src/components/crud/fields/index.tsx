"use client";
import * as React from "react";
import type { FieldMeta, FieldType } from "@/lib/crud/define-resource";
import { TextField } from "./text-field";
import { AsyncSelectField } from "./async-select-field";

type FieldComponent = React.ComponentType<{ name: string; meta: FieldMeta }>;
// Dipakai objek biasa (bukan Map) agar lookup di JSX dapat dianalisis statis oleh
// eslint-plugin-react-hooks (rule `static-components`) sebagai komponen stabil.
const REGISTRY: Partial<Record<FieldType, FieldComponent>> = {};

export function registerField(type: FieldType, component: FieldComponent) { REGISTRY[type] = component; }
registerField("text", TextField);
registerField("async-select", AsyncSelectField);

export function FieldRenderer({ name, meta }: { name: string; meta: FieldMeta }) {
  const Comp = REGISTRY[meta.type] ?? TextField;
  return <Comp name={name} meta={meta} />;
}
