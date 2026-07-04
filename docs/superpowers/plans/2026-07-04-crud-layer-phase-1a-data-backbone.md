# CRUD Layer — Phase 1a (Data & Backend Backbone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the headless data backbone of the generic CRUD layer — a `createResourceApi` factory over the existing `openapi-fetch` + TanStack Query stack, its pure helper modules, the auth seam, and a generic paginated mock backend proven by a `categories` resource.

**Architecture:** Pure, unit-testable helpers (error normalization, list querystring, list unwrap) compose into `createResourceApi`, a generic-over-entity factory that reuses the existing `apiClient`. Auth is a swappable no-op seam injected via an `openapi-fetch` middleware. A generic in-memory `createMockStore` backs Next 16 Route Handlers implementing the paginated `{data, meta}` contract for `categories`.

**Tech Stack:** TypeScript, `openapi-fetch` (existing), `@tanstack/react-query` (existing), Next.js 16 Route Handlers, Vitest (new, dev). No UI libraries in this phase.

## Global Constraints

- **Generic only** — no domain terms (`siswa`/`agama`/etc.). The single demo resource is the neutral `categories`. Reference: `docs/superpowers/specs/2026-07-03-adminly-crud-layer-design.md`.
- **OpenAPI-first** — go through the existing `apiClient` (`openapi-fetch`), never raw `fetch`, so auth middleware applies.
- **List response = paginated wrapper** `{ data: T[], meta: { total, page, per_page } }`; single-object endpoints stay bare.
- **List querystring** — `page`, `per_page`, `sort`, `order`, `q`, `filter[<k>]`, `scope[<k>]`.
- **Error normalization** — every failure becomes `CrudError { httpStatus, message, fieldErrors? }`; `422` maps to `fieldErrors`. Stack traces never reach callers.
- **Auth seam** — `getAuthToken()` defaults to `() => null`; a fork overrides via `setAuthTokenProvider`. Starter runs without auth.
- **Next.js 16** — Route Handler dynamic params are async (`await ctx.params`), typed with the global `RouteContext<'/api/categories/[id]'>`. Read `node_modules/next/dist/docs/` before framework code.
- `src/lib/api/schema.d.ts` is **generated** (`npm run gen:api` from `openapi.yaml`) — never hand-edit.
- Preserve conventions: `@/` alias, Indonesian code comments, two-space indent.

---

### Task 1: Vitest test infrastructure

**Files:**
- Modify: `package.json` (deps + scripts)
- Create: `vitest.config.ts`
- Create: `src/lib/crud/smoke.test.ts` (temporary sanity test, deleted at end of task)

**Interfaces:**
- Produces: `npm test` (runs `vitest run`) and `npm run test:watch`.
- Produces: `@/` path alias resolvable inside tests; tests are files matching `src/**/*.test.ts`.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add test scripts to `package.json`**

In `"scripts"`, after the existing `"gen:api"` line, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write the Vitest config**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Config test unit. Pure-logic layer → environment "node" (tanpa DOM).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 4: Write a temporary smoke test**

Create `src/lib/crud/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("vitest wiring", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test suite**

Run: `npm test`
Expected: 1 passed (`vitest wiring > runs`).

- [ ] **Step 6: Delete the smoke test**

```bash
rm src/lib/crud/smoke.test.ts
```

- [ ] **Step 7: Verify typecheck + lint still pass**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS (clean).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "Tambah infrastruktur test Vitest (unit, environment node)"
```

---

### Task 2: Error normalization (`CrudError`)

**Files:**
- Create: `src/lib/crud/errors.ts`
- Create: `src/lib/crud/errors.test.ts`

**Interfaces:**
- Produces: `type CrudError = { httpStatus: number; message: string; fieldErrors?: Record<string, string> }`.
- Produces: `normalizeError(status: number, body: unknown): CrudError`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/crud/errors.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { normalizeError } from "@/lib/crud/errors";

describe("normalizeError", () => {
  it("maps a 422 body to fieldErrors (first message per field)", () => {
    const err = normalizeError(422, {
      message: "Validation failed",
      errors: { name: ["Name is required", "too short"], slug: ["taken"] },
    });
    expect(err.httpStatus).toBe(422);
    expect(err.fieldErrors).toEqual({ name: "Name is required", slug: "taken" });
  });

  it("accepts fieldErrors key as an alternative to errors", () => {
    const err = normalizeError(422, { fieldErrors: { name: "req" } });
    expect(err.fieldErrors).toEqual({ name: "req" });
  });

  it("uses the body message when present", () => {
    const err = normalizeError(400, { message: "Bad input" });
    expect(err.message).toBe("Bad input");
    expect(err.fieldErrors).toBeUndefined();
  });

  it("falls back to a default message for 5xx and never leaks the body", () => {
    const err = normalizeError(500, "Error: at Object.<anonymous> stack...");
    expect(err.message).toBe("Server error");
    expect(err.httpStatus).toBe(500);
    expect(err.fieldErrors).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- errors`
Expected: FAIL (`Cannot find module '@/lib/crud/errors'`).

- [ ] **Step 3: Implement**

Create `src/lib/crud/errors.ts`:

```ts
// Bentuk error CRUD yang dinormalkan. Stack trace/body mentah tak pernah
// diteruskan ke UI — hanya field-field ini.
export type CrudError = {
  httpStatus: number;
  message: string;
  fieldErrors?: Record<string, string>;
};

function defaultMessage(status: number): string {
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "Not found";
  if (status === 422) return "Validation failed";
  if (status >= 500) return "Server error";
  return "Request failed";
}

/** Normalisasi hasil error HTTP menjadi CrudError. 422 → fieldErrors. */
export function normalizeError(status: number, body: unknown): CrudError {
  const b = (body ?? {}) as {
    message?: unknown;
    errors?: unknown;
    fieldErrors?: unknown;
  };
  const message =
    typeof b.message === "string" ? b.message : defaultMessage(status);

  let fieldErrors: Record<string, string> | undefined;
  if (status === 422) {
    const raw = b.fieldErrors ?? b.errors;
    if (raw && typeof raw === "object") {
      fieldErrors = {};
      for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        fieldErrors[key] = Array.isArray(value)
          ? String(value[0])
          : String(value);
      }
    }
  }

  return { httpStatus: status, message, fieldErrors };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- errors`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/crud/errors.ts src/lib/crud/errors.test.ts
git commit -m "Tambah normalizeError + CrudError (422 → fieldErrors)"
```

---

### Task 3: List params + unwrap helpers

**Files:**
- Create: `src/lib/crud/list-params.ts`
- Create: `src/lib/crud/list-params.test.ts`

**Interfaces:**
- Produces: `type ListParams = { page?; perPage?; sort?; order?: "asc"|"desc"; q?; filters?: Record<string, string|number|undefined>; scope?: Record<string, string|number|undefined> }`.
- Produces: `type ListResult<T> = { rows: T[]; total: number; page: number; perPage: number }`.
- Produces: `buildListSearchParams(params: ListParams): URLSearchParams`.
- Produces: `unwrapList<T>(body: { data: T[]; meta: { total: number; page: number; per_page: number } }): ListResult<T>`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/crud/list-params.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildListSearchParams, unwrapList } from "@/lib/crud/list-params";

describe("buildListSearchParams", () => {
  it("serializes paging, sort, search, filters and scope", () => {
    const sp = buildListSearchParams({
      page: 2,
      perPage: 20,
      sort: "name",
      order: "desc",
      q: "abc",
      filters: { status: "active", tier: 3 },
      scope: { workspace_id: "w1" },
    });
    expect(sp.toString()).toBe(
      "page=2&per_page=20&sort=name&order=desc&q=abc&filter%5Bstatus%5D=active&filter%5Btier%5D=3&scope%5Bworkspace_id%5D=w1",
    );
  });

  it("omits empty/undefined values", () => {
    const sp = buildListSearchParams({
      page: 1,
      q: "",
      filters: { status: undefined, tier: "" },
    });
    expect(sp.toString()).toBe("page=1");
  });

  it("returns an empty string for empty params", () => {
    expect(buildListSearchParams({}).toString()).toBe("");
  });
});

describe("unwrapList", () => {
  it("maps the {data, meta} wrapper to a flat ListResult", () => {
    const result = unwrapList({
      data: [{ id: "1" }, { id: "2" }],
      meta: { total: 42, page: 3, per_page: 10 },
    });
    expect(result).toEqual({
      rows: [{ id: "1" }, { id: "2" }],
      total: 42,
      page: 3,
      perPage: 10,
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- list-params`
Expected: FAIL (`Cannot find module '@/lib/crud/list-params'`).

- [ ] **Step 3: Implement**

Create `src/lib/crud/list-params.ts`:

```ts
export type ListParams = {
  page?: number;
  perPage?: number;
  sort?: string;
  order?: "asc" | "desc";
  q?: string;
  filters?: Record<string, string | number | undefined>;
  scope?: Record<string, string | number | undefined>;
};

export type ListResult<T> = {
  rows: T[];
  total: number;
  page: number;
  perPage: number;
};

// Kunci filter/scope pakai notasi filter[x]/scope[x] (di-encode URLSearchParams).
export function buildListSearchParams(params: ListParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.perPage != null) sp.set("per_page", String(params.perPage));
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);
  if (params.q) sp.set("q", params.q);

  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (value !== undefined && value !== "") sp.set(`filter[${key}]`, String(value));
  }
  for (const [key, value] of Object.entries(params.scope ?? {})) {
    if (value !== undefined && value !== "") sp.set(`scope[${key}]`, String(value));
  }
  return sp;
}

type PaginatedBody<T> = {
  data: T[];
  meta: { total: number; page: number; per_page: number };
};

export function unwrapList<T>(body: PaginatedBody<T>): ListResult<T> {
  return {
    rows: body.data ?? [],
    total: body.meta?.total ?? 0,
    page: body.meta?.page ?? 1,
    perPage: body.meta?.per_page ?? (body.data?.length ?? 0),
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- list-params`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/crud/list-params.ts src/lib/crud/list-params.test.ts
git commit -m "Tambah buildListSearchParams + unwrapList (ListParams/ListResult)"
```

---

### Task 4: Auth seam + apiClient middleware

**Files:**
- Create: `src/lib/api/auth.ts`
- Create: `src/lib/api/auth.test.ts`
- Modify: `src/lib/api/client.ts`

**Interfaces:**
- Produces: `setAuthTokenProvider(p: () => string | null | Promise<string | null>): void`.
- Produces: `getAuthToken(): Promise<string | null>` (default provider returns `null`).
- Modifies: `apiClient` gains an `onRequest` middleware injecting `Authorization: Bearer <token>` when a token exists.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/api/auth.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";

import { getAuthToken, setAuthTokenProvider } from "@/lib/api/auth";

afterEach(() => {
  // Kembalikan ke default no-op agar test tak saling bocor.
  setAuthTokenProvider(() => null);
});

describe("auth seam", () => {
  it("defaults to no token", async () => {
    expect(await getAuthToken()).toBeNull();
  });

  it("returns the token from a synchronous provider", async () => {
    setAuthTokenProvider(() => "abc");
    expect(await getAuthToken()).toBe("abc");
  });

  it("awaits an async provider", async () => {
    setAuthTokenProvider(async () => "xyz");
    expect(await getAuthToken()).toBe("xyz");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- auth`
Expected: FAIL (`Cannot find module '@/lib/api/auth'`).

- [ ] **Step 3: Implement the seam**

Create `src/lib/api/auth.ts`:

```ts
// Seam auth yang bisa dikonfigurasi fork. Default: tanpa token (starter jalan
// tanpa auth). Fork memanggil setAuthTokenProvider(() => sesiku.accessToken).
type TokenProvider = () => string | null | Promise<string | null>;

let provider: TokenProvider = () => null;

export function setAuthTokenProvider(next: TokenProvider): void {
  provider = next;
}

export async function getAuthToken(): Promise<string | null> {
  return provider();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- auth`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the middleware into `apiClient`**

Replace the contents of `src/lib/api/client.ts` with:

```ts
import createClient, { type Middleware } from "openapi-fetch";

import { getAuthToken } from "@/lib/api/auth";
import type { paths } from "@/lib/api/schema";

// Base URL client. Di browser pakai relatif "/api" (Route Handler lokal).
// Di server (RSC prefetch) fetch butuh URL absolut → fallback ke localhost.
// Set NEXT_PUBLIC_API_BASE_URL untuk mengarah ke backend sungguhan.
function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  return `http://localhost:${process.env.PORT ?? "3000"}/api`;
}

// Suntik Authorization dari seam auth bila ada token (§4 spec CRUD layer).
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = await getAuthToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
};

export const apiClient = createClient<paths>({ baseUrl: resolveBaseUrl() });
apiClient.use(authMiddleware);
```

- [ ] **Step 6: Verify typecheck, lint, and full test suite**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS (tsc clean, lint clean, all tests green including auth).

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/auth.ts src/lib/api/auth.test.ts src/lib/api/client.ts
git commit -m "Tambah seam getAuthToken + middleware Authorization pada apiClient"
```

---

### Task 5: `createResourceApi` factory

**Files:**
- Create: `src/lib/crud/create-resource-api.ts`

**Interfaces:**
- Consumes: `apiClient` (`@/lib/api/client`), `normalizeError`/`CrudError` (`@/lib/crud/errors`), `buildListSearchParams`/`unwrapList`/`ListParams`/`ListResult` (`@/lib/crud/list-params`), TanStack Query.
- Produces: `type ResourceApiConfig = { resource: string; path: string; primaryKey?: string }`.
- Produces: `createResourceApi<TItem, TNew, TUpdate>(cfg): ResourceApi<TItem, TNew, TUpdate>` where the returned object exposes: `keys` (`{ all, list(params), detail(id) }`), `listQueryOptions(params)`, `useList(params)`, `useGetOne(id)`, `useCreate()`, `useUpdate()`, `useRemove()`.
- Note: **no `"use client"`** — hooks execute only inside client components; `listQueryOptions` is importable by RSC pages (Phase 1b).

**Design note (spec §4 trade-off):** `openapi-fetch` is typed per path-literal; this factory is generic over entity types with a dynamic `path: string`. Path↔type inference is therefore intentionally cast away at one controlled boundary inside the factory (`clientLoose`); entity types (`TItem/TNew/TUpdate`) stay sound. This runtime is exercised end-to-end by the `categories` curl tests (Task 6) and by Phase 1b's e2e; its pure dependencies are unit-tested in Tasks 2–3.

- [ ] **Step 1: Implement the factory**

Create `src/lib/crud/create-resource-api.ts`:

```ts
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import { normalizeError, type CrudError } from "@/lib/crud/errors";
import {
  buildListSearchParams,
  unwrapList,
  type ListParams,
  type ListResult,
} from "@/lib/crud/list-params";

export type ResourceApiConfig = {
  resource: string; // "categories" — dipakai untuk queryKey
  path: string; // "/categories" — path OpenAPI
  primaryKey?: string; // default "id"
};

type HttpResult = {
  data?: unknown;
  error?: unknown;
  response: Response;
};

// openapi-fetch bertipe per path-literal; factory generik memakai path:string.
// Cast terkontrol di SATU tempat ini; tipe entitas tetap aman (lihat design note).
const clientLoose = apiClient as unknown as {
  GET: (path: string) => Promise<HttpResult>;
  POST: (path: string, init: { body: unknown }) => Promise<HttpResult>;
  PUT: (path: string, init: { body: unknown }) => Promise<HttpResult>;
  DELETE: (path: string) => Promise<HttpResult>;
};

function fail(result: HttpResult): CrudError {
  return normalizeError(result.response.status, result.error ?? result.data);
}

export function createResourceApi<TItem, TNew, TUpdate>(
  cfg: ResourceApiConfig,
) {
  const base = cfg.path.replace(/\/$/, "");
  const keys = {
    all: [cfg.resource] as const,
    list: (params: ListParams) => [cfg.resource, "list", params] as const,
    detail: (id: string) => [cfg.resource, "detail", id] as const,
  };

  async function fetchList(params: ListParams): Promise<ListResult<TItem>> {
    const qs = buildListSearchParams(params).toString();
    const result = await clientLoose.GET(`${base}${qs ? `?${qs}` : ""}`);
    if (result.error || !result.data) throw fail(result);
    return unwrapList<TItem>(result.data as never);
  }

  function listQueryOptions(params: ListParams = {}) {
    return queryOptions({
      queryKey: keys.list(params),
      queryFn: () => fetchList(params),
    });
  }

  function useList(params: ListParams = {}) {
    return useQuery(listQueryOptions(params));
  }

  function useGetOne(id: string) {
    return useQuery({
      queryKey: keys.detail(id),
      enabled: Boolean(id),
      queryFn: async (): Promise<TItem> => {
        const result = await clientLoose.GET(`${base}/${id}`);
        if (result.error || !result.data) throw fail(result);
        return result.data as TItem;
      },
    });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation<TItem, CrudError, TNew>({
      mutationFn: async (input) => {
        const result = await clientLoose.POST(base, { body: input });
        if (result.error || !result.data) throw fail(result);
        return result.data as TItem;
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation<TItem, CrudError, { id: string; data: TUpdate }>({
      mutationFn: async ({ id, data }) => {
        const result = await clientLoose.PUT(`${base}/${id}`, { body: data });
        if (result.error || !result.data) throw fail(result);
        return result.data as TItem;
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
  }

  function useRemove() {
    const qc = useQueryClient();
    return useMutation<void, CrudError, string>({
      mutationFn: async (id) => {
        const result = await clientLoose.DELETE(`${base}/${id}`);
        if (result.error) throw fail(result);
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
  }

  return {
    keys,
    listQueryOptions,
    useList,
    useGetOne,
    useCreate,
    useUpdate,
    useRemove,
  };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. Confirms the factory composes the pure helpers and TanStack Query with sound entity generics.

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: PASS (clean).

- [ ] **Step 4: Commit**

```bash
git add src/lib/crud/create-resource-api.ts
git commit -m "Tambah createResourceApi (list/getOne/create/update/remove, CrudError, invalidate)"
```

---

### Task 6: Generic mock store + `categories` endpoints

**Files:**
- Create: `src/lib/crud/mock-store.ts`
- Create: `src/lib/crud/mock-store.test.ts`
- Create: `src/lib/api/mock/categories-store.ts`
- Create: `src/app/api/categories/route.ts`
- Create: `src/app/api/categories/[id]/route.ts`
- Modify: `openapi.yaml`
- Modify: `src/lib/api/schema.d.ts` (regenerated)

**Interfaces:**
- Consumes: nothing from prior tasks (mock is standalone).
- Produces: `createMockStore<T extends { id: string }>(seed: T[])` → `{ list(opts), get(id), create(item), update(id, patch), remove(id) }` where `list` returns `{ data: T[]; meta: { total; page; per_page } }`.
- Produces: HTTP `GET/POST /api/categories`, `GET/PUT/DELETE /api/categories/{id}` implementing the paginated contract.
- Produces: OpenAPI schemas `Category`, `NewCategory`, `UpdateCategory`, `CategoryList` and matching paths.

- [ ] **Step 1: Write the failing tests for the store**

Create `src/lib/crud/mock-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import { createMockStore } from "@/lib/crud/mock-store";

type Row = { id: string; name: string };

let store: ReturnType<typeof createMockStore<Row>>;

beforeEach(() => {
  store = createMockStore<Row>([
    { id: "1", name: "Beta" },
    { id: "2", name: "Alpha" },
    { id: "3", name: "Gamma" },
  ]);
});

describe("createMockStore.list", () => {
  it("paginates and reports total", () => {
    const res = store.list({ page: 1, perPage: 2 });
    expect(res.data).toHaveLength(2);
    expect(res.meta).toEqual({ total: 3, page: 1, per_page: 2 });
  });

  it("sorts ascending and descending", () => {
    const asc = store.list({ page: 1, perPage: 10, sort: "name", order: "asc" });
    expect(asc.data.map((r) => r.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    const desc = store.list({ page: 1, perPage: 10, sort: "name", order: "desc" });
    expect(desc.data.map((r) => r.name)).toEqual(["Gamma", "Beta", "Alpha"]);
  });

  it("filters by q over searchFields", () => {
    const res = store.list({ page: 1, perPage: 10, q: "al", searchFields: ["name"] });
    expect(res.data.map((r) => r.name)).toEqual(["Alpha"]);
    expect(res.meta.total).toBe(1);
  });
});

describe("createMockStore mutations", () => {
  it("creates, updates and removes", () => {
    store.create({ id: "4", name: "Delta" });
    expect(store.get("4")).toEqual({ id: "4", name: "Delta" });

    expect(store.update("4", { name: "Delta 2" })?.name).toBe("Delta 2");
    expect(store.update("nope", { name: "x" })).toBeNull();

    expect(store.remove("4")).toBe(true);
    expect(store.remove("4")).toBe(false);
    expect(store.get("4")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- mock-store`
Expected: FAIL (`Cannot find module '@/lib/crud/mock-store'`).

- [ ] **Step 3: Implement the generic store**

Create `src/lib/crud/mock-store.ts`:

```ts
type WithId = { id: string };

export type MockListOptions<T> = {
  page: number;
  perPage: number;
  sort?: string;
  order?: "asc" | "desc";
  q?: string;
  searchFields?: (keyof T)[];
};

// Store in-memory generik untuk mock backend (pola users-store, digeneralisasi).
// Ganti dengan database sungguhan di produksi.
export function createMockStore<T extends WithId>(seed: T[]) {
  let items: T[] = [...seed];

  return {
    list(opts: MockListOptions<T>) {
      let rows = [...items];

      if (opts.q && opts.searchFields?.length) {
        const needle = opts.q.toLowerCase();
        rows = rows.filter((row) =>
          opts.searchFields!.some((field) =>
            String(row[field] ?? "").toLowerCase().includes(needle),
          ),
        );
      }

      if (opts.sort) {
        const field = opts.sort as keyof T;
        const dir = opts.order === "desc" ? -1 : 1;
        rows.sort(
          (a, b) =>
            String(a[field] ?? "").localeCompare(String(b[field] ?? "")) * dir,
        );
      }

      const total = rows.length;
      const start = (opts.page - 1) * opts.perPage;
      const data = rows.slice(start, start + opts.perPage);
      return { data, meta: { total, page: opts.page, per_page: opts.perPage } };
    },

    get(id: string): T | null {
      return items.find((row) => row.id === id) ?? null;
    },

    create(item: T): T {
      items = [item, ...items];
      return item;
    },

    update(id: string, patch: Partial<T>): T | null {
      const index = items.findIndex((row) => row.id === id);
      if (index === -1) return null;
      items[index] = { ...items[index], ...patch, id };
      return items[index];
    },

    remove(id: string): boolean {
      const before = items.length;
      items = items.filter((row) => row.id !== id);
      return items.length < before;
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- mock-store`
Expected: PASS (5 tests).

- [ ] **Step 5: Create the categories store instance**

Create `src/lib/api/mock/categories-store.ts`:

```ts
import { createMockStore } from "@/lib/crud/mock-store";

export type Category = {
  id: string;
  name: string;
  createdAt: string;
};

// Contoh resource GENERIK milik adminly. Seed data.
export const categoriesStore = createMockStore<Category>([
  { id: "1", name: "Electronics", createdAt: "2026-01-05" },
  { id: "2", name: "Books", createdAt: "2026-01-18" },
  { id: "3", name: "Home & Kitchen", createdAt: "2026-02-02" },
  { id: "4", name: "Toys", createdAt: "2026-02-20" },
  { id: "5", name: "Sports", createdAt: "2026-03-11" },
]);
```

- [ ] **Step 6: Write the collection Route Handler**

Create `src/app/api/categories/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

import { categoriesStore } from "@/lib/api/mock/categories-store";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1") || 1;
  const perPage = Number(sp.get("per_page") ?? "20") || 20;
  const order = sp.get("order") === "desc" ? "desc" : "asc";

  const result = categoriesStore.list({
    page,
    perPage,
    sort: sp.get("sort") ?? undefined,
    order,
    q: sp.get("q") ?? undefined,
    searchFields: ["name"],
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json(
      { message: "Validation failed", errors: { name: ["Name is required"] } },
      { status: 422 },
    );
  }

  const category = categoriesStore.create({
    id: `c_${Date.now()}`,
    name: body.name,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  return NextResponse.json(category, { status: 201 });
}
```

- [ ] **Step 7: Write the item Route Handler**

Create `src/app/api/categories/[id]/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

import { categoriesStore } from "@/lib/api/mock/categories-store";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  const { id } = await ctx.params;
  const category = categoriesStore.get(id);
  if (!category) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(category);
}

export async function PUT(
  request: NextRequest,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json(
      { message: "Validation failed", errors: { name: ["Name is required"] } },
      { status: 422 },
    );
  }

  const updated = categoriesStore.update(id, { name: body.name });
  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/categories/[id]">,
) {
  const { id } = await ctx.params;
  const removed = categoriesStore.remove(id);
  if (!removed) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 8: Add the OpenAPI paths + schemas**

In `openapi.yaml`, under `paths:` (after the existing `/users/{id}` block, before `components:`), add:

```yaml
  /categories:
    get:
      operationId: listCategories
      summary: List categories (paginated)
      parameters:
        - { name: page, in: query, schema: { type: integer } }
        - { name: per_page, in: query, schema: { type: integer } }
        - { name: sort, in: query, schema: { type: string } }
        - { name: order, in: query, schema: { type: string, enum: [asc, desc] } }
        - { name: q, in: query, schema: { type: string } }
      responses:
        "200":
          description: Paginated list
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CategoryList"
    post:
      operationId: createCategory
      summary: Create a category
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewCategory"
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Category"
        "422":
          description: Validation failed
  /categories/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: string }
    get:
      operationId: getCategory
      summary: Get a category
      responses:
        "200":
          description: A category
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Category"
        "404":
          description: Not found
    put:
      operationId: updateCategory
      summary: Update a category
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateCategory"
      responses:
        "200":
          description: Updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Category"
        "404":
          description: Not found
        "422":
          description: Validation failed
    delete:
      operationId: deleteCategory
      summary: Delete a category
      responses:
        "204":
          description: Deleted
        "404":
          description: Not found
```

Then, in `openapi.yaml` under `components: schemas:` (after the existing `NewUser` schema), add:

```yaml
    Category:
      type: object
      required: [id, name, createdAt]
      properties:
        id: { type: string }
        name: { type: string }
        createdAt: { type: string }
    NewCategory:
      type: object
      required: [name]
      properties:
        name: { type: string }
    UpdateCategory:
      type: object
      required: [name]
      properties:
        name: { type: string }
    CategoryList:
      type: object
      required: [data, meta]
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Category"
        meta:
          type: object
          required: [total, page, per_page]
          properties:
            total: { type: integer }
            page: { type: integer }
            per_page: { type: integer }
```

- [ ] **Step 9: Regenerate types**

Run: `npm run gen:api`
Expected: `src/lib/api/schema.d.ts` regenerates with `listCategories`/`createCategory`/etc. operations and the new schemas (no errors).

- [ ] **Step 10: Verify typecheck + full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (all unit tests green; generated types compile).

- [ ] **Step 11: Start the dev server**

Run: `npm run dev` (background terminal). Wait for "Ready" on http://localhost:3000.
(`RouteContext` types are generated during `next dev`.)

- [ ] **Step 12: Test the endpoints via curl**

Run:
```bash
echo "== list page1 per_page2 sort desc =="
curl -s "http://localhost:3000/api/categories?page=1&per_page=2&sort=name&order=desc"
echo; echo "== search =="
curl -s "http://localhost:3000/api/categories?q=book"
echo; echo "== create valid =="
curl -s -X POST http://localhost:3000/api/categories -H 'Content-Type: application/json' -d '{"name":"Garden"}' -w '\n[%{http_code}]\n'
echo "== create invalid (422) =="
curl -s -X POST http://localhost:3000/api/categories -H 'Content-Type: application/json' -d '{"name":""}' -w '\n[%{http_code}]\n'
echo "== update =="
curl -s -X PUT http://localhost:3000/api/categories/2 -H 'Content-Type: application/json' -d '{"name":"Books & Media"}' -w '\n[%{http_code}]\n'
echo "== delete =="
curl -s -X DELETE http://localhost:3000/api/categories/3 -w '[%{http_code}]\n'
echo "== delete missing (404) =="
curl -s -X DELETE http://localhost:3000/api/categories/nope -w '\n[%{http_code}]\n'
```
Expected:
- list → `{"data":[...2 items sorted desc...],"meta":{"total":5,"page":1,"per_page":2}}`
- search → only the "Books" category in `data`, `meta.total` = 1
- create valid → the new category JSON + `[201]`
- create invalid → `{"message":"Validation failed","errors":{"name":["Name is required"]}}` + `[422]`
- update → updated JSON + `[200]`
- delete → `[204]`
- delete missing → `{"message":"Not found"}` + `[404]`

- [ ] **Step 13: Stop the dev server**

```bash
kill $(lsof -ti tcp:3000) 2>/dev/null
```

- [ ] **Step 14: Commit**

```bash
git add src/lib/crud/mock-store.ts src/lib/crud/mock-store.test.ts src/lib/api/mock/categories-store.ts "src/app/api/categories/route.ts" "src/app/api/categories/[id]/route.ts" openapi.yaml src/lib/api/schema.d.ts
git commit -m "Tambah mock store generik + endpoint categories (paginated {data,meta})"
```

---

## Self-Review

**Spec coverage (Phase 1a slice of §4, §7, §11):**
- `createResourceApi` (list/getOne/create/update/remove, open `{data,meta}`, `CrudError`) → Tasks 2, 3, 5. ✓
- List querystring `page/per_page/sort/order/q/filter[]/scope[]` → Task 3. ✓
- Error normalization 422→fieldErrors → Task 2. ✓
- Auth seam `getAuthToken` + middleware → Task 4. ✓
- Generic mock backend (paginated), pattern of `users-store` → Task 6. ✓
- Vitest unit tests (§7) → Tasks 1, 2, 3, 4, 6. ✓
- Validated by generic `categories` → Task 6. ✓
- Out of 1a (deferred to 1b): `defineResource`/registry, `<ResourceTable>`/`<ResourceForm>`, nuqs, dynamic routes, nav/RBAC/proxy wiring, optimistic UI + e2e. (Factory ships plain invalidate + toast; optimistic writes are added where the UI needs them in 1b.)

**Placeholder scan:** No TBD/TODO; every code step has complete code; every test step has real assertions. ✓

**Type consistency:** `CrudError`, `ListParams`, `ListResult`, `buildListSearchParams`, `unwrapList`, `normalizeError`, `getAuthToken`/`setAuthTokenProvider`, `createMockStore`, `createResourceApi`/`ResourceApiConfig` names match across tasks. `RouteContext<"/api/categories/[id]">` matches the file path. Store `list()` return shape (`{data, meta:{total,page,per_page}}`) matches `unwrapList` input and the `CategoryList` OpenAPI schema. ✓
