import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["TahunAjaran"];
type TNew = components["schemas"]["NewTahunAjaran"];

export const tahunajaranSchema = z.object({
  tahun_ajaran: z.string().min(1, "Wajib diisi"),
});

export const tahunajaranResource = defineResource<T, TNew, TNew>({
  name: "tahunajaran",
  path: "/tahunajaran",
  api: createResourceApi<T, TNew, TNew>({ resource: "tahunajaran", path: "/tahunajaran" }),
  permissions: {
    view: "tahunajaran:view",
    create: "tahunajaran:create",
    update: "tahunajaran:update",
    delete: "tahunajaran:delete",
  },
  columns: [
    { field: "tahun_ajaran", labelKey: "tahunajaran.tahun_ajaran", sortable: true, searchable: true },
    { field: "is_active", labelKey: "tahunajaran.is_active", render: "boolean" },
  ],
  list: { defaultSort: "tahun_ajaran", perPage: 20 },
  form: {
    schema: tahunajaranSchema,
    layout: [{ tabKey: "umum", fields: ["tahun_ajaran"] }],
    fields: { tahun_ajaran: { type: "text", labelKey: "tahunajaran.tahun_ajaran" } },
  },
});
