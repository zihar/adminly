import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["JenisProgram"];
type TNew = components["schemas"]["NewJenisProgram"];

export const jenisprogramSchema = z.object({
  jenis_program: z.string().min(1, "Wajib diisi"),
});

export const jenisprogramResource = defineResource<T, TNew, TNew>({
  name: "jenisprogram",
  path: "/jenisprogram",
  api: createResourceApi<T, TNew, TNew>({ resource: "jenisprogram", path: "/jenisprogram" }),
  permissions: {
    view: "jenisprogram:view",
    create: "jenisprogram:create",
    update: "jenisprogram:update",
    delete: "jenisprogram:delete",
  },
  columns: [
    { field: "jenis_program", labelKey: "jenisprogram.jenis_program", sortable: true, searchable: true },
  ],
  list: { defaultSort: "jenis_program", perPage: 20 },
  form: {
    schema: jenisprogramSchema,
    layout: [{ tabKey: "umum", fields: ["jenis_program"] }],
    fields: { jenis_program: { type: "text", labelKey: "jenisprogram.jenis_program" } },
  },
});
