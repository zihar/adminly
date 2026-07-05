import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Kelurahan"];
type TNew = components["schemas"]["NewKelurahan"];

export const kelurahanSchema = z.object({
  id_kecamatan: z.coerce.number(),
  kode: z.string().min(1, "Wajib diisi"),
  nama: z.string().min(1, "Wajib diisi"),
  kodepos: z.string().optional(),
});

export const kelurahanResource = defineResource<T, TNew, TNew>({
  name: "kelurahan",
  path: "/kelurahan",
  api: createResourceApi<T, TNew, TNew>({ resource: "kelurahan", path: "/kelurahan" }),
  permissions: {
    view: "kelurahan:view",
    create: "kelurahan:create",
    update: "kelurahan:update",
    delete: "kelurahan:delete",
  },
  columns: [
    { field: "id_kecamatan", labelKey: "id_kecamatan" },
    { field: "kode", labelKey: "kode" , sortable: true, searchable: true },
    { field: "nama", labelKey: "nama" , sortable: true, searchable: true },
    { field: "kodepos", labelKey: "kodepos" , sortable: true, searchable: true },
  ],
  list: { defaultSort: "nama", perPage: 20 },
  form: {
    schema: kelurahanSchema,
    layout: [{ tabKey: "umum", fields: ["id_kecamatan", "kode", "nama", "kodepos"] }],
    fields: {
      id_kecamatan: { type: "async-select", labelKey: "id_kecamatan", optionsFrom: "kecamatan" },
      kode: { type: "text", labelKey: "kode" },
      nama: { type: "text", labelKey: "nama" },
      kodepos: { type: "text", labelKey: "kodepos" },
    },
  },
});
