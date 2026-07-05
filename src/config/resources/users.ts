import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";

type User = { id: number; email: string; name: string; id_role: number; id_staff?: number | null };
type NewUser = { email: string; password: string; name: string; id_role: number; id_staff?: number };

export const usersSchema = z.object({
  email: z.string().email("Email tidak valid"),
  name: z.string().min(1, "Wajib diisi"),
  password: z.string().min(6, "Minimal 6 karakter"),
  id_role: z.coerce.number(),
  id_staff: z.coerce.number().optional(),
});

export const usersResource = defineResource<User, NewUser, NewUser>({
  name: "users",
  path: "/users",
  api: createResourceApi<User, NewUser, NewUser>({ resource: "users", path: "/users" }),
  permissions: { view: "users:view", create: "users:create", update: "users:update", delete: "users:delete" },
  columns: [
    { field: "email", labelKey: "email", sortable: true, searchable: true },
    { field: "name", labelKey: "name", sortable: true, searchable: true },
  ],
  list: { defaultSort: "email", perPage: 20 },
  form: {
    schema: usersSchema,
    layout: [{ tabKey: "umum", fields: ["email", "name", "password", "id_role", "id_staff"] }],
    fields: {
      email: { type: "text", labelKey: "email" },
      name: { type: "text", labelKey: "name" },
      password: { type: "text", labelKey: "password" },
      id_role: { type: "async-select", labelKey: "id_role", optionsFrom: "roles" },
      id_staff: { type: "async-select", labelKey: "id_staff", optionsFrom: "staff" },
    },
  },
});
