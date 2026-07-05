import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Kelas"];
type TNew = components["schemas"]["NewKelas"];

export const kelasSchema = z.object({
  id_unit: z.coerce.number(),
  id_tahun_ajaran: z.coerce.number(),
  nama_kelas: z.string().min(1, "Wajib diisi"),
  tingkat: z.coerce.number().optional(),
  fase: z.string().optional(),
});

export const kelasResource = defineResource<T, TNew, TNew>({
  name: "kelas",
  path: "/kelas",
  api: createResourceApi<T, TNew, TNew>({ resource: "kelas", path: "/kelas" }),
  permissions: {
    view: "kelas:view",
    create: "kelas:create",
    update: "kelas:update",
    delete: "kelas:delete",
  },
  columns: [
    { field: "id_unit", labelKey: "id_unit" },
    { field: "id_tahun_ajaran", labelKey: "id_tahun_ajaran" },
    { field: "nama_kelas", labelKey: "nama_kelas" , sortable: true, searchable: true },
    { field: "tingkat", labelKey: "tingkat" },
    { field: "fase", labelKey: "fase" , sortable: true, searchable: true },
  ],
  list: { defaultSort: "nama_kelas", perPage: 20 },
  form: {
    schema: kelasSchema,
    layout: [{ tabKey: "umum", fields: ["id_unit", "id_tahun_ajaran", "nama_kelas", "tingkat", "fase"] }],
    fields: {
      id_unit: { type: "async-select", labelKey: "id_unit", optionsFrom: "unit" },
      id_tahun_ajaran: { type: "async-select", labelKey: "id_tahun_ajaran", optionsFrom: "tahunajaran" },
      nama_kelas: { type: "text", labelKey: "nama_kelas" },
      tingkat: { type: "number", labelKey: "tingkat" },
      fase: { type: "text", labelKey: "fase" },
    },
  },
});
