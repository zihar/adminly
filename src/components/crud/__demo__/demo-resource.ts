import { z } from "zod";
import { http, HttpResponse } from "msw";
import { defineResource, type ResourceDef } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";

// Resource demo minimal khusus Storybook — self-contained (satu field teks),
// tak terhubung registry aplikasi. `path: "/items"` dipakai karena ia path yang
// valid di schema OpenAPI (agar tipe openapi-fetch cocok); `resource: "demo"`
// mengisolasi query key dari cache "items" nyata. labelKey memakai kunci i18n
// yang sudah ada (`items.nama` → "Name") supaya label ter-render rapi.
export type DemoRow = { id: string; nama: string };

const demoSchema = z.object({ nama: z.string().min(1, "Nama wajib diisi") });

// Di-erase ke `ResourceDef` (generik default `unknown`) — sama seperti def yang
// diterima komponen dari registry (`getResource`) di aplikasi nyata; `ResourceApi`
// bersifat invarian sehingga `ResourceDef<DemoRow>` tak assignable langsung.
export const demoResource = defineResource<DemoRow, DemoRow, DemoRow>({
  name: "demo",
  path: "/items",
  api: createResourceApi<DemoRow, DemoRow, DemoRow>({ resource: "demo", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
  list: { defaultSort: "nama", perPage: 10 },
  form: {
    schema: demoSchema,
    layout: [{ tabKey: "umum", fields: ["nama"] }],
    fields: { nama: { type: "text", labelKey: "items.nama" } },
  },
}) as unknown as ResourceDef;

export const demoRows: DemoRow[] = [
  { id: "1", nama: "Alpha" },
  { id: "2", nama: "Beta" },
  { id: "3", nama: "Gamma" },
];

// Handler MSW: apiClient di browser memakai baseUrl "/api" (lihat client.ts),
// jadi `useList` untuk path "/items" menembak "/api/items".
export const demoListHandlers = [
  http.get("/api/items", () =>
    HttpResponse.json({
      data: demoRows,
      meta: { total: demoRows.length, page: 1, per_page: 10 },
    }),
  ),
  http.get("/api/items/options", () =>
    HttpResponse.json(demoRows.map((r) => ({ value: r.id, label: r.nama }))),
  ),
];

export const demoEmptyHandlers = [
  http.get("/api/items", () =>
    HttpResponse.json({ data: [], meta: { total: 0, page: 1, per_page: 10 } }),
  ),
];

export const demoErrorHandlers = [
  http.get("/api/items", () =>
    HttpResponse.json({ message: "Kesalahan server" }, { status: 500 }),
  ),
];
