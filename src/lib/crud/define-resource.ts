import type { LucideIcon } from "lucide-react";
import type { ZodType } from "zod";
import type { Permission } from "@/config/rbac";
import type { ResourceApi } from "@/lib/crud/create-resource-api";

export type FieldType =
  | "text" | "textarea" | "number" | "select" | "async-select"
  | "date" | "datetime" | "checkbox" | "radio" | "file" | "richtext" | "hidden"
  | "cascade";

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
  // Daftar level untuk field bertipe `cascade` (mis. country → state → city).
  // Tiap level meng-query `optionsFrom` dg filter `parent[parentParam]=<nilai level di atasnya>`.
  cascade?: {
    key: string;            // nama field RHF untuk level ini
    labelKey?: string;
    optionsFrom: string;    // resource sumber opsi
    parentParam?: string;   // nama param parent[...] (default "parentId")
    searchable?: boolean;
  }[];
};

export type FormDef = {
  schema: ZodType<unknown>;
  layout: { tabKey: string; fields: string[] }[];
  fields: Record<string, FieldMeta>;
};

/** Varian badge yang dipakai `<Badge>` (ui/badge.tsx). */
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/** Satu status dalam workflow — dipakai stepper & badge kolom status. */
export type WorkflowStatus = {
  value: string;
  labelKey: string;
  variant?: BadgeVariant;
};

/** Satu transisi (aksi) workflow — juga jadi key endpoint action + i18n/audit. */
export type WorkflowTransition = {
  action: string; // mis. "approve" — juga endpoint action + i18n/audit key
  from: string[]; // status asal yang diizinkan utk aksi ini
  to: string; // status hasil
  permission: Permission; // menjaga tombol (client) — harus ada di union Permission
  labelKey: string; // label tombol i18n
  variant?: "default" | "outline" | "destructive";
  requiresReason?: boolean; // wajib isi alasan lewat dialog sebelum transisi dieksekusi
};

/** Definisi workflow deklaratif utk satu resource (opsional). */
export type WorkflowDef = {
  field: string; // nama field status pada row (mis. "status")
  initial: string; // status yang di-stamp saat create
  statuses: WorkflowStatus[]; // berurutan → dipakai stepper + lookup variant/label badge
  transitions: WorkflowTransition[];
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
  workflow?: WorkflowDef;
};

/** Identity + validasi ringan (nama unik dijaga di registry). */
export function defineResource<TItem, TNew = Partial<TItem>, TUpdate = Partial<TItem>>(
  def: ResourceDef<TItem, TNew, TUpdate>,
): ResourceDef<TItem, TNew, TUpdate> {
  if (!def.name) throw new Error("Resource wajib punya name");
  return def;
}
