# Desain: Lapisan CRUD Generik adminly

- **Tanggal:** 2026-07-03
- **Status:** Draft — menunggu review user
- **Branch terkait:** `feat/tanstack-query-openapi` (fondasi data layer sudah ada)
- **Konteks pemicu:** membangun ulang sistem sekolah Edelweiss (~90 modul CRUD) di atas adminly. Lapisan ini generik (bukan khusus Edelweiss); Edelweiss = fork yang mengonfigurasinya.

## ⚠️ Asumsi yang diambil saat user away (konfirmasi ulang saat review)
1. **Arah data layer diselaraskan ke OpenAPI-first** (bukan abstraksi `DataProvider` terpisah). Ini **merevisi jawaban Q3** sebelumnya, karena kode di branch sudah OpenAPI-first (`openapi-fetch`) — spec mengikuti kode yang sudah ada.
2. **Bentuk response list = wrapper paginated** `{ data: T[], meta: { total, page, per_page } }`; endpoint objek tunggal tetap polos.

Jika salah satu asumsi ditolak, bagian §3–§4 perlu disesuaikan.

---

## 1. Tujuan & Non-Tujuan

**Tujuan:** menyediakan lapisan CRUD **config-driven** generik di adminly sehingga menambah modul cukup dengan satu `defineResource(...)` → tabel, form, route, nav, dan permission ter-generate otomatis, dengan **eject** untuk kasus non-standar. Dibangun **di atas fondasi yang sudah ada** (openapi-fetch typed client + TanStack Query + RSC prefetch), bukan menggantinya.

**Non-tujuan (spec terpisah nanti):** engine approval/workflow, import massal, export/PDF, UI non-standar (drag-drop kelas, kalender hari libur, rapor naratif), realtime/offline, dan aplikasi mobile.

**Kriteria sukses (definition of done):** tiga resource representatif terbukti jalan hanya lewat `defineResource` (+ eject bila perlu): `agama` (satu field), `siswa` (3 tab + relasi + cascade wilayah + file), `kehadiran`/`daftarnilai` (filter + scope tahun ajaran).

## 2. Keputusan Desain (ringkas)

| # | Keputusan | Sumber |
|---|---|---|
| D1 | Lapisan **generik** di adminly upstream; Edelweiss = fork | Q1 |
| D2 | **Hybrid**: auto-generate dari config, bisa **eject** per resource | Q2 |
| D3 | **OpenAPI-first** — generalisasi hooks di atas `openapi-fetch` + TanStack Query (revisi Q3) | Q3 + kode branch |
| D4 | **Core CRUD fokus**; workflow/import/PDF = spec lanjutan | Q4 |
| D5 | List = **wrapper paginated** `{data, meta}`; objek tunggal polos | asumsi |
| D6 | Rendering **RSC prefetch + hydrate** lalu tabel interaktif client | kode branch |

## 3. Arsitektur & Lapisan

```
┌─ UI Layer ───────────────────────────────────────────────┐
│  <ResourcePage> (auto dari registry, bisa di-eject)        │
│  <ResourceTable>   <ResourceForm> + field registry          │
├─ Resource Layer ─────────────────────────────────────────┤
│  defineResource({...}) → ResourceRegistry                   │
│  createResourceApi(cfg) → useList/useGetOne/useCreate/…     │
├─ Data Layer (SUDAH ADA di branch) ───────────────────────┤
│  apiClient = openapi-fetch<paths>  ·  TanStack Query        │
│  get-query-client (RSC/singleton)  ·  prefetch+hydrate      │
├─ Integrasi adminly (reuse) ──────────────────────────────┤
│  config/rbac (Permission, <Can>) · i18n by-key ·            │
│  config/site navMain · proxy.ts route guard · Sonner        │
└──────────────────────────────────────────────────────────┘
```

**Alur (halaman list):** Server Component `[resource]/page.tsx` **prefetch** `resourceApi.listQueryOptions(params)` → dehydrate → client `<ResourceTable>` `useList(params)` (TanStack Query) → `apiClient.GET(path, {params})` → buka wrapper `{data,meta}` → render. Aksi (create/edit/delete/bulk) digating `<Can>` → mutation optimistic + `invalidateQueries` + toast (pola persis `use-users.ts` yang sudah ada, digeneralisasi).

## 4. Data Layer — `createResourceApi`

Menggeneralisasi pola `src/hooks/api/use-users.ts` menjadi factory. Tetap memakai `apiClient` (`openapi-fetch`) yang sudah ada.

```ts
// src/lib/crud/create-resource-api.ts
type ResourceApiConfig<TItem, TNew, TUpdate> = {
  resource: string;         // "siswa" — dipakai untuk path & queryKey
  path: string;             // "/siswa" — path OpenAPI
  primaryKey?: string;      // default "id"
};

function createResourceApi<TItem, TNew, TUpdate>(cfg: ResourceApiConfig<...>) {
  const key = (suffix: unknown[] = []) => [cfg.resource, ...suffix] as const;
  return {
    listQueryOptions(params: ListParams) { /* queryOptions → GET path?query */ },
    useList(params: ListParams),          // { rows, total, ... }
    useGetOne(id),
    useCreate(),                          // optimistic + toast + invalidate
    useUpdate(),
    useRemove(),
    useRemoveMany(),                      // bulk
    useOptions(params: OptionParams),     // async-select + cascade (parent)
  };
}
```

**Params & querystring:** `ListParams { page, perPage, sort?, order?, q?, filters?, scope? }` → `GET /{path}?page=&per_page=&sort=&order=&q=&filter[x]=&scope[x]=`. `OptionParams { q?, parent? }` → `GET /{path}/options?q=&parent[x]=`.

**Kontrak backend (openapi.yaml):** tiap resource mengekspos `GET /{res}` (paginated `{data,meta}`), `GET /{res}/{id}`, `POST /{res}`, `PUT /{res}/{id}`, `DELETE /{res}/{id}`, `POST /{res}/bulk-delete`, `GET /{res}/options`. Backend (Go/Node) cukup memenuhi kontrak ini — **inilah seam backend-agnostik** (bukan lagi jawaban Go-vs-Node yang menentukan; keduanya sah).

**Trade-off tipe (penting):** `openapi-fetch` bertipe **per-path literal**, sedang factory generik memakai `path: string` dinamis → inferensi path-literal hilang. Resolusi: factory **generic atas tipe enttitas** (`TItem/TNew/TUpdate` diambil dari `components["schemas"][...]`), path dilewatkan sebagai string dengan boundary cast terkontrol di dalam factory. Tipe entitas tetap aman; hanya kecocokan path↔tipe yang tidak lagi dijamin compiler (ditutup uji unit). Alternatif (codegen hooks per-resource) dianggap YAGNI untuk v1.

**Error handling:** hasil `openapi-fetch` (`{data,error}`) + HTTP dinormalkan ke `CrudError { httpStatus, message, fieldErrors? }`. `422` → `fieldErrors` dipetakan ke `setError` RHF; `401` → redirect login (via middleware auth); `403` → UI "tidak berwenang"; `5xx`/tak dikenal → toast generik + retry. **Stack trace tak pernah sampai UI.**

**Auth:** tambahkan **middleware `openapi-fetch`** pada `apiClient` untuk menyuntik `Authorization: Bearer <token>` (token dari layer auth adminly) dan menangkap `401`. `apiClient` saat ini belum ber-auth — ini penambahan terhadap `src/lib/api/client.ts`.

## 5. Resource Definition — `defineResource`

Satu objek deklaratif per modul → sumber tunggal tabel/form/route/nav/permission. Terhubung ke i18n & RBAC via *key*.

```ts
defineResource({
  name: "siswa",
  primaryKey: "id_siswa",
  api: createResourceApi<Siswa, NewSiswa, UpdateSiswa>({ resource:"siswa", path:"/siswa" }),
  nav: { group:"kesiswaan", icon: Users, order: 10 },
  permissions: { view:"siswa:view", create:"siswa:create", update:"siswa:update", delete:"siswa:delete" },

  columns: [
    { field:"nis",  labelKey:"siswa.nis",  sortable:true },
    { field:"nama", labelKey:"siswa.nama", sortable:true, searchable:true },
    { field:"id_program", labelKey:"siswa.program", render:"relation", relation:"program" },
    { field:"foto", render:"image" },
  ],
  list: { defaultSort:"nama", perPage:20, filters:["id_tahun_ajaran","id_kelas"] },
  scope: ["id_tahun_ajaran"],

  form: {
    schema: siswaSchema,               // Zod → validasi + tipe (z.infer)
    layout: [
      { tabKey:"data_siswa", fields:["nis","nama","id_program","tgl_lahir","foto"] },
      { tabKey:"data_ortu",  fields:[/* ... */] },
    ],
    fields: {
      id_program:   { type:"async-select", optionsFrom:"program" },
      kd_kabupaten: { type:"async-select", optionsFrom:"wilayah", dependsOn:["kd_provinsi"] },
      tgl_lahir:    { type:"date" },
      foto:         { type:"file", accept:"image/*" },
    },
  },

  actions: ["create","edit","delete","bulkDelete"],  // + { key, icon, run } kustom
  components: { /* list?/form? kustom → eject */ },
})
```

**Registry:** semua `defineResource()` dikumpulkan di `src/config/resources/index.ts`. Dari situ terbentuk otomatis: **navMain** (extend `config/site.ts`), **Permission** RBAC (extend union `config/rbac.ts` + route-guard `proxy.ts`), dan resolusi renderer `[resource]/page.tsx`.

**Tipe field (registry awal):** `text, textarea, number, select, async-select (+dependsOn), date, datetime, checkbox, radio, file, richtext, hidden` — **extensible** oleh fork.
**Tipe render kolom:** `text, date, badge/status, relation(id→label), image, currency, boolean, custom(fn)`.

## 6. Komponen UI

- **`<ResourceTable>`** — TanStack Table (headless) + `ui/table`. Server-side: pagination, sort, search, filter (tiap filter = async-select), **column visibility**, **bulk-select** → `bulkDelete`. Toolbar dgn tombol Create (gated `<Can>`), bar aksi massal. State (page/sort/filter) **sinkron ke URL**. Loading = `ui/skeleton`; empty & error state baku.
- **`<ResourceForm>`** — React Hook Form + `zodResolver`. Edit: `useGetOne` → default values. Render `layout` (tab via `ui/tabs`) → `<FieldRenderer>`. Submit → `useCreate/useUpdate`; **422 → fieldErrors ke `setError`**; sukses → toast + navigate; guard "perubahan belum disimpan".
- **Field registry** (`components/crud/fields/*`) — map `type→komponen`, terima `control` RHF + meta. `async-select` = `useOptions` + debounce; `dependsOn` → refetch saat parent berubah & reset nilai (cascade).
- **`<ScopeProvider>`** — primitive generik: context scope global (mis. tahun ajaran/semester). `useScope()` → nilai aktif; `ResourceTable`/`Form` inject key `scope[]` ke params list & default tersembunyi form. Picker di shell (pola `role-switcher`/`locale-switcher`). adminly kirim primitive; fork konfigurasi key + picker.
- **`<ResourcePage>`** — perekat route dinamis `[resource]`: baca registry, cek permission (redirect bila tak berhak), **prefetch list (RSC) + hydrate**, render `PageHeader` + `ResourceTable`. Form create/edit = **halaman route ter-generate** (`/[resource]/create`, `/[resource]/[id]/edit`); resource kecil boleh modal.

## 7. Backend Mock & Testing

- **Mock backend** = pola yang sudah ada: **Next Route Handlers** (`src/app/api/{resource}/*`) + in-memory store (seperti `users-store.ts`), dipilih via `NEXT_PUBLIC_API_BASE_URL` kosong. Demo & test jalan tanpa backend nyata.
- **Vitest (unit):** `createResourceApi` (querystring, buka `{data,meta}`, normalisasi error → 422 fieldErrors), resolusi registry, tiap field registry, skema Zod.
- **Component:** `ResourceTable`/`ResourceForm` dgn mock (MSW atau Route Handler): sort/filter/paginate/bulk, submit + error mapping.
- **Playwright (e2e):** alur CRUD penuh terhadap mock.
- **Storybook:** field registry + state tabel/form (loading/empty/error) sebagai dokumentasi hidup.

## 8. Dependensi

- **Sudah ada:** `@tanstack/react-query`(+devtools), `openapi-fetch`, `openapi-typescript`, `sonner`, shadcn/ui.
- **Ditambah:** `@tanstack/react-table`, `react-hook-form`, `@hookform/resolvers`, `zod`. Opsional: `nuqs` (URL-state), `msw` (mock test).

## 9. Lokasi Folder

```
src/lib/api/            → client.ts (apiClient, +middleware auth), schema.d.ts   [ADA]
src/lib/query/          → get-query-client.ts                                    [ADA]
src/lib/crud/           → create-resource-api.ts, types.ts, errors.ts            [BARU]
src/config/resources/   → index.ts (registry) + <resource>.ts                    [BARU]
src/components/crud/     → resource-page, resource-table, resource-form, fields/* [BARU]
src/components/providers/→ scope-provider.tsx                                     [BARU]
src/app/(app)/[resource]/→ page.tsx, create/page.tsx, [id]/edit/page.tsx          [BARU]
src/app/api/<resource>/  → route handler mock (pola users-store)                  [BARU per resource]
```

## 10. Pertanyaan Terbuka
1. Konfirmasi 2 asumsi di atas (arah OpenAPI-first + wrapper paginated).
2. Sumber token auth di adminly (sesi/JWT) untuk middleware `apiClient` — saat ini role masih cookie demo.
3. Perlukah `nuqs` untuk URL-state, atau state tabel cukup di memori? (default: pakai `nuqs`).

---

*Catatan: `AGENTS.md` adminly memperingatkan Next.js 16 punya breaking changes — baca `node_modules/next/dist/docs/` sebelum implementasi.*
