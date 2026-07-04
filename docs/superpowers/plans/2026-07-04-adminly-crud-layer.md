# Lapisan CRUD Generik adminly — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun lapisan CRUD generik config-driven di adminly (`defineResource` → tabel/form/route/nav/permission otomatis) di atas fondasi OpenAPI-first + TanStack Query yang sudah ada, dengan escape-hatch (eject).

**Architecture:** `openapi-fetch` typed client (ada) → factory `createResourceApi` (generalisasi hooks) → `ResourceRegistry` (`defineResource`) → komponen UI (`ResourceTable`/`ResourceForm`/field registry/`ScopeProvider`/`ResourcePage`). Rendering RSC prefetch+hydrate lalu tabel interaktif client. Backend-agnostik via kontrak `openapi.yaml`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (Base UI), TanStack Query v5, TanStack Table v8, React Hook Form + Zod, openapi-fetch/openapi-typescript, Sonner, Vitest, MSW, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-03-adminly-crud-layer-design.md`

## Global Constraints

- Next.js 16 punya breaking changes — baca `node_modules/next/dist/docs/` sebelum menulis kode Next-spesifik (per `AGENTS.md`).
- Data layer OpenAPI-first: semua akses data lewat `apiClient` (`openapi-fetch`) + TanStack Query. Jangan `fetch` langsung di komponen.
- Response list = wrapper paginated `{ data: T[], meta: { total, page, per_page } }`; endpoint objek tunggal tetap polos.
- RBAC via union `Permission` (`src/config/rbac.ts`) + `<Can>`. i18n by-key (`t.*`). Jangan hardcode label.
- Query client per-request di server, singleton di browser (`src/lib/query/get-query-client.ts` — sudah ada).
- Test framework: **Vitest** + **@testing-library/react** + **MSW**. Commit tiap task lulus.
- Toast: **Sonner** (`import { toast } from "sonner"`).

---

## Prasyarat: Tooling Test

### Task 0: Setup dependensi & Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/lib/crud/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: skrip `npm test`; alias `@/` di test; MSW siap dipakai.

- [ ] **Step 1: Pasang dependensi runtime & dev**

Run:
```bash
cd /Users/zihar/Projects/adminly
npm i @tanstack/react-table react-hook-form @hookform/resolvers zod nuqs
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw
```
Expected: terpasang tanpa error peer-dep fatal (React 19 didukung).

- [ ] **Step 2: Tambah skрip test**

Di `package.json` bagian `"scripts"`, tambahkan:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Tulis `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
```

- [ ] **Step 4: Tulis `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Tulis smoke test**

`src/lib/crud/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("tooling", () => {
  it("menjalankan test", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Jalankan & pastikan lulus**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts src/lib/crud/__tests__/smoke.test.ts
git commit -m "chore: setup vitest + dependensi lapisan CRUD"
```

---

## Task 1: Tipe inti & normalisasi error

**Files:**
- Create: `src/lib/crud/types.ts`
- Create: `src/lib/crud/errors.ts`
- Test: `src/lib/crud/__tests__/errors.test.ts`

**Interfaces:**
- Produces:
  - `type ID = string | number`
  - `type ListParams = { page: number; perPage: number; sort?: string; order?: "asc"|"desc"; q?: string; filters?: Record<string, unknown>; scope?: Record<string, unknown> }`
  - `type OptionParams = { q?: string; parent?: Record<string, ID> }`
  - `type ListResult<T> = { rows: T[]; total: number; page: number; perPage: number }`
  - `type Option = { value: ID; label: string }`
  - `class CrudError extends Error { httpStatus: number; fieldErrors?: Record<string,string[]> }`
  - `function normalizeError(httpStatus: number, body: unknown): CrudError`
  - `function buildListSearchParams(params: ListParams): URLSearchParams`

- [ ] **Step 1: Tulis test error + querystring**

`src/lib/crud/__tests__/errors.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeError, buildListSearchParams, CrudError } from "@/lib/crud/errors";

describe("normalizeError", () => {
  it("memetakan 422 ke fieldErrors", () => {
    const e = normalizeError(422, { code: "99", status: "error", message: "Validasi gagal", errors: { nama: ["wajib diisi"] } });
    expect(e).toBeInstanceOf(CrudError);
    expect(e.httpStatus).toBe(422);
    expect(e.fieldErrors).toEqual({ nama: ["wajib diisi"] });
  });

  it("pakai pesan generik untuk 500 tanpa membocorkan body", () => {
    const e = normalizeError(500, { message: "SQLSTATE... /home/app/vendor/laravel" });
    expect(e.httpStatus).toBe(500);
    expect(e.message).toBe("Terjadi kesalahan pada server. Coba lagi.");
    expect(e.fieldErrors).toBeUndefined();
  });
});

describe("buildListSearchParams", () => {
  it("menyusun query pagination/sort/search/filter/scope", () => {
    const sp = buildListSearchParams({
      page: 2, perPage: 20, sort: "nama", order: "asc", q: "budi",
      filters: { id_kelas: 18 }, scope: { id_tahun_ajaran: 2 },
    });
    expect(sp.get("page")).toBe("2");
    expect(sp.get("per_page")).toBe("20");
    expect(sp.get("sort")).toBe("nama");
    expect(sp.get("order")).toBe("asc");
    expect(sp.get("q")).toBe("budi");
    expect(sp.get("filter[id_kelas]")).toBe("18");
    expect(sp.get("scope[id_tahun_ajaran]")).toBe("2");
  });

  it("melewati nilai kosong/undefined", () => {
    const sp = buildListSearchParams({ page: 1, perPage: 10, filters: { x: "" , y: undefined } });
    expect(sp.has("filter[x]")).toBe(false);
    expect(sp.has("filter[y]")).toBe(false);
  });
});
```

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/lib/crud/__tests__/errors.test.ts`
Expected: FAIL (modul `errors` belum ada).

- [ ] **Step 3: Tulis `src/lib/crud/types.ts`**

```ts
export type ID = string | number;

export type ListParams = {
  page: number;
  perPage: number;
  sort?: string;
  order?: "asc" | "desc";
  q?: string;
  filters?: Record<string, unknown>;
  scope?: Record<string, unknown>;
};

export type OptionParams = { q?: string; parent?: Record<string, ID> };

export type ListResult<T> = { rows: T[]; total: number; page: number; perPage: number };

export type Option = { value: ID; label: string };

/** Envelope list dari backend: { data, meta }. */
export type ListEnvelope<T> = { data: T[]; meta: { total: number; page: number; per_page: number } };

/** Envelope error opsional dari backend. */
export type ErrorEnvelope = { code?: string; status?: string; message?: string; errors?: Record<string, string[]> };
```

- [ ] **Step 4: Tulis `src/lib/crud/errors.ts`**

```ts
import type { ListParams, ErrorEnvelope } from "@/lib/crud/types";

export class CrudError extends Error {
  httpStatus: number;
  fieldErrors?: Record<string, string[]>;
  constructor(httpStatus: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "CrudError";
    this.httpStatus = httpStatus;
    this.fieldErrors = fieldErrors;
  }
}

const GENERIC = "Terjadi kesalahan pada server. Coba lagi.";

/** Normalkan error backend/HTTP → CrudError; tak pernah bocorkan detail server pada 5xx. */
export function normalizeError(httpStatus: number, body: unknown): CrudError {
  const env = (body ?? {}) as ErrorEnvelope;
  if (httpStatus === 422) {
    return new CrudError(422, env.message || "Validasi gagal", env.errors);
  }
  if (httpStatus >= 500) {
    return new CrudError(httpStatus, GENERIC);
  }
  return new CrudError(httpStatus, env.message || GENERIC);
}

/** Susun querystring list dari ListParams (skip nilai kosong/undefined/null). */
export function buildListSearchParams(params: ListParams): URLSearchParams {
  const sp = new URLSearchParams();
  const put = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  };
  put("page", params.page);
  put("per_page", params.perPage);
  put("sort", params.sort);
  put("order", params.order);
  put("q", params.q);
  for (const [k, v] of Object.entries(params.filters ?? {})) put(`filter[${k}]`, v);
  for (const [k, v] of Object.entries(params.scope ?? {})) put(`scope[${k}]`, v);
  return sp;
}
```

- [ ] **Step 5: Jalankan test → lulus**

Run: `npm test src/lib/crud/__tests__/errors.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crud/types.ts src/lib/crud/errors.ts src/lib/crud/__tests__/errors.test.ts
git commit -m "feat: tipe inti CRUD + normalisasi error & querystring"
```

---

## Task 2: Factory `createResourceApi`

**Files:**
- Create: `src/lib/crud/create-resource-api.ts`
- Test: `src/lib/crud/__tests__/create-resource-api.test.ts`

**Interfaces:**
- Consumes: `ListParams, OptionParams, ListResult, Option` (Task 1); `normalizeError, buildListSearchParams` (Task 1); `apiClient` (`src/lib/api/client.ts`, ada).
- Produces:
  - `createResourceApi<TItem, TNew, TUpdate>(cfg: { resource: string; path: string; primaryKey?: string }): ResourceApi<TItem, TNew, TUpdate>`
  - `ResourceApi` punya: `keys` (queryKey helpers), `listQueryOptions(params)`, `useList(params)`, `getOneQueryOptions(id)`, `useGetOne(id)`, `useCreate()`, `useUpdate()`, `useRemove()`, `useRemoveMany()`, `useOptions(params)`.

Catatan tipe: `apiClient` (openapi-fetch) bertipe per-path. Factory memakai path dinamis, jadi panggilan dibungkus helper `request()` yang memakai `apiClient.GET/POST/...` dengan `path as never` di boundary; tipe entitas (`TItem` dst.) tetap dijaga lewat generik. Ini trade-off yang didokumentasikan di spec §4.

- [ ] **Step 1: Tulis test factory (querystring, unwrap, optimistic) dengan MSW**

`src/lib/crud/__tests__/create-resource-api.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import { createResourceApi } from "@/lib/crud/create-resource-api";

type Item = { id: string; nama: string };

const server = setupServer(
  http.get("http://localhost:3000/api/items", ({ request }) => {
    const url = new URL(request.url);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("per_page")).toBe("10");
    return HttpResponse.json({ data: [{ id: "1", nama: "A" }], meta: { total: 1, page: 1, per_page: 10 } });
  }),
);

beforeAll(() => { process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api"; server.listen(); });
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("createResourceApi.useList", () => {
  it("mengambil list & membuka wrapper {data,meta}", async () => {
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useList({ page: 1, perPage: 10 }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ rows: [{ id: "1", nama: "A" }], total: 1, page: 1, perPage: 10 });
  });
});
```

> Catatan: `apiClient` membaca base URL saat impor. Test menyetel `NEXT_PUBLIC_API_BASE_URL` sebelum `server.listen()`; karena `client.ts` mengevaluasi `resolveBaseUrl()` saat modul dimuat, gunakan `vi.resetModules()` bila perlu impor ulang. Bila timing bermasalah, ubah `client.ts` agar `baseUrl` dibaca lewat fungsi (lihat Task 2 Step 3 catatan).

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/lib/crud/__tests__/create-resource-api.test.ts`
Expected: FAIL (`createResourceApi` belum ada).

- [ ] **Step 3: Tulis `src/lib/crud/create-resource-api.ts`**

```ts
import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import { buildListSearchParams, normalizeError } from "@/lib/crud/errors";
import type {
  ID, ListParams, OptionParams, ListResult, Option, ListEnvelope,
} from "@/lib/crud/types";

type Cfg = { resource: string; path: string; primaryKey?: string };

/** Panggilan HTTP bertipe entitas; path dinamis → cast di boundary (lihat spec §4). */
async function req<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, opts?: { body?: unknown }): Promise<{ data?: T; res: Response }> {
  const fn = (apiClient as unknown as Record<string, Function>)[method];
  const { data, error, response } = await fn(path as never, opts?.body !== undefined ? { body: opts.body } : {});
  if (error || !response.ok) {
    let body: unknown = error;
    throw normalizeError(response.status, body);
  }
  return { data: data as T, res: response };
}

export function createResourceApi<TItem, TNew = Partial<TItem>, TUpdate = Partial<TItem>>(cfg: Cfg) {
  const pk = cfg.primaryKey ?? "id";
  const base = cfg.path.replace(/\/$/, "");
  const keys = {
    all: [cfg.resource] as const,
    list: (params: ListParams) => [cfg.resource, "list", params] as const,
    one: (id: ID) => [cfg.resource, "one", id] as const,
    options: (params: OptionParams) => [cfg.resource, "options", params] as const,
  };

  function listQueryOptions(params: ListParams) {
    return queryOptions({
      queryKey: keys.list(params),
      queryFn: async (): Promise<ListResult<TItem>> => {
        const qs = buildListSearchParams(params).toString();
        const { data } = await req<ListEnvelope<TItem>>("GET", `${base}?${qs}`);
        const env = data!;
        return { rows: env.data, total: env.meta.total, page: env.meta.page, perPage: env.meta.per_page };
      },
    });
  }

  function getOneQueryOptions(id: ID) {
    return queryOptions({
      queryKey: keys.one(id),
      queryFn: async () => (await req<TItem>("GET", `${base}/${id}`)).data!,
    });
  }

  const useList = (params: ListParams) => useQuery(listQueryOptions(params));
  const useGetOne = (id: ID) => useQuery(getOneQueryOptions(id));

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (values: TNew) => (await req<TItem>("POST", base, { body: values })).data!,
      onSuccess: () => { toast.success("Data tersimpan"); qc.invalidateQueries({ queryKey: keys.all }); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan"),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, values }: { id: ID; values: TUpdate }) =>
        (await req<TItem>("PUT", `${base}/${id}`, { body: values })).data!,
      onSuccess: (_d, v) => { toast.success("Perubahan tersimpan"); qc.invalidateQueries({ queryKey: keys.all }); qc.invalidateQueries({ queryKey: keys.one(v.id) }); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menyimpan"),
    });
  }

  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: ID) => { await req<void>("DELETE", `${base}/${id}`); },
      onSuccess: () => { toast.success("Data dihapus"); qc.invalidateQueries({ queryKey: keys.all }); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus"),
    });
  }

  function useRemoveMany() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (ids: ID[]) => { await req<void>("POST", `${base}/bulk-delete`, { body: { ids } }); },
      onSuccess: () => { toast.success("Data terpilih dihapus"); qc.invalidateQueries({ queryKey: keys.all }); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal menghapus"),
    });
  }

  function useOptions(params: OptionParams) {
    return useQuery({
      queryKey: keys.options(params),
      queryFn: async (): Promise<Option[]> => {
        const sp = new URLSearchParams();
        if (params.q) sp.set("q", params.q);
        for (const [k, v] of Object.entries(params.parent ?? {})) sp.set(`parent[${k}]`, String(v));
        return (await req<Option[]>("GET", `${base}/options?${sp.toString()}`)).data ?? [];
      },
      enabled: params.parent ? Object.values(params.parent).every((v) => v !== undefined && v !== null && v !== "") : true,
    });
  }

  return { pk, keys, listQueryOptions, useList, getOneQueryOptions, useGetOne, useCreate, useUpdate, useRemove, useRemoveMany, useOptions };
}

export type ResourceApi<TItem, TNew = Partial<TItem>, TUpdate = Partial<TItem>> = ReturnType<typeof createResourceApi<TItem, TNew, TUpdate>>;
```

> Catatan `client.ts`: bila test Step 1 gagal karena base URL dibaca saat impor, ubah `src/lib/api/client.ts` agar mengekspor `apiClient` yang dibuat lazily (mis. `createClient({ baseUrl: resolveBaseUrl() })` tetap, tetapi test memakai `vi.resetModules()` + `await import`). Jangan ubah perilaku produksi.

- [ ] **Step 4: Jalankan test → lulus**

Run: `npm test src/lib/crud/__tests__/create-resource-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crud/create-resource-api.ts src/lib/crud/__tests__/create-resource-api.test.ts
git commit -m "feat: factory createResourceApi (list/getOne/create/update/remove/options)"
```

---

## Task 3: Kontrak OpenAPI paginated + mock Route Handler generik

**Files:**
- Modify: `openapi.yaml`
- Modify: `src/lib/api/schema.d.ts` (via `npm run gen:api`)
- Create: `src/app/api/_store/collection-store.ts`
- Create: `src/app/api/items/route.ts`
- Create: `src/app/api/items/[id]/route.ts`
- Create: `src/app/api/items/bulk-delete/route.ts`
- Create: `src/app/api/items/options/route.ts`
- Test: `src/app/api/items/__tests__/items-route.test.ts`

**Interfaces:**
- Consumes: pola `users-store.ts` (ada).
- Produces: resource demo `items` yang memenuhi kontrak list-paginated + CRUD + bulk-delete + options; komponen `PaginatedList` di `openapi.yaml`; store generik `createCollectionStore<T>()`.

- [ ] **Step 1: Tambah schema paginated + path `items` ke `openapi.yaml`**

Tambahkan di `components.schemas`:
```yaml
    Item:
      type: object
      required: [id, nama]
      properties:
        id: { type: string }
        nama: { type: string }
    NewItem:
      type: object
      required: [nama]
      properties:
        nama: { type: string }
    ItemList:
      type: object
      required: [data, meta]
      properties:
        data: { type: array, items: { $ref: "#/components/schemas/Item" } }
        meta:
          type: object
          required: [total, page, per_page]
          properties:
            total: { type: integer }
            page: { type: integer }
            per_page: { type: integer }
    Option:
      type: object
      required: [value, label]
      properties:
        value: { type: string }
        label: { type: string }
```
Tambahkan `paths`:
```yaml
  /items:
    get:
      parameters:
        - { name: page, in: query, schema: { type: integer } }
        - { name: per_page, in: query, schema: { type: integer } }
        - { name: q, in: query, schema: { type: string } }
      responses:
        "200":
          content: { application/json: { schema: { $ref: "#/components/schemas/ItemList" } } }
    post:
      requestBody:
        content: { application/json: { schema: { $ref: "#/components/schemas/NewItem" } } }
      responses:
        "201":
          content: { application/json: { schema: { $ref: "#/components/schemas/Item" } } }
  /items/{id}:
    get:
      parameters: [ { name: id, in: path, required: true, schema: { type: string } } ]
      responses:
        "200": { content: { application/json: { schema: { $ref: "#/components/schemas/Item" } } } }
    put:
      parameters: [ { name: id, in: path, required: true, schema: { type: string } } ]
      requestBody:
        content: { application/json: { schema: { $ref: "#/components/schemas/NewItem" } } }
      responses:
        "200": { content: { application/json: { schema: { $ref: "#/components/schemas/Item" } } } }
    delete:
      parameters: [ { name: id, in: path, required: true, schema: { type: string } } ]
      responses: { "204": { description: No Content } }
  /items/bulk-delete:
    post:
      requestBody:
        content: { application/json: { schema: { type: object, properties: { ids: { type: array, items: { type: string } } } } } }
      responses: { "204": { description: No Content } }
  /items/options:
    get:
      parameters: [ { name: q, in: query, schema: { type: string } } ]
      responses:
        "200": { content: { application/json: { schema: { type: array, items: { $ref: "#/components/schemas/Option" } } } } }
```

- [ ] **Step 2: Regenerate tipe**

Run: `npm run gen:api`
Expected: `src/lib/api/schema.d.ts` terupdate, memuat `Item`, `ItemList`, `Option`.

- [ ] **Step 3: Tulis store generik `src/app/api/_store/collection-store.ts`**

```ts
export function createCollectionStore<T extends { id: string }>(seed: T[]) {
  let rows: T[] = [...seed];
  return {
    list({ page = 1, perPage = 10, q = "" }: { page?: number; perPage?: number; q?: string }) {
      const filtered = q
        ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
        : rows;
      const start = (page - 1) * perPage;
      return { data: filtered.slice(start, start + perPage), meta: { total: filtered.length, page, per_page: perPage } };
    },
    get(id: string) { return rows.find((r) => r.id === id) ?? null; },
    create(row: T) { rows = [row, ...rows]; return row; },
    update(id: string, patch: Partial<T>) {
      rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
      return this.get(id);
    },
    remove(id: string) { rows = rows.filter((r) => r.id !== id); },
    removeMany(ids: string[]) { rows = rows.filter((r) => !ids.includes(r.id)); },
  };
}
```

- [ ] **Step 4: Tulis Route Handlers `items` (GET/POST, [id] GET/PUT/DELETE, bulk-delete, options)**

`src/app/api/items/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { itemsStore } from "@/app/api/items/_data";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const perPage = Number(sp.get("per_page") ?? "10");
  const q = sp.get("q") ?? "";
  return NextResponse.json(itemsStore.list({ page, perPage, q }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const created = itemsStore.create({ id: `itm-${Date.now()}`, ...body });
  return NextResponse.json(created, { status: 201 });
}
```
`src/app/api/items/_data.ts`:
```ts
import { createCollectionStore } from "@/app/api/_store/collection-store";
export type ItemRow = { id: string; nama: string };
export const itemsStore = createCollectionStore<ItemRow>([
  { id: "itm-1", nama: "Contoh A" },
  { id: "itm-2", nama: "Contoh B" },
]);
```
`src/app/api/items/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { itemsStore } from "@/app/api/items/_data";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = itemsStore.get(id);
  return row ? NextResponse.json(row) : NextResponse.json({ message: "Tidak ditemukan" }, { status: 404 });
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = itemsStore.update(id, await req.json());
  return row ? NextResponse.json(row) : NextResponse.json({ message: "Tidak ditemukan" }, { status: 404 });
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  itemsStore.remove(id);
  return new NextResponse(null, { status: 204 });
}
```
`src/app/api/items/bulk-delete/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { itemsStore } from "@/app/api/items/_data";
export async function POST(req: NextRequest) {
  const { ids } = await req.json();
  itemsStore.removeMany(ids ?? []);
  return new NextResponse(null, { status: 204 });
}
```
`src/app/api/items/options/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { itemsStore } from "@/app/api/items/_data";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const { data } = itemsStore.list({ page: 1, perPage: 1000, q });
  return NextResponse.json(data.map((r) => ({ value: r.id, label: r.nama })));
}
```

> Catatan Next 16: signature `params` adalah `Promise` (App Router terbaru) — `await params`. Verifikasi di `node_modules/next/dist/docs/` bila berbeda.

- [ ] **Step 5: Tulis test route (unit, panggil handler langsung)**

`src/app/api/items/__tests__/items-route.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/items/route";

describe("items route", () => {
  it("GET mengembalikan wrapper paginated", async () => {
    const res = await GET(new NextRequest("http://localhost/api/items?page=1&per_page=10"));
    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(json.meta).toMatchObject({ page: 1, per_page: 10 });
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("POST membuat item baru (201)", async () => {
    const res = await POST(new NextRequest("http://localhost/api/items", { method: "POST", body: JSON.stringify({ nama: "Baru" }) }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.nama).toBe("Baru");
  });
});
```

- [ ] **Step 6: Jalankan test → lulus**

Run: `npm test src/app/api/items`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add openapi.yaml src/lib/api/schema.d.ts src/app/api/_store src/app/api/items
git commit -m "feat: kontrak OpenAPI paginated + mock Route Handler generik (items)"
```

---

## Task 4: `defineResource` + ResourceRegistry

**Files:**
- Create: `src/lib/crud/define-resource.ts`
- Create: `src/config/resources/index.ts`
- Create: `src/config/resources/items.ts`
- Test: `src/lib/crud/__tests__/define-resource.test.ts`

**Interfaces:**
- Consumes: `ResourceApi` (Task 2); `Permission` (`src/config/rbac.ts`).
- Produces:
  - `type ColumnDef = { field: string; labelKey: string; sortable?: boolean; searchable?: boolean; render?: "text"|"date"|"badge"|"relation"|"image"|"currency"|"boolean"; relation?: string }`
  - `type FieldMeta = { type: FieldType; optionsFrom?: string; dependsOn?: string[]; accept?: string; labelKey?: string }`
  - `type ResourceDef<TItem, TNew, TUpdate>` (lihat kode)
  - `defineResource(def): ResourceDef` (identity + validasi ringan)
  - `registerResources(list)` / `getResource(name)` / `allResources()`

- [ ] **Step 1: Tulis test registry**

`src/lib/crud/__tests__/define-resource.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { defineResource } from "@/lib/crud/define-resource";
import { registerResources, getResource, allResources, _resetRegistry } from "@/config/resources/index";
import { createResourceApi } from "@/lib/crud/create-resource-api";

const itemDef = defineResource({
  name: "items", path: "/items",
  api: createResourceApi({ resource: "items", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
  form: { schema: undefined as never, layout: [{ tabKey: "umum", fields: ["nama"] }], fields: { nama: { type: "text" } } },
});

describe("resource registry", () => {
  beforeEach(() => _resetRegistry());
  it("mendaftar & mengambil resource by name", () => {
    registerResources([itemDef]);
    expect(getResource("items")?.name).toBe("items");
    expect(allResources()).toHaveLength(1);
  });
  it("getResource mengembalikan undefined utk nama tak dikenal", () => {
    registerResources([itemDef]);
    expect(getResource("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/lib/crud/__tests__/define-resource.test.ts`
Expected: FAIL.

- [ ] **Step 3: Tulis `src/lib/crud/define-resource.ts`**

```ts
import type { LucideIcon } from "lucide-react";
import type { ZodType } from "zod";
import type { Permission } from "@/config/rbac";
import type { ResourceApi } from "@/lib/crud/create-resource-api";

export type FieldType =
  | "text" | "textarea" | "number" | "select" | "async-select"
  | "date" | "datetime" | "checkbox" | "radio" | "file" | "richtext" | "hidden";

export type ColumnRender = "text" | "date" | "badge" | "relation" | "image" | "currency" | "boolean";

export type ColumnDef = {
  field: string;
  labelKey: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: ColumnRender;
  relation?: string;
};

export type FieldMeta = {
  type: FieldType;
  labelKey?: string;
  optionsFrom?: string;      // nama resource sumber options
  dependsOn?: string[];      // field induk (cascade)
  accept?: string;           // untuk file
  options?: { value: string | number; label: string }[]; // untuk select statis
};

export type FormDef = {
  schema: ZodType<unknown>;
  layout: { tabKey: string; fields: string[] }[];
  fields: Record<string, FieldMeta>;
};

export type ResourceDef<TItem = unknown, TNew = unknown, TUpdate = unknown> = {
  name: string;
  path: string;
  primaryKey?: string;
  api: ResourceApi<TItem, TNew, TUpdate>;
  nav?: { group?: string; icon?: LucideIcon; order?: number };
  permissions: { view: Permission; create: Permission; update: Permission; delete: Permission };
  columns: ColumnDef[];
  list?: { defaultSort?: string; perPage?: number; filters?: string[] };
  scope?: string[];
  form: FormDef;
  actions?: (string | { key: string; icon?: LucideIcon; run: (id: string | number) => void })[];
  components?: { list?: React.ComponentType<{ def: ResourceDef }>; form?: React.ComponentType<{ def: ResourceDef; id?: string }> };
};

/** Identity + validasi ringan (nama unik dijaga di registry). */
export function defineResource<TItem, TNew = Partial<TItem>, TUpdate = Partial<TItem>>(
  def: ResourceDef<TItem, TNew, TUpdate>,
): ResourceDef<TItem, TNew, TUpdate> {
  if (!def.name) throw new Error("Resource wajib punya name");
  return def;
}
```

- [ ] **Step 4: Tulis `src/config/resources/index.ts`**

```ts
import type { ResourceDef } from "@/lib/crud/define-resource";

const registry = new Map<string, ResourceDef>();

export function registerResources(list: ResourceDef[]) {
  for (const def of list) {
    if (registry.has(def.name)) throw new Error(`Resource duplikat: ${def.name}`);
    registry.set(def.name, def);
  }
}
export function getResource(name: string): ResourceDef | undefined { return registry.get(name); }
export function allResources(): ResourceDef[] { return [...registry.values()]; }
/** Hanya untuk test. */
export function _resetRegistry() { registry.clear(); }
```

- [ ] **Step 5: Tulis definisi contoh `src/config/resources/items.ts`**

```ts
import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type Item = components["schemas"]["Item"];
type NewItem = components["schemas"]["NewItem"];

export const itemSchema = z.object({ nama: z.string().min(1, "Nama wajib diisi") });

export const itemsResource = defineResource<Item, NewItem, NewItem>({
  name: "items",
  path: "/items",
  api: createResourceApi<Item, NewItem, NewItem>({ resource: "items", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
  list: { defaultSort: "nama", perPage: 10 },
  form: { schema: itemSchema, layout: [{ tabKey: "umum", fields: ["nama"] }], fields: { nama: { type: "text", labelKey: "items.nama" } } },
});
```

> Catatan: tambahkan `items:view|create|update|delete` ke union `Permission` di `src/config/rbac.ts` + `ROLE_PERMISSIONS.Admin`. Lakukan di step ini agar typecheck lolos.

- [ ] **Step 6: Jalankan test → lulus + typecheck**

Run: `npm test src/lib/crud/__tests__/define-resource.test.ts && npx tsc --noEmit`
Expected: PASS + tanpa error tipe.

- [ ] **Step 7: Commit**

```bash
git add src/lib/crud/define-resource.ts src/config/resources src/config/rbac.ts src/lib/crud/__tests__/define-resource.test.ts
git commit -m "feat: defineResource + ResourceRegistry + resource contoh items"
```

---

## Task 5: Field registry + FieldRenderer

**Files:**
- Create: `src/components/crud/fields/index.tsx` (registry + FieldRenderer)
- Create: `src/components/crud/fields/text-field.tsx`
- Create: `src/components/crud/fields/async-select-field.tsx`
- Test: `src/components/crud/fields/__tests__/field-renderer.test.tsx`

**Interfaces:**
- Consumes: `FieldMeta` (Task 4); `useOptions` via resource sumber (Task 2 + registry Task 4); RHF `useFormContext`.
- Produces:
  - `type FieldProps = { name: string; meta: FieldMeta }`
  - `registerField(type, component)` / `FieldRenderer({ name, meta })`
  - komponen bawaan `text`, `async-select` (sisanya ditambah di iterasi lanjutan mengikuti pola sama).

- [ ] **Step 1: Tulis test FieldRenderer (text)**

`src/components/crud/fields/__tests__/field-renderer.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import * as React from "react";
import { FieldRenderer } from "@/components/crud/fields";

function Harness() {
  const form = useForm({ defaultValues: { nama: "" } });
  return (
    <FormProvider {...form}>
      <FieldRenderer name="nama" meta={{ type: "text", labelKey: "items.nama" }} />
    </FormProvider>
  );
}

describe("FieldRenderer", () => {
  it("merender input teks dengan name field", () => {
    render(<Harness />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/components/crud/fields`
Expected: FAIL.

- [ ] **Step 3: Tulis `text-field.tsx`**

```tsx
"use client";
import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { FieldMeta } from "@/lib/crud/define-resource";

export function TextField({ name }: { name: string; meta: FieldMeta }) {
  const { register } = useFormContext();
  return <Input {...register(name)} />;
}
```

- [ ] **Step 4: Tulis `async-select-field.tsx`**

```tsx
"use client";
import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { getResource } from "@/config/resources/index";
import type { FieldMeta } from "@/lib/crud/define-resource";

export function AsyncSelectField({ name, meta }: { name: string; meta: FieldMeta }) {
  const { setValue, register } = useFormContext();
  const parentValues = useWatch({ name: meta.dependsOn ?? [] });
  const source = meta.optionsFrom ? getResource(meta.optionsFrom) : undefined;
  const parent = (meta.dependsOn ?? []).reduce<Record<string, unknown>>((acc, key, i) => {
    acc[key] = Array.isArray(parentValues) ? parentValues[i] : parentValues;
    return acc;
  }, {});
  const query = source?.api.useOptions({ parent: parent as Record<string, string> });

  React.useEffect(() => { setValue(name, ""); }, [JSON.stringify(parent)]); // reset saat parent berubah

  return (
    <select {...register(name)} className="border rounded px-2 py-1">
      <option value="">-- pilih --</option>
      {(query?.data ?? []).map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}
```
> Catatan: styling shadcn Select bisa disempurnakan kemudian; fungsionalitas cascade adalah target test.

- [ ] **Step 5: Tulis registry `index.tsx`**

```tsx
"use client";
import * as React from "react";
import type { FieldMeta, FieldType } from "@/lib/crud/define-resource";
import { TextField } from "./text-field";
import { AsyncSelectField } from "./async-select-field";

type FieldComponent = React.ComponentType<{ name: string; meta: FieldMeta }>;
const REGISTRY = new Map<FieldType, FieldComponent>();

export function registerField(type: FieldType, component: FieldComponent) { REGISTRY.set(type, component); }
registerField("text", TextField);
registerField("async-select", AsyncSelectField);

export function FieldRenderer({ name, meta }: { name: string; meta: FieldMeta }) {
  const Comp = REGISTRY.get(meta.type) ?? TextField;
  return <Comp name={name} meta={meta} />;
}
```

- [ ] **Step 6: Jalankan test → lulus**

Run: `npm test src/components/crud/fields`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/crud/fields
git commit -m "feat: field registry + FieldRenderer (text, async-select cascade)"
```

---

## Task 6: `ResourceForm`

**Files:**
- Create: `src/components/crud/resource-form.tsx`
- Test: `src/components/crud/__tests__/resource-form.test.tsx`

**Interfaces:**
- Consumes: `ResourceDef` (Task 4); `FieldRenderer` (Task 5); `CrudError` (Task 1); `useCreate/useUpdate/useGetOne` (Task 2).
- Produces: `ResourceForm({ def, id?, onDone? })` — RHF + zodResolver, layout tab, submit + mapping 422.

- [ ] **Step 1: Tulis test (submit sukses memanggil create)**

`src/components/crud/__tests__/resource-form.test.tsx`:
```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { z } from "zod";
import { ResourceForm } from "@/components/crud/resource-form";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";

const server = setupServer(
  http.post("http://localhost:3000/api/items", async ({ request }) => {
    const body = (await request.json()) as { nama: string };
    if (!body.nama) return HttpResponse.json({ message: "Validasi gagal", errors: { nama: ["wajib diisi"] } }, { status: 422 });
    return HttpResponse.json({ id: "x", nama: body.nama }, { status: 201 });
  }),
);
beforeAll(() => { process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api"; server.listen(); });
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const def = defineResource({
  name: "items", path: "/items",
  api: createResourceApi({ resource: "items", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "nama", labelKey: "items.nama" }],
  form: { schema: z.object({ nama: z.string().min(1, "Nama wajib diisi") }), layout: [{ tabKey: "umum", fields: ["nama"] }], fields: { nama: { type: "text" } } },
});

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ResourceForm", () => {
  it("menampilkan error validasi Zod saat submit kosong", async () => {
    wrap(<ResourceForm def={def} />);
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText(/Nama wajib diisi/)).toBeInTheDocument();
  });

  it("submit valid memanggil create & onDone", async () => {
    const onDone = vi.fn();
    wrap(<ResourceForm def={def} onDone={onDone} />);
    await userEvent.type(screen.getByRole("textbox"), "Halo");
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/components/crud/__tests__/resource-form.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Tulis `resource-form.tsx`**

```tsx
"use client";
import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldRenderer } from "@/components/crud/fields";
import { CrudError } from "@/lib/crud/errors";
import type { ResourceDef } from "@/lib/crud/define-resource";
import type { ID } from "@/lib/crud/types";

export function ResourceForm({ def, id, onDone }: { def: ResourceDef; id?: ID; onDone?: () => void }) {
  const isEdit = id !== undefined;
  const one = isEdit ? def.api.useGetOne(id!) : undefined;
  const create = def.api.useCreate();
  const update = def.api.useUpdate();

  const form = useForm({ resolver: zodResolver(def.form.schema) });
  React.useEffect(() => { if (one?.data) form.reset(one.data as Record<string, unknown>); }, [one?.data]);

  async function onSubmit(values: Record<string, unknown>) {
    try {
      if (isEdit) await update.mutateAsync({ id: id!, values });
      else await create.mutateAsync(values);
      onDone?.();
    } catch (e) {
      if (e instanceof CrudError && e.fieldErrors) {
        for (const [field, msgs] of Object.entries(e.fieldErrors)) {
          form.setError(field, { message: msgs.join(", ") });
        }
      }
    }
  }

  const tabs = def.form.layout;
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue={tabs[0]?.tabKey}>
          {tabs.length > 1 && (
            <TabsList>
              {tabs.map((t) => <TabsTrigger key={t.tabKey} value={t.tabKey}>{t.tabKey}</TabsTrigger>)}
            </TabsList>
          )}
          {tabs.map((t) => (
            <TabsContent key={t.tabKey} value={t.tabKey} className="space-y-4">
              {t.fields.map((f) => (
                <div key={f} className="space-y-1">
                  <Label htmlFor={f}>{def.form.fields[f]?.labelKey ?? f}</Label>
                  <FieldRenderer name={f} meta={def.form.fields[f] ?? { type: "text" }} />
                  <p className="text-sm text-destructive">
                    {form.formState.errors[f]?.message as string | undefined}
                  </p>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
        <Button type="submit" className="mt-4" disabled={create.isPending || update.isPending}>Simpan</Button>
      </form>
    </FormProvider>
  );
}
```

- [ ] **Step 4: Jalankan test → lulus**

Run: `npm test src/components/crud/__tests__/resource-form.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/crud/resource-form.tsx src/components/crud/__tests__/resource-form.test.tsx
git commit -m "feat: ResourceForm (RHF + zod + tab layout + mapping error 422)"
```

---

## Task 7: `ResourceTable`

**Files:**
- Create: `src/components/crud/resource-table.tsx`
- Test: `src/components/crud/__tests__/resource-table.test.tsx`

**Interfaces:**
- Consumes: `ResourceDef` (Task 4); `useList/useRemoveMany` (Task 2); `ui/table`, `ui/skeleton`, `ui/button`, `<Can>`.
- Produces: `ResourceTable({ def })` — server-side pagination/sort/search via state, render kolom, bulk-select, tombol Create/Edit/Delete (gated), state loading/empty/error. State via `nuqs` `useQueryStates`.

- [ ] **Step 1: Tulis test (render baris dari useList via MSW)**

`src/components/crud/__tests__/resource-table.test.tsx`:
```tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { ResourceTable } from "@/components/crud/resource-table";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import { z } from "zod";

const server = setupServer(
  http.get("http://localhost:3000/api/items", () =>
    HttpResponse.json({ data: [{ id: "1", nama: "Alpha" }, { id: "2", nama: "Beta" }], meta: { total: 2, page: 1, per_page: 10 } }),
  ),
);
beforeAll(() => { process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api"; server.listen(); });
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const def = defineResource({
  name: "items", path: "/items",
  api: createResourceApi({ resource: "items", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
  list: { perPage: 10 },
  form: { schema: z.object({ nama: z.string() }), layout: [{ tabKey: "umum", fields: ["nama"] }], fields: { nama: { type: "text" } } },
});

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ResourceTable", () => {
  it("merender baris dari server", async () => {
    wrap(<ResourceTable def={def} />);
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});
```

> Catatan: `nuqs` butuh adapter. Untuk unit test, komponen memakai state internal fallback bila `useQueryStates` tak tersedia; atau bungkus test dengan `NuqsTestingAdapter` dari `nuqs/adapters/testing`. Gunakan adapter testing:
> `import { NuqsTestingAdapter } from "nuqs/adapters/testing";` lalu bungkus `<NuqsTestingAdapter>` di `wrap`.

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/components/crud/__tests__/resource-table.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Tulis `resource-table.tsx`**

```tsx
"use client";
import * as React from "react";
import { useQueryStates, parseAsInteger, parseAsString } from "nuqs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Can } from "@/components/auth/can";
import type { ResourceDef } from "@/lib/crud/define-resource";

export function ResourceTable({ def }: { def: ResourceDef }) {
  const [state, setState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    q: parseAsString.withDefault(""),
    sort: parseAsString.withDefault(def.list?.defaultSort ?? ""),
    order: parseAsString.withDefault("asc"),
  });
  const perPage = def.list?.perPage ?? 20;
  const query = def.api.useList({
    page: state.page, perPage, q: state.q || undefined,
    sort: state.sort || undefined, order: (state.order as "asc" | "desc") || undefined,
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const removeMany = def.api.useRemoveMany();

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Cari..." defaultValue={state.q}
          onKeyDown={(e) => { if (e.key === "Enter") setState({ q: (e.target as HTMLInputElement).value, page: 1 }); }} />
        <Can permission={def.permissions.create}>
          <Button asChild><a href={`/${def.name}/create`}>Tambah</a></Button>
        </Can>
        {selected.size > 0 && (
          <Can permission={def.permissions.delete}>
            <Button variant="destructive" onClick={() => removeMany.mutate([...selected], { onSuccess: () => setSelected(new Set()) })}>
              Hapus ({selected.size})
            </Button>
          </Can>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            {def.columns.map((c) => <TableHead key={c.field}>{c.labelKey}</TableHead>)}
            <TableHead>Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isPending && (
            <TableRow><TableCell colSpan={def.columns.length + 2}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
          )}
          {query.isError && (
            <TableRow><TableCell colSpan={def.columns.length + 2} className="text-destructive">Gagal memuat data</TableCell></TableRow>
          )}
          {query.isSuccess && query.data.rows.length === 0 && (
            <TableRow><TableCell colSpan={def.columns.length + 2} className="text-muted-foreground">Belum ada data</TableCell></TableRow>
          )}
          {query.data?.rows.map((row) => {
            const r = row as Record<string, unknown>;
            const id = String(r[def.primaryKey ?? "id"]);
            return (
              <TableRow key={id}>
                <TableCell>
                  <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} aria-label={`pilih ${id}`} />
                </TableCell>
                {def.columns.map((c) => <TableCell key={c.field}>{String(r[c.field] ?? "")}</TableCell>)}
                <TableCell>
                  <Can permission={def.permissions.update}>
                    <Button variant="ghost" size="sm" asChild><a href={`/${def.name}/${id}/edit`}>Edit</a></Button>
                  </Can>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={state.page <= 1} onClick={() => setState({ page: state.page - 1 })}>Sebelumnya</Button>
        <span className="text-sm">Hal {state.page}</span>
        <Button variant="outline" size="sm"
          disabled={!!query.data && state.page * perPage >= query.data.total}
          onClick={() => setState({ page: state.page + 1 })}>Berikutnya</Button>
      </div>
    </div>
  );
}
```

> Catatan: kolom `render` (relation/date/image) disempurnakan lewat helper `renderCell(column, value)` pada iterasi lanjutan; v1 menampilkan nilai mentah agar test lulus.

- [ ] **Step 4: Jalankan test → lulus**

Run: `npm test src/components/crud/__tests__/resource-table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/crud/resource-table.tsx src/components/crud/__tests__/resource-table.test.tsx
git commit -m "feat: ResourceTable (server-side list, url-state, bulk delete, gating)"
```

---

## Task 8: `ScopeProvider`

**Files:**
- Create: `src/components/providers/scope-provider.tsx`
- Test: `src/components/providers/__tests__/scope-provider.test.tsx`

**Interfaces:**
- Produces: `ScopeProvider({ initial, children })`; `useScope(): { scope: Record<string,unknown>; setScope(patch) }`.
- Integrasi: `ResourceTable` (Task 7) membaca `useScope()` dan menyuntik ke `useList({ scope })` untuk resource yang mendeklarasikan `scope`. (Tambahkan pembacaan `useScope` di `resource-table.tsx` saat task ini, di belakang guard "jika `def.scope?.length`".)

- [ ] **Step 1: Tulis test**

`src/components/providers/__tests__/scope-provider.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { ScopeProvider, useScope } from "@/components/providers/scope-provider";

function Probe() {
  const { scope, setScope } = useScope();
  return (
    <div>
      <span data-testid="val">{String(scope.id_tahun_ajaran ?? "")}</span>
      <button onClick={() => setScope({ id_tahun_ajaran: 2 })}>set</button>
    </div>
  );
}

describe("ScopeProvider", () => {
  it("menyimpan & memperbarui scope", async () => {
    render(<ScopeProvider initial={{ id_tahun_ajaran: 1 }}><Probe /></ScopeProvider>);
    expect(screen.getByTestId("val").textContent).toBe("1");
    await userEvent.click(screen.getByRole("button", { name: "set" }));
    expect(screen.getByTestId("val").textContent).toBe("2");
  });
});
```

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/components/providers/__tests__/scope-provider.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Tulis `scope-provider.tsx`**

```tsx
"use client";
import * as React from "react";

type ScopeValue = Record<string, unknown>;
type Ctx = { scope: ScopeValue; setScope: (patch: ScopeValue) => void };
const ScopeContext = React.createContext<Ctx | null>(null);

export function ScopeProvider({ initial = {}, children }: { initial?: ScopeValue; children: React.ReactNode }) {
  const [scope, setScopeState] = React.useState<ScopeValue>(initial);
  const setScope = React.useCallback((patch: ScopeValue) => setScopeState((s) => ({ ...s, ...patch })), []);
  const value = React.useMemo(() => ({ scope, setScope }), [scope, setScope]);
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): Ctx {
  const ctx = React.useContext(ScopeContext);
  return ctx ?? { scope: {}, setScope: () => {} };
}
```

- [ ] **Step 4: Sambungkan ke ResourceTable**

Di `src/components/crud/resource-table.tsx`, impor `useScope` dan suntik ke `useList`:
```tsx
import { useScope } from "@/components/providers/scope-provider";
// ...di dalam komponen:
const { scope } = useScope();
const scopedFilter = def.scope?.length
  ? Object.fromEntries(def.scope.map((k) => [k, scope[k]]).filter(([, v]) => v !== undefined))
  : undefined;
// tambahkan ke useList: scope: scopedFilter
```

- [ ] **Step 5: Jalankan test → lulus**

Run: `npm test src/components/providers/__tests__/scope-provider.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/providers/scope-provider.tsx src/components/providers/__tests__/scope-provider.test.tsx src/components/crud/resource-table.tsx
git commit -m "feat: ScopeProvider + injeksi scope ke ResourceTable"
```

---

## Task 9: `ResourcePage` + route dinamis + integrasi nav/permission

**Files:**
- Create: `src/components/crud/resource-page.tsx`
- Create: `src/app/(app)/[resource]/page.tsx`
- Create: `src/app/(app)/[resource]/create/page.tsx`
- Create: `src/app/(app)/[resource]/[id]/edit/page.tsx`
- Create: `src/config/resources/register.ts`
- Modify: `src/app/(app)/layout.tsx` (bungkus `ScopeProvider`, pastikan resource terdaftar)
- Test: `e2e/crud-items.spec.ts` (Playwright)

**Interfaces:**
- Consumes: `getResource` (Task 4); `ResourceTable`/`ResourceForm` (Task 6/7); `getQueryClient` + prefetch (ada); `<Can>`.
- Produces: `ResourcePage({ resource })` (RSC) + route generik + registrasi resource saat modul dimuat.

- [ ] **Step 1: Tulis `register.ts` (daftarkan semua resource sekali)**

```ts
import { registerResources } from "@/config/resources/index";
import { itemsResource } from "@/config/resources/items";

let done = false;
export function ensureResourcesRegistered() {
  if (done) return;
  registerResources([itemsResource]);
  done = true;
}
```

- [ ] **Step 2: Tulis `resource-page.tsx` (Server Component, prefetch + hydrate)**

```tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/get-query-client";
import { getResource } from "@/config/resources/index";
import { ResourceTable } from "@/components/crud/resource-table";
import { PageHeader } from "@/components/layout/page-header";
import { notFound } from "next/navigation";

export async function ResourcePage({ resource }: { resource: string }) {
  const def = getResource(resource);
  if (!def) notFound();

  const qc = getQueryClient();
  const perPage = def!.list?.perPage ?? 20;
  await qc.prefetchQuery(def!.api.listQueryOptions({ page: 1, perPage }));

  return (
    <div className="space-y-4">
      <PageHeader title={def!.name} />
      <HydrationBoundary state={dehydrate(qc)}>
        <ResourceTable def={def!} />
      </HydrationBoundary>
    </div>
  );
}
```
> Catatan: `PageHeader` sudah ada; sesuaikan prop `title` dengan API-nya (cek `src/components/layout/page-header.tsx`). Idealnya title = `t.resources[def.name]` — gunakan i18n bila tersedia.

- [ ] **Step 3: Tulis route dinamis**

`src/app/(app)/[resource]/page.tsx`:
```tsx
import { ResourcePage } from "@/components/crud/resource-page";
import { ensureResourcesRegistered } from "@/config/resources/register";

export default async function Page({ params }: { params: Promise<{ resource: string }> }) {
  ensureResourcesRegistered();
  const { resource } = await params;
  return <ResourcePage resource={resource} />;
}
```
`src/app/(app)/[resource]/create/page.tsx`:
```tsx
"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { getResource } from "@/config/resources/index";
import { ensureResourcesRegistered } from "@/config/resources/register";
import { ResourceForm } from "@/components/crud/resource-form";
import { PageHeader } from "@/components/layout/page-header";
import { notFound } from "next/navigation";

export default function Page({ params }: { params: Promise<{ resource: string }> }) {
  ensureResourcesRegistered();
  const { resource } = use(params);
  const router = useRouter();
  const def = getResource(resource);
  if (!def) notFound();
  return (<div><PageHeader title={`Tambah ${def.name}`} /><ResourceForm def={def} onDone={() => router.push(`/${resource}`)} /></div>);
}
```
`src/app/(app)/[resource]/[id]/edit/page.tsx`:
```tsx
"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { getResource } from "@/config/resources/index";
import { ensureResourcesRegistered } from "@/config/resources/register";
import { ResourceForm } from "@/components/crud/resource-form";
import { PageHeader } from "@/components/layout/page-header";
import { notFound } from "next/navigation";

export default function Page({ params }: { params: Promise<{ resource: string; id: string }> }) {
  ensureResourcesRegistered();
  const { resource, id } = use(params);
  const router = useRouter();
  const def = getResource(resource);
  if (!def) notFound();
  return (<div><PageHeader title={`Edit ${def.name}`} /><ResourceForm def={def} id={id} onDone={() => router.push(`/${resource}`)} /></div>);
}
```

- [ ] **Step 4: Bungkus `ScopeProvider` di layout app**

Di `src/app/(app)/layout.tsx`, bungkus konten dengan `<ScopeProvider>` (impor dari provider) dan panggil `ensureResourcesRegistered()` di server bila layout adalah RSC. Tambahkan minimal:
```tsx
import { ScopeProvider } from "@/components/providers/scope-provider";
// ...bungkus children: <ScopeProvider>{children}</ScopeProvider>
```

- [ ] **Step 5: Tulis e2e Playwright**

`e2e/crud-items.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("CRUD items lewat lapisan generik", async ({ page }) => {
  await page.goto("/items");
  await expect(page.getByText("Contoh A")).toBeVisible();

  await page.getByRole("link", { name: /tambah/i }).click();
  await page.getByRole("textbox").fill("Item E2E");
  await page.getByRole("button", { name: /simpan/i }).click();

  await expect(page).toHaveURL(/\/items$/);
  await expect(page.getByText("Item E2E")).toBeVisible();
});
```
> Prasyarat: konfigurasi Playwright dengan `webServer` menjalankan `npm run dev`. Bila belum ada, tambahkan `playwright.config.ts` minimal + `npm i -D @playwright/test` (fold ke task ini).

- [ ] **Step 6: Jalankan e2e**

Run: `npx playwright test e2e/crud-items.spec.ts`
Expected: PASS (list tampil, create menambah baris).

- [ ] **Step 7: Commit**

```bash
git add src/components/crud/resource-page.tsx "src/app/(app)/[resource]" src/config/resources/register.ts "src/app/(app)/layout.tsx" e2e/crud-items.spec.ts playwright.config.ts package.json
git commit -m "feat: ResourcePage + route dinamis [resource] (list/create/edit) + e2e"
```

---

## Task 10: Auto-nav & route-guard dari registry

**Files:**
- Modify: `src/config/site.ts` (gabung navMain statis + dari registry)
- Modify: `src/config/rbac.ts` (helper untuk route-permission dari registry)
- Modify: `src/proxy.ts` (pakai route-permission gabungan)
- Test: `src/config/__tests__/nav-from-registry.test.ts`

**Interfaces:**
- Consumes: `allResources()` (Task 4).
- Produces: `resourceNavItems(): NavItem[]`; `resourceRoutePermissions(): { prefix; permission }[]`.

- [ ] **Step 1: Tulis test**

`src/config/__tests__/nav-from-registry.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { _resetRegistry, registerResources } from "@/config/resources/index";
import { itemsResource } from "@/config/resources/items";
import { resourceNavItems, resourceRoutePermissions } from "@/config/site";

describe("nav & route-permission dari registry", () => {
  beforeEach(() => { _resetRegistry(); registerResources([itemsResource]); });
  it("menghasilkan nav item utk resource", () => {
    const nav = resourceNavItems();
    expect(nav.find((n) => n.href === "/items")).toBeTruthy();
  });
  it("menghasilkan route-permission utk resource", () => {
    const rp = resourceRoutePermissions();
    expect(rp.find((r) => r.prefix === "/items")?.permission).toBe("items:view");
  });
});
```

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/config/__tests__/nav-from-registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Tambah helper di `src/config/site.ts`**

```ts
import { allResources } from "@/config/resources/index";
import type { NavItem } from "@/config/site"; // tipe sudah ada di file ini

export function resourceNavItems(): NavItem[] {
  return allResources().map((r) => ({
    key: r.name as NavItem["key"],
    href: `/${r.name}`,
    icon: r.nav?.icon ?? LayoutDashboard,
    permission: r.permissions.view,
  }));
}

export function resourceRoutePermissions() {
  return allResources().map((r) => ({ prefix: `/${r.name}`, permission: r.permissions.view }));
}
```
> Catatan: `NavItem.key` bertipe `NavKey` union tetap; untuk resource dinamis longgar-kan `key` ke `string` atau render label dari `def` (bukan i18n key) — pilih melonggarkan tipe `key` menjadi `string` dan fallback label ke `r.name` di sidebar.

- [ ] **Step 4: Gunakan di `proxy.ts`**

Gabungkan `ROUTE_PERMISSIONS` statis dengan `resourceRoutePermissions()` saat mengecek akses (panggil `ensureResourcesRegistered()` dulu agar registry terisi di edge/server).

- [ ] **Step 5: Jalankan test → lulus + typecheck**

Run: `npm test src/config/__tests__/nav-from-registry.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/site.ts src/config/rbac.ts src/proxy.ts src/config/__tests__/nav-from-registry.test.ts
git commit -m "feat: auto nav + route-guard dari resource registry"
```

---

## Task 11: Middleware auth pada apiClient

**Files:**
- Create: `src/lib/api/auth.ts`
- Modify: `src/lib/api/client.ts`
- Test: `src/lib/api/__tests__/client-auth.test.ts`

**Interfaces:**
- Produces (per spec D7 — seam auth, default no-op):
  - `src/lib/api/auth.ts`: `type TokenProvider = () => string | null | Promise<string | null>`; `setAuthTokenProvider(p: TokenProvider)`; `getAuthToken(): Promise<string | null>` (default provider mengembalikan `null`).
  - `apiClient` (via middleware) menyuntik `Authorization: Bearer <token>` bila `getAuthToken()` mengembalikan token; `401` → redirect login di browser. Fork menyambungkan strateginya via `setAuthTokenProvider(() => sesi.accessToken)`.

- [ ] **Step 1: Tulis test middleware**

`src/lib/api/__tests__/client-auth.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer();
beforeAll(() => { process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api"; server.listen(); });
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("apiClient auth middleware", () => {
  it("menyertakan header Authorization saat token tersedia", async () => {
    const { setAuthTokenProvider } = await import("@/lib/api/auth");
    const { apiClient } = await import("@/lib/api/client");
    setAuthTokenProvider(() => "tok-123");
    let seen = "";
    server.use(http.get("http://localhost:3000/api/items", ({ request }) => {
      seen = request.headers.get("authorization") ?? "";
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, per_page: 10 } });
    }));
    await apiClient.GET("/items" as never);
    expect(seen).toBe("Bearer tok-123");
  });

  it("tanpa header Authorization saat provider default (no-op)", async () => {
    const { setAuthTokenProvider } = await import("@/lib/api/auth");
    const { apiClient } = await import("@/lib/api/client");
    setAuthTokenProvider(() => null);
    let seen: string | null = "x";
    server.use(http.get("http://localhost:3000/api/items", ({ request }) => {
      seen = request.headers.get("authorization");
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, per_page: 10 } });
    }));
    await apiClient.GET("/items" as never);
    expect(seen).toBeNull();
  });
});
```

- [ ] **Step 2: Jalankan test → gagal**

Run: `npm test src/lib/api/__tests__/client-auth.test.ts`
Expected: FAIL (`@/lib/api/auth` belum ada).

- [ ] **Step 3: Tulis seam `src/lib/api/auth.ts`**

```ts
export type TokenProvider = () => string | null | Promise<string | null>;

let provider: TokenProvider = () => null; // default no-op — starter jalan tanpa auth

/** Fork menyambungkan strategi auth-nya, mis. setAuthTokenProvider(() => sesi.accessToken). */
export function setAuthTokenProvider(p: TokenProvider) { provider = p; }

export async function getAuthToken(): Promise<string | null> { return provider(); }
```

- [ ] **Step 4: Tambah middleware di `src/lib/api/client.ts`**

Tambahkan `import { getAuthToken } from "@/lib/api/auth";` lalu setelah pembuatan `apiClient`:
```ts
apiClient.use({
  async onRequest({ request }) {
    const token = await getAuthToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return response;
  },
});
```

- [ ] **Step 5: Jalankan test → lulus**

Run: `npm test src/lib/api/__tests__/client-auth.test.ts`
Expected: PASS (2 test).

- [ ] **Step 6: Commit**

```bash
git add src/lib/api/auth.ts src/lib/api/client.ts src/lib/api/__tests__/client-auth.test.ts
git commit -m "feat: seam auth getAuthToken + middleware (Bearer + redirect 401)"
```

---

## Task 12: Verifikasi menyeluruh (regresi)

**Files:** —

- [ ] **Step 1: Jalankan seluruh unit test**

Run: `npm test`
Expected: semua PASS.

- [ ] **Step 2: Typecheck & lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: tanpa error.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 4: e2e**

Run: `npx playwright test`
Expected: PASS.

- [ ] **Step 5: Commit (bila ada perbaikan)**

```bash
git add -A && git commit -m "test: verifikasi menyeluruh lapisan CRUD" || echo "tidak ada perubahan"
```

---

## Self-Review (penulis plan)

**Spec coverage:**
- §3 Arsitektur/lapisan → Task 1–2 (data), 4 (registry), 5–9 (UI). ✓
- §4 DataProvider/createResourceApi + envelope + error + auth → Task 1, 2, 11. ✓
- §5 defineResource + registry + field/kolom types → Task 4, 5. ✓
- §6 ResourceTable/Form/field registry/ScopeProvider/ResourcePage → Task 5, 6, 7, 8, 9. ✓
- §7 mock Route Handler + testing → Task 3, semua test task, Task 12. ✓
- §8 dependensi → Task 0. ✓
- §9 folder → tersebar sesuai path tiap task. ✓
- Auto-nav/route-guard (tersirat §5 registry) → Task 10. ✓
- Non-goals (workflow/import/PDF/UI non-standar/mobile) → tidak ada task (benar, di luar cakupan). ✓

**Placeholder scan:** kode ditampilkan lengkap tiap step; catatan penyempurnaan (render kolom, styling Select) diberi implementasi minimal yang lulus test + catatan eksplisit, bukan "TODO kosong".

**Type consistency:** `ListParams/ListResult/Option/CrudError` (Task 1) dipakai konsisten di Task 2; `ResourceDef`/`FieldMeta` (Task 4) dipakai di Task 5–9; `createResourceApi` mengembalikan `ResourceApi` yang dikonsumsi `defineResource`. Nama fungsi (`useList/useGetOne/useCreate/useUpdate/useRemove/useRemoveMany/useOptions`, `getResource/allResources/registerResources/_resetRegistry`, `useScope`, `setAuthTokenProvider/getAuthToken`) konsisten lintas task dan sesuai spec final (D7 auth seam, D8 nuqs).

**Catatan risiko implementasi:**
- Next.js 16: signature `params` sebagai `Promise` & pola RSC — verifikasi ke `node_modules/next/dist/docs/`.
- `openapi-fetch` path dinamis butuh cast `as never` (didokumentasikan); jaga tipe entitas via generik.
- Timing base URL `client.ts` saat test — pakai `NEXT_PUBLIC_API_BASE_URL` sebelum listen / `vi.resetModules()`.
