import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["SituasiBelajar"];
type TNew = components["schemas"]["NewSituasiBelajar"];

export const situasibelajarSchema = z.object({
  sts_belajar: z.string().min(1, "Wajib diisi"),
});

export const situasibelajarResource = defineResource<T, TNew, TNew>({
  name: "situasibelajar",
  path: "/situasibelajar",
  api: createResourceApi<T, TNew, TNew>({ resource: "situasibelajar", path: "/situasibelajar" }),
  permissions: {
    view: "situasibelajar:view",
    create: "situasibelajar:create",
    update: "situasibelajar:update",
    delete: "situasibelajar:delete",
  },
  columns: [
    { field: "sts_belajar", labelKey: "situasibelajar.sts_belajar", sortable: true, searchable: true },
  ],
  list: { defaultSort: "sts_belajar", perPage: 20 },
  form: {
    schema: situasibelajarSchema,
    layout: [{ tabKey: "umum", fields: ["sts_belajar"] }],
    fields: { sts_belajar: { type: "text", labelKey: "situasibelajar.sts_belajar" } },
  },
});
