import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Penilaian"];
type TNew = components["schemas"]["NewPenilaian"];

export const penilaianSchema = z.object({
  penilaian: z.string().min(1, "Wajib diisi"),
});

export const penilaianResource = defineResource<T, TNew, TNew>({
  name: "penilaian",
  path: "/penilaian",
  api: createResourceApi<T, TNew, TNew>({ resource: "penilaian", path: "/penilaian" }),
  permissions: {
    view: "penilaian:view",
    create: "penilaian:create",
    update: "penilaian:update",
    delete: "penilaian:delete",
  },
  columns: [
    { field: "penilaian", labelKey: "penilaian.penilaian", sortable: true, searchable: true },
  ],
  list: { defaultSort: "penilaian", perPage: 20 },
  form: {
    schema: penilaianSchema,
    layout: [{ tabKey: "umum", fields: ["penilaian"] }],
    fields: { penilaian: { type: "text", labelKey: "penilaian.penilaian" } },
  },
});
