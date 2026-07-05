import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["JamBelajar"];
type TNew = components["schemas"]["NewJamBelajar"];

export const jambelajarSchema = z.object({
  jam_belajar: z.string().min(1, "Wajib diisi"),
  waktu_mulai: z.string().min(1, "Wajib diisi"),
  waktu_selesai: z.string().min(1, "Wajib diisi"),
});

export const jambelajarResource = defineResource<T, TNew, TNew>({
  name: "jambelajar",
  path: "/jambelajar",
  api: createResourceApi<T, TNew, TNew>({ resource: "jambelajar", path: "/jambelajar" }),
  permissions: {
    view: "jambelajar:view",
    create: "jambelajar:create",
    update: "jambelajar:update",
    delete: "jambelajar:delete",
  },
  columns: [
    { field: "jam_belajar", labelKey: "jam_belajar" , sortable: true, searchable: true },
    { field: "waktu_mulai", labelKey: "waktu_mulai" },
    { field: "waktu_selesai", labelKey: "waktu_selesai" },
  ],
  list: { defaultSort: "jam_belajar", perPage: 20 },
  form: {
    schema: jambelajarSchema,
    layout: [{ tabKey: "umum", fields: ["jam_belajar", "waktu_mulai", "waktu_selesai"] }],
    fields: {
      jam_belajar: { type: "text", labelKey: "jam_belajar" },
      waktu_mulai: { type: "text", labelKey: "waktu_mulai" },
      waktu_selesai: { type: "text", labelKey: "waktu_selesai" },
    },
  },
});
