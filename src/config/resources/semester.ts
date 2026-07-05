import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Semester"];
type TNew = components["schemas"]["NewSemester"];

export const semesterSchema = z.object({
  semester: z.string().min(1, "Wajib diisi"),
});

export const semesterResource = defineResource<T, TNew, TNew>({
  name: "semester",
  path: "/semester",
  api: createResourceApi<T, TNew, TNew>({ resource: "semester", path: "/semester" }),
  permissions: {
    view: "semester:view",
    create: "semester:create",
    update: "semester:update",
    delete: "semester:delete",
  },
  columns: [
    { field: "semester", labelKey: "semester.semester", sortable: true, searchable: true },
  ],
  list: { defaultSort: "semester", perPage: 20 },
  form: {
    schema: semesterSchema,
    layout: [{ tabKey: "umum", fields: ["semester"] }],
    fields: { semester: { type: "text", labelKey: "semester.semester" } },
  },
});
