import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { Region } from "@/app/api/regions/_data";

export const regionSchema = z.object({ name: z.string().min(1, "Nama wajib diisi") });

// Resource demo generik: sumber options berjenjang (country → state → city)
// untuk field bertipe `cascade`. Pakai ulang permission `items:*` supaya
// tidak perlu menambah entri baru ke union `Permission` (RBAC) — `regions`
// murni contoh sumber opsi, bukan resource bisnis nyata.
export const regionsResource = defineResource<Region, Region, Region>({
  name: "regions",
  path: "/regions",
  api: createResourceApi<Region, Region, Region>({ resource: "regions", path: "/regions" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "name", labelKey: "regions.name", sortable: true, searchable: true }],
  list: { defaultSort: "name", perPage: 20 },
  form: {
    schema: regionSchema,
    layout: [{ tabKey: "umum", fields: ["name"] }],
    fields: { name: { type: "text", labelKey: "regions.name" } },
  },
});
