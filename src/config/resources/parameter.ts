import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Parameter"];
type TNew = components["schemas"]["NewParameter"];

export const parameterSchema = z.object({
  kd_param: z.string().min(1, "Wajib diisi"),
  id_jns_param: z.string().min(1, "Wajib diisi"),
  nama_param: z.string().min(1, "Wajib diisi"),
  value_1: z.string().optional(),
  value_2: z.string().optional(),
  value_3: z.string().optional(),
  value_html: z.string().optional(),
});

export const parameterResource = defineResource<T, TNew, TNew>({
  name: "parameter",
  path: "/parameter",
  api: createResourceApi<T, TNew, TNew>({ resource: "parameter", path: "/parameter" }),
  permissions: {
    view: "parameter:view",
    create: "parameter:create",
    update: "parameter:update",
    delete: "parameter:delete",
  },
  columns: [
    { field: "kd_param", labelKey: "kd_param" , sortable: true, searchable: true },
    { field: "id_jns_param", labelKey: "id_jns_param" , sortable: true, searchable: true },
    { field: "nama_param", labelKey: "nama_param" , sortable: true, searchable: true },
    { field: "value_1", labelKey: "value_1" , sortable: true, searchable: true },
    { field: "value_2", labelKey: "value_2" , sortable: true, searchable: true },
    { field: "value_3", labelKey: "value_3" , sortable: true, searchable: true },
    { field: "value_html", labelKey: "value_html" },
  ],
  list: { defaultSort: "nama_param", perPage: 20 },
  form: {
    schema: parameterSchema,
    layout: [{ tabKey: "umum", fields: ["kd_param", "id_jns_param", "nama_param", "value_1", "value_2", "value_3", "value_html"] }],
    fields: {
      kd_param: { type: "text", labelKey: "kd_param" },
      id_jns_param: { type: "text", labelKey: "id_jns_param" },
      nama_param: { type: "text", labelKey: "nama_param" },
      value_1: { type: "text", labelKey: "value_1" },
      value_2: { type: "text", labelKey: "value_2" },
      value_3: { type: "text", labelKey: "value_3" },
      value_html: { type: "richtext", labelKey: "value_html" },
    },
  },
});
