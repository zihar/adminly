import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Provinsi"];
type TNew = components["schemas"]["NewProvinsi"];

export const provinsiSchema = z.object({
  kode: z.string().min(1, "Wajib diisi"),
  nama: z.string().min(1, "Wajib diisi"),
});

export const provinsiResource = defineResource<T, TNew, TNew>({
  name: "provinsi",
  path: "/provinsi",
  api: createResourceApi<T, TNew, TNew>({ resource: "provinsi", path: "/provinsi" }),
  permissions: {
    view: "provinsi:view",
    create: "provinsi:create",
    update: "provinsi:update",
    delete: "provinsi:delete",
  },
  columns: [
    { field: "kode", labelKey: "kode" , sortable: true, searchable: true },
    { field: "nama", labelKey: "nama" , sortable: true, searchable: true },
  ],
  list: { defaultSort: "nama", perPage: 20 },
  form: {
    schema: provinsiSchema,
    layout: [{ tabKey: "umum", fields: ["kode", "nama"] }],
    fields: {
      kode: { type: "text", labelKey: "kode" },
      nama: { type: "text", labelKey: "nama" },
    },
  },
});
