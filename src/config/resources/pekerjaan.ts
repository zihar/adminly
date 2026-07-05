import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Pekerjaan"];
type TNew = components["schemas"]["NewPekerjaan"];

export const pekerjaanSchema = z.object({
  pekerjaan: z.string().min(1, "Wajib diisi"),
});

export const pekerjaanResource = defineResource<T, TNew, TNew>({
  name: "pekerjaan",
  path: "/pekerjaan",
  api: createResourceApi<T, TNew, TNew>({ resource: "pekerjaan", path: "/pekerjaan" }),
  permissions: {
    view: "pekerjaan:view",
    create: "pekerjaan:create",
    update: "pekerjaan:update",
    delete: "pekerjaan:delete",
  },
  columns: [
    { field: "pekerjaan", labelKey: "pekerjaan.pekerjaan", sortable: true, searchable: true },
  ],
  list: { defaultSort: "pekerjaan", perPage: 20 },
  form: {
    schema: pekerjaanSchema,
    layout: [{ tabKey: "umum", fields: ["pekerjaan"] }],
    fields: { pekerjaan: { type: "text", labelKey: "pekerjaan.pekerjaan" } },
  },
});
