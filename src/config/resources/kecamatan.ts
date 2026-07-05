import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Kecamatan"];
type TNew = components["schemas"]["NewKecamatan"];

export const kecamatanSchema = z.object({
  id_kabupaten: z.coerce.number(),
  kode: z.string().min(1, "Wajib diisi"),
  nama: z.string().min(1, "Wajib diisi"),
});

export const kecamatanResource = defineResource<T, TNew, TNew>({
  name: "kecamatan",
  path: "/kecamatan",
  api: createResourceApi<T, TNew, TNew>({ resource: "kecamatan", path: "/kecamatan" }),
  permissions: {
    view: "kecamatan:view",
    create: "kecamatan:create",
    update: "kecamatan:update",
    delete: "kecamatan:delete",
  },
  columns: [
    { field: "id_kabupaten", labelKey: "id_kabupaten" },
    { field: "kode", labelKey: "kode" , sortable: true, searchable: true },
    { field: "nama", labelKey: "nama" , sortable: true, searchable: true },
  ],
  list: { defaultSort: "nama", perPage: 20 },
  form: {
    schema: kecamatanSchema,
    layout: [{ tabKey: "umum", fields: ["id_kabupaten", "kode", "nama"] }],
    fields: {
      id_kabupaten: { type: "async-select", labelKey: "id_kabupaten", optionsFrom: "kabupaten" },
      kode: { type: "text", labelKey: "kode" },
      nama: { type: "text", labelKey: "nama" },
    },
  },
});
