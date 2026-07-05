import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Kabupaten"];
type TNew = components["schemas"]["NewKabupaten"];

export const kabupatenSchema = z.object({
  id_provinsi: z.coerce.number(),
  kode: z.string().min(1, "Wajib diisi"),
  nama: z.string().min(1, "Wajib diisi"),
});

export const kabupatenResource = defineResource<T, TNew, TNew>({
  name: "kabupaten",
  path: "/kabupaten",
  api: createResourceApi<T, TNew, TNew>({ resource: "kabupaten", path: "/kabupaten" }),
  permissions: {
    view: "kabupaten:view",
    create: "kabupaten:create",
    update: "kabupaten:update",
    delete: "kabupaten:delete",
  },
  columns: [
    { field: "id_provinsi", labelKey: "id_provinsi" },
    { field: "kode", labelKey: "kode" , sortable: true, searchable: true },
    { field: "nama", labelKey: "nama" , sortable: true, searchable: true },
  ],
  list: { defaultSort: "nama", perPage: 20 },
  form: {
    schema: kabupatenSchema,
    layout: [{ tabKey: "umum", fields: ["id_provinsi", "kode", "nama"] }],
    fields: {
      id_provinsi: { type: "async-select", labelKey: "id_provinsi", optionsFrom: "provinsi" },
      kode: { type: "text", labelKey: "kode" },
      nama: { type: "text", labelKey: "nama" },
    },
  },
});
