import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Kewarganegaraan"];
type TNew = components["schemas"]["NewKewarganegaraan"];

export const kewarganegaraanSchema = z.object({
  kewarganegaraan: z.string().min(1, "Wajib diisi"),
});

export const kewarganegaraanResource = defineResource<T, TNew, TNew>({
  name: "kewarganegaraan",
  path: "/kewarganegaraan",
  api: createResourceApi<T, TNew, TNew>({ resource: "kewarganegaraan", path: "/kewarganegaraan" }),
  permissions: {
    view: "kewarganegaraan:view",
    create: "kewarganegaraan:create",
    update: "kewarganegaraan:update",
    delete: "kewarganegaraan:delete",
  },
  columns: [
    { field: "kewarganegaraan", labelKey: "kewarganegaraan.kewarganegaraan", sortable: true, searchable: true },
  ],
  list: { defaultSort: "kewarganegaraan", perPage: 20 },
  form: {
    schema: kewarganegaraanSchema,
    layout: [{ tabKey: "umum", fields: ["kewarganegaraan"] }],
    fields: { kewarganegaraan: { type: "text", labelKey: "kewarganegaraan.kewarganegaraan" } },
  },
});
