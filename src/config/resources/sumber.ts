import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Sumber"];
type TNew = components["schemas"]["NewSumber"];

export const sumberSchema = z.object({
  sumber: z.string().min(1, "Wajib diisi"),
});

export const sumberResource = defineResource<T, TNew, TNew>({
  name: "sumber",
  path: "/sumber",
  api: createResourceApi<T, TNew, TNew>({ resource: "sumber", path: "/sumber" }),
  permissions: {
    view: "sumber:view",
    create: "sumber:create",
    update: "sumber:update",
    delete: "sumber:delete",
  },
  columns: [
    { field: "sumber", labelKey: "sumber.sumber", sortable: true, searchable: true },
  ],
  list: { defaultSort: "sumber", perPage: 20 },
  form: {
    schema: sumberSchema,
    layout: [{ tabKey: "umum", fields: ["sumber"] }],
    fields: { sumber: { type: "text", labelKey: "sumber.sumber" } },
  },
});
