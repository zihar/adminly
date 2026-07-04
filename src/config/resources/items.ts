import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type Item = components["schemas"]["Item"];
type NewItem = components["schemas"]["NewItem"];

export const itemSchema = z.object({ nama: z.string().min(1, "Nama wajib diisi") });

export const itemsResource = defineResource<Item, NewItem, NewItem>({
  name: "items",
  path: "/items",
  api: createResourceApi<Item, NewItem, NewItem>({ resource: "items", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
  list: { defaultSort: "nama", perPage: 10 },
  form: { schema: itemSchema, layout: [{ tabKey: "umum", fields: ["nama"] }], fields: { nama: { type: "text", labelKey: "items.nama" } } },
});
