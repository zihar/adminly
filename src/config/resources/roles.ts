import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";

type Role = { id: number; name: string };
type NewRole = { name: string };

export const rolesSchema = z.object({ name: z.string().min(1, "Wajib diisi") });

export const rolesResource = defineResource<Role, NewRole, NewRole>({
  name: "roles",
  path: "/roles",
  api: createResourceApi<Role, NewRole, NewRole>({ resource: "roles", path: "/roles" }),
  permissions: { view: "roles:view", create: "roles:create", update: "roles:update", delete: "roles:delete" },
  columns: [{ field: "name", labelKey: "name", sortable: true, searchable: true }],
  list: { defaultSort: "name", perPage: 20 },
  form: {
    schema: rolesSchema,
    layout: [{ tabKey: "umum", fields: ["name"] }],
    fields: { name: { type: "text", labelKey: "name" } },
  },
});
