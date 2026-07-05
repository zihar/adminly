import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["MenuMobile"];
type TNew = components["schemas"]["NewMenuMobile"];

export const menumobileSchema = z.object({
  kd_menu: z.string().min(1, "Wajib diisi"),
  menu: z.string().min(1, "Wajib diisi"),
  is_active: z.boolean().optional(),
  id_jns_mobile: z.coerce.number().optional(),
  seq: z.coerce.number().optional(),
});

export const menumobileResource = defineResource<T, TNew, TNew>({
  name: "menumobile",
  path: "/menumobile",
  api: createResourceApi<T, TNew, TNew>({ resource: "menumobile", path: "/menumobile" }),
  permissions: {
    view: "menumobile:view",
    create: "menumobile:create",
    update: "menumobile:update",
    delete: "menumobile:delete",
  },
  columns: [
    { field: "kd_menu", labelKey: "kd_menu" , sortable: true, searchable: true },
    { field: "menu", labelKey: "menu" , sortable: true, searchable: true },
    { field: "is_active", labelKey: "is_active" , render: "boolean" },
    { field: "id_jns_mobile", labelKey: "id_jns_mobile" },
    { field: "seq", labelKey: "seq" },
  ],
  list: { defaultSort: "menu", perPage: 20 },
  form: {
    schema: menumobileSchema,
    layout: [{ tabKey: "umum", fields: ["kd_menu", "menu", "is_active", "id_jns_mobile", "seq"] }],
    fields: {
      kd_menu: { type: "text", labelKey: "kd_menu" },
      menu: { type: "text", labelKey: "menu" },
      is_active: { type: "checkbox", labelKey: "is_active" },
      id_jns_mobile: { type: "number", labelKey: "id_jns_mobile" },
      seq: { type: "number", labelKey: "seq" },
    },
  },
});
