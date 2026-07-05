import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["ParamJabatan"];
type TNew = components["schemas"]["NewParamJabatan"];

export const paramjabatanSchema = z.object({
  keterangan: z.string().min(1, "Wajib diisi"),
  id_jabatan: z.coerce.number().optional(),
  id_group: z.coerce.number().optional(),
});

export const paramjabatanResource = defineResource<T, TNew, TNew>({
  name: "paramjabatan",
  path: "/paramjabatan",
  api: createResourceApi<T, TNew, TNew>({ resource: "paramjabatan", path: "/paramjabatan" }),
  permissions: {
    view: "paramjabatan:view",
    create: "paramjabatan:create",
    update: "paramjabatan:update",
    delete: "paramjabatan:delete",
  },
  columns: [
    { field: "keterangan", labelKey: "keterangan" , sortable: true, searchable: true },
    { field: "id_jabatan", labelKey: "id_jabatan" },
    { field: "id_group", labelKey: "id_group" },
  ],
  list: { defaultSort: "keterangan", perPage: 20 },
  form: {
    schema: paramjabatanSchema,
    layout: [{ tabKey: "umum", fields: ["keterangan", "id_jabatan", "id_group"] }],
    fields: {
      keterangan: { type: "text", labelKey: "keterangan" },
      id_jabatan: { type: "number", labelKey: "id_jabatan" },
      id_group: { type: "number", labelKey: "id_group" },
    },
  },
});
