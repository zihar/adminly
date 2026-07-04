import type { LucideIcon } from "lucide-react";
import type { ZodType } from "zod";
import type { Permission } from "@/config/rbac";
import type { ResourceApi } from "@/lib/crud/create-resource-api";

export type FieldType =
  | "text" | "textarea" | "number" | "select" | "async-select"
  | "date" | "datetime" | "checkbox" | "radio" | "file" | "richtext" | "hidden";

export type ColumnRender = "text" | "date" | "badge" | "relation" | "image" | "currency" | "boolean";

export type ColumnDef = {
  field: string;
  labelKey: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: ColumnRender;
  relation?: string;
};

export type FieldMeta = {
  type: FieldType;
  labelKey?: string;
  optionsFrom?: string;      // nama resource sumber options
  dependsOn?: string[];      // field induk (cascade)
  accept?: string;           // untuk file
  options?: { value: string | number; label: string }[]; // untuk select statis
};

export type FormDef = {
  schema: ZodType<unknown>;
  layout: { tabKey: string; fields: string[] }[];
  fields: Record<string, FieldMeta>;
};

export type ResourceDef<TItem = unknown, TNew = unknown, TUpdate = unknown> = {
  name: string;
  path: string;
  primaryKey?: string;
  api: ResourceApi<TItem, TNew, TUpdate>;
  nav?: { group?: string; icon?: LucideIcon; order?: number };
  permissions: { view: Permission; create: Permission; update: Permission; delete: Permission };
  columns: ColumnDef[];
  list?: { defaultSort?: string; perPage?: number; filters?: string[] };
  scope?: string[];
  form: FormDef;
  actions?: (string | { key: string; icon?: LucideIcon; run: (id: string | number) => void })[];
  components?: { list?: React.ComponentType<{ def: ResourceDef }>; form?: React.ComponentType<{ def: ResourceDef; id?: string }> };
};

/** Identity + validasi ringan (nama unik dijaga di registry). */
export function defineResource<TItem, TNew = Partial<TItem>, TUpdate = Partial<TItem>>(
  def: ResourceDef<TItem, TNew, TUpdate>,
): ResourceDef<TItem, TNew, TUpdate> {
  if (!def.name) throw new Error("Resource wajib punya name");
  return def;
}
