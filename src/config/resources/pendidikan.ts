import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Pendidikan"];
type TNew = components["schemas"]["NewPendidikan"];

export const pendidikanSchema = z.object({
  pendidikan: z.string().min(1, "Wajib diisi"),
});

export const pendidikanResource = defineResource<T, TNew, TNew>({
  name: "pendidikan",
  path: "/pendidikan",
  api: createResourceApi<T, TNew, TNew>({ resource: "pendidikan", path: "/pendidikan" }),
  permissions: {
    view: "pendidikan:view",
    create: "pendidikan:create",
    update: "pendidikan:update",
    delete: "pendidikan:delete",
  },
  columns: [
    { field: "pendidikan", labelKey: "pendidikan.pendidikan", sortable: true, searchable: true },
  ],
  list: { defaultSort: "pendidikan", perPage: 20 },
  form: {
    schema: pendidikanSchema,
    layout: [{ tabKey: "umum", fields: ["pendidikan"] }],
    fields: { pendidikan: { type: "text", labelKey: "pendidikan.pendidikan" } },
  },
});
