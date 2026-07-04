import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type Item = components["schemas"]["Item"];
type NewItem = components["schemas"]["NewItem"];

// `country/state/city` opsional — demo field `cascade` (Task 6/7): tiga level
// dipilih berjenjang dari resource generik `regions` (country → state → city).
export const itemSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
});

export const itemsResource = defineResource<Item, NewItem, NewItem>({
  name: "items",
  path: "/items",
  api: createResourceApi<Item, NewItem, NewItem>({ resource: "items", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
  list: { defaultSort: "nama", perPage: 10 },
  // Contoh demo: `items` ikut scope global `workspace` supaya list-nya
  // terlihat refetch saat workspace picker diganti (lihat `resource-table.tsx`
  // & `resource-page.tsx`). Mock store `items` mengabaikan `scope[...]` yang
  // tak dikenalinya — aman, murni demo pengkabelan.
  scope: ["workspace"],
  form: {
    schema: itemSchema,
    // Tab terpisah "region" untuk field `cascade` demo — pseudo-key "region"
    // (bukan field zod sungguhan) murni pemicu render `CascadeField`; tiap
    // level (`country`/`state`/`city`) mendaftarkan field RHF-nya sendiri.
    layout: [
      { tabKey: "umum", fields: ["nama"] },
      { tabKey: "items.regionTab", fields: ["region"] },
    ],
    fields: {
      nama: { type: "text", labelKey: "items.nama" },
      region: {
        type: "cascade",
        labelKey: "items.region",
        cascade: [
          { key: "country", labelKey: "items.country", optionsFrom: "regions", parentParam: "parentId" },
          { key: "state", labelKey: "items.state", optionsFrom: "regions", parentParam: "parentId" },
          { key: "city", labelKey: "items.city", optionsFrom: "regions", parentParam: "parentId" },
        ],
      },
    },
  },
});
