import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["SilabusIndikator"];
type TNew = components["schemas"]["NewSilabusIndikator"];

export const silabusindikatorSchema = z.object({
  id_mapel: z.coerce.number().optional(),
  indikator: z.string().min(1, "Wajib diisi"),
});

export const silabusindikatorResource = defineResource<T, TNew, TNew>({
  name: "silabusindikator",
  path: "/silabusindikator",
  api: createResourceApi<T, TNew, TNew>({ resource: "silabusindikator", path: "/silabusindikator" }),
  permissions: {
    view: "silabusindikator:view",
    create: "silabusindikator:create",
    update: "silabusindikator:update",
    delete: "silabusindikator:delete",
  },
  columns: [
    { field: "id_mapel", labelKey: "id_mapel" },
    { field: "indikator", labelKey: "indikator" , sortable: true, searchable: true },
  ],
  list: { defaultSort: "indikator", perPage: 20 },
  form: {
    schema: silabusindikatorSchema,
    layout: [{ tabKey: "umum", fields: ["id_mapel", "indikator"] }],
    fields: {
      id_mapel: { type: "number", labelKey: "id_mapel" },
      indikator: { type: "text", labelKey: "indikator" },
    },
  },
});
