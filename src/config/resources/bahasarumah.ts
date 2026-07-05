import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["BahasaRumah"];
type TNew = components["schemas"]["NewBahasaRumah"];

export const bahasarumahSchema = z.object({
  bahasa_rumah: z.string().min(1, "Wajib diisi"),
});

export const bahasarumahResource = defineResource<T, TNew, TNew>({
  name: "bahasarumah",
  path: "/bahasarumah",
  api: createResourceApi<T, TNew, TNew>({ resource: "bahasarumah", path: "/bahasarumah" }),
  permissions: {
    view: "bahasarumah:view",
    create: "bahasarumah:create",
    update: "bahasarumah:update",
    delete: "bahasarumah:delete",
  },
  columns: [
    { field: "bahasa_rumah", labelKey: "bahasarumah.bahasa_rumah", sortable: true, searchable: true },
  ],
  list: { defaultSort: "bahasa_rumah", perPage: 20 },
  form: {
    schema: bahasarumahSchema,
    layout: [{ tabKey: "umum", fields: ["bahasa_rumah"] }],
    fields: { bahasa_rumah: { type: "text", labelKey: "bahasarumah.bahasa_rumah" } },
  },
});
