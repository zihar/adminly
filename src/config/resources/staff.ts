import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";

type Staff = {
  id: number;
  nama: string;
  nip?: string | null;
  email?: string | null;
  id_unit?: number | null;
  id_spv?: number | null;
};
type NewStaff = { nama: string; nip?: string; email?: string; id_unit?: number; id_spv?: number };

export const staffSchema = z.object({
  nama: z.string().min(1, "Wajib diisi"),
  nip: z.string().optional(),
  email: z.string().optional(),
  id_unit: z.coerce.number().optional(),
  id_spv: z.coerce.number().optional(),
});

export const staffResource = defineResource<Staff, NewStaff, NewStaff>({
  name: "staff",
  path: "/staff",
  api: createResourceApi<Staff, NewStaff, NewStaff>({ resource: "staff", path: "/staff" }),
  permissions: { view: "staff:view", create: "staff:create", update: "staff:update", delete: "staff:delete" },
  columns: [
    { field: "nama", labelKey: "nama", sortable: true, searchable: true },
    { field: "nip", labelKey: "nip" },
    { field: "email", labelKey: "email" },
  ],
  list: { defaultSort: "nama", perPage: 20 },
  form: {
    schema: staffSchema,
    layout: [{ tabKey: "umum", fields: ["nama", "nip", "email", "id_unit", "id_spv"] }],
    fields: {
      nama: { type: "text", labelKey: "nama" },
      nip: { type: "text", labelKey: "nip" },
      email: { type: "text", labelKey: "email" },
      id_unit: { type: "async-select", labelKey: "id_unit", optionsFrom: "unit" },
      id_spv: { type: "async-select", labelKey: "id_spv", optionsFrom: "staff" },
    },
  },
});
