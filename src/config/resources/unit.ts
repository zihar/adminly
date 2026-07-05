import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Unit"];
type TNew = components["schemas"]["NewUnit"];

export const unitSchema = z.object({
  unit: z.string().min(1, "Wajib diisi"),
});

export const unitResource = defineResource<T, TNew, TNew>({
  name: "unit",
  path: "/unit",
  api: createResourceApi<T, TNew, TNew>({ resource: "unit", path: "/unit" }),
  permissions: {
    view: "unit:view",
    create: "unit:create",
    update: "unit:update",
    delete: "unit:delete",
  },
  columns: [
    { field: "unit", labelKey: "unit.unit", sortable: true, searchable: true },
  ],
  list: { defaultSort: "unit", perPage: 20 },
  form: {
    schema: unitSchema,
    layout: [{ tabKey: "umum", fields: ["unit"] }],
    fields: { unit: { type: "text", labelKey: "unit.unit" } },
  },
});
