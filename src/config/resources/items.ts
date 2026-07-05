import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type Item = components["schemas"]["Item"];
type NewItem = components["schemas"]["NewItem"];

// `country/state/city` opsional — demo field `cascade` (Task 6/7): tiga level
// dipilih berjenjang dari resource generik `regions` (country → state → city).
export const itemSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  // Status workflow (draft/submitted/approved/rejected) — opsional di form,
  // diisi/diubah lewat endpoint transisi, bukan lewat form biasa.
  status: z.string().optional(),
  // Demo field baru (Task 6) — menunjukkan tipe textarea/date/checkbox/select
  // dipakai nyata di form `items`. Semua opsional, ditaruh di tab terpisah
  // ("items.detailTab") supaya tak menambah <textbox> di tab default "umum"
  // (jaga e2e existing yang mengandalkan satu-satunya textbox = `nama`).
  catatan: z.string().optional(),
  tanggal: z.string().optional(),
  aktif: z.boolean().optional(),
  prioritas: z.string().optional(),
  // Demo field `file` (Task 5) — dropzone upload (Task 2) menyimpan URL hasil
  // unggah `/api/uploads` (Task 1) sebagai string, bukan isi file itu sendiri.
  lampiran: z.string().optional(),
});

export const itemsResource = defineResource<Item, NewItem, NewItem>({
  name: "items",
  path: "/items",
  api: createResourceApi<Item, NewItem, NewItem>({ resource: "items", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [
    { field: "nama", labelKey: "items.nama", sortable: true, searchable: true },
    // Kolom status workflow (Task 7) — dirender sebagai badge oleh `resource-table`
    // lewat lookup `def.workflow.statuses` (lihat komentar `render === "badge"` di sana).
    { field: "status", labelKey: "workflow.statusHeader", render: "badge" },
    // Demo kolom renderer baru (Task 6) — `render:"boolean"` menampilkan
    // label i18n common.yes/no alih-alih true/false mentah.
    { field: "aktif", labelKey: "items.aktif", render: "boolean" },
  ],
  // `filters: ["prioritas"]` — demo filter dropdown (Filter UI Task 1/2):
  // pakai opsi statis dari field form `prioritas` (lihat `form.fields.prioritas`).
  list: { defaultSort: "nama", perPage: 10, filters: ["prioritas"] },
  // Contoh demo: `items` ikut scope global `workspace` supaya list-nya
  // terlihat refetch saat workspace picker diganti (lihat `resource-table.tsx`
  // & `resource-page.tsx`). Mock store `items` mengabaikan `scope[...]` yang
  // tak dikenalinya — aman, murni demo pengkabelan.
  scope: ["workspace"],
  // Demo workflow (P3): draft -> submitted -> approved/rejected. `submit`
  // butuh `items:update` (Editor bisa ajukan), `approve`/`reject` butuh
  // `items:approve` (Admin saja — lihat ROLE_PERMISSIONS di rbac.ts).
  workflow: {
    field: "status",
    initial: "draft",
    statuses: [
      { value: "draft", labelKey: "workflow.status.draft", variant: "secondary" },
      { value: "submitted", labelKey: "workflow.status.submitted", variant: "default" },
      { value: "approved", labelKey: "workflow.status.approved", variant: "default" },
      { value: "rejected", labelKey: "workflow.status.rejected", variant: "destructive" },
    ],
    transitions: [
      { action: "submit", from: ["draft"], to: "submitted", permission: "items:update", labelKey: "workflow.action.submit" },
      { action: "approve", from: ["submitted"], to: "approved", permission: "items:approve", labelKey: "workflow.action.approve", variant: "default" },
      { action: "reject", from: ["submitted"], to: "rejected", permission: "items:approve", labelKey: "workflow.action.reject", variant: "destructive" },
    ],
  },
  form: {
    schema: itemSchema,
    // Tab terpisah "region" untuk field `cascade` demo — pseudo-key "region"
    // (bukan field zod sungguhan) murni pemicu render `CascadeField`; tiap
    // level (`country`/`state`/`city`) mendaftarkan field RHF-nya sendiri.
    layout: [
      { tabKey: "umum", fields: ["nama"] },
      // Tab terpisah untuk demo field baru (Task 6): textarea/date/checkbox/
      // select — lihat komentar `itemSchema` di atas soal alasan pemisahan tab.
      { tabKey: "items.detailTab", fields: ["catatan", "tanggal", "aktif", "prioritas", "lampiran"] },
      { tabKey: "items.regionTab", fields: ["region"] },
    ],
    fields: {
      nama: { type: "text", labelKey: "items.nama" },
      catatan: { type: "textarea", labelKey: "items.catatan" },
      tanggal: { type: "date", labelKey: "items.tanggal" },
      aktif: { type: "checkbox", labelKey: "items.aktif" },
      prioritas: {
        type: "select",
        labelKey: "items.prioritas",
        // Opsi statis (label sudah final, lihat komentar `select-field.tsx`).
        options: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
      // Demo field `file` (Task 5) — lihat komentar `itemSchema.lampiran` di atas.
      lampiran: { type: "file", labelKey: "items.lampiran", accept: "image/*" },
      region: {
        type: "cascade",
        labelKey: "items.region",
        cascade: [
          { key: "country", labelKey: "items.country", optionsFrom: "regions", parentParam: "parentId" },
          { key: "state", labelKey: "items.state", optionsFrom: "regions", parentParam: "parentId" },
          { key: "city", labelKey: "items.city", optionsFrom: "regions", parentParam: "parentId" },
        ],
      },
    },
  },
});
