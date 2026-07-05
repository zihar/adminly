import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type Agama = components["schemas"]["Agama"];
type NewAgama = components["schemas"]["NewAgama"];

// Resource referensi Edelweiss (F0-frontend): master agama, satu field text.
// Membuktikan lapisan CRUD adminly jalan terhadap backend Edelweiss nyata (edelweiss-api /agama).
export const agamaSchema = z.object({
  agama: z.string().min(1, "Agama wajib diisi").max(50),
});

export const agamaResource = defineResource<Agama, NewAgama, NewAgama>({
  name: "agama",
  path: "/agama",
  api: createResourceApi<Agama, NewAgama, NewAgama>({ resource: "agama", path: "/agama" }),
  permissions: {
    view: "agama:view",
    create: "agama:create",
    update: "agama:update",
    delete: "agama:delete",
  },
  columns: [{ field: "agama", labelKey: "agama.agama", sortable: true, searchable: true }],
  list: { defaultSort: "agama", perPage: 20 },
  form: {
    schema: agamaSchema,
    layout: [{ tabKey: "umum", fields: ["agama"] }],
    fields: { agama: { type: "text", labelKey: "agama.agama" } },
  },
});
