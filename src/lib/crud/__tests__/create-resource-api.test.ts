import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as React from "react";
import type { createResourceApi as CreateResourceApiType } from "@/lib/crud/create-resource-api";

type Item = { id: string; nama: string };

const server = setupServer(
  http.get("http://localhost:3000/api/items", ({ request }) => {
    const url = new URL(request.url);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("per_page")).toBe("10");
    return HttpResponse.json({ data: [{ id: "1", nama: "A" }], meta: { total: 1, page: 1, per_page: 10 } });
  }),
);

// `apiClient` (src/lib/api/client.ts) resolves its base URL AND captures
// `globalThis.fetch` at module-load time (openapi-fetch defaults
// `fetch = globalThis.fetch` as a parameter default, evaluated once when
// `createClient` runs). A plain top-level `import` of create-resource-api.ts
// would evaluate (and freeze) both of those before this file's `beforeAll`
// gets a chance to run — ESM import evaluation always runs ahead of any
// same-module statement, regardless of source order.
//
// Two things must happen, in this order, before apiClient is constructed:
//   1. `server.listen()` — MSW patches `globalThis.fetch` here; if the
//      client captures fetch before this, it holds the *original*
//      unpatched function and every request bypasses MSW (real network
//      call, ECONNREFUSED).
//   2. `NEXT_PUBLIC_API_BASE_URL` must be set — `resolveBaseUrl()` reads it
//      synchronously at construction.
// So: set the env var, call `server.listen()`, THEN `vi.resetModules()` +
// dynamic `import()` to construct a fresh apiClient that sees both.
// See task-2 brief note on this known pitfall; client.ts's production
// behavior is untouched.
let createResourceApi: typeof CreateResourceApiType;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000/api");
  server.listen();
  vi.resetModules();
  ({ createResourceApi } = await import("@/lib/crud/create-resource-api"));
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function wrapperWithClient(qc: QueryClient) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  Wrapper.displayName = "TestQueryWrapper";
  return Wrapper;
}

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return wrapperWithClient(qc);
}

describe("createResourceApi.useList", () => {
  it("mengambil list & membuka wrapper {data,meta}", async () => {
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useList({ page: 1, perPage: 10 }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ rows: [{ id: "1", nama: "A" }], total: 1, page: 1, perPage: 10 });
  });
});

describe("createResourceApi error path", () => {
  it("melempar CrudError ternormalisasi saat server error", async () => {
    server.use(
      http.get("http://localhost:3000/api/items", () =>
        HttpResponse.json({ code: 422, status: "error", message: "Validasi gagal", data: { nama: ["wajib diisi"] } }, { status: 422 }),
      ),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useList({ page: 1, perPage: 10 }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({
      name: "CrudError",
      httpStatus: 422,
      message: "Validasi gagal",
      fieldErrors: { nama: ["wajib diisi"] },
    });
  });
});

describe("createResourceApi.useCreate", () => {
  it("POST lalu invalidate cache list (pola optimistic+toast+invalidate)", async () => {
    server.use(
      http.post("http://localhost:3000/api/items", async ({ request }) => {
        const body = (await request.json()) as { nama: string };
        return HttpResponse.json({ id: "2", nama: body.nama }, { status: 201 });
      }),
    );
    const api = createResourceApi<Item, { nama: string }, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useCreate(), { wrapper: wrapper() });
    result.current.mutate({ nama: "B" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "2", nama: "B" });
  });
});

describe("createResourceApi.useGetOne", () => {
  it("mengambil satu item berdasarkan id", async () => {
    server.use(
      http.get("http://localhost:3000/api/items/1", () => HttpResponse.json({ id: "1", nama: "A" })),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useGetOne("1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "1", nama: "A" });
  });
});

describe("createResourceApi.useUpdate", () => {
  it("PUT item lalu mengembalikan item terupdate", async () => {
    server.use(
      http.put("http://localhost:3000/api/items/1", async ({ request }) => {
        const body = (await request.json()) as { nama: string };
        return HttpResponse.json({ id: "1", nama: body.nama });
      }),
    );
    const api = createResourceApi<Item, unknown, { nama: string }>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useUpdate(), { wrapper: wrapper() });
    result.current.mutate({ id: "1", values: { nama: "Updated" } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: "1", nama: "Updated" });
  });
});

describe("createResourceApi.useRemove", () => {
  it("DELETE item lalu invalidate & memicu refetch list yang sudah termuat", async () => {
    let getCallCount = 0;
    server.use(
      http.get("http://localhost:3000/api/items", () => {
        getCallCount += 1;
        const first = getCallCount === 1;
        return HttpResponse.json({
          data: first ? [{ id: "1", nama: "A" }] : [],
          meta: { total: first ? 1 : 0, page: 1, per_page: 10 },
        });
      }),
      http.delete("http://localhost:3000/api/items/1", () => new HttpResponse(null, { status: 204 })),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const w = wrapperWithClient(qc);

    const list = renderHook(() => api.useList({ page: 1, perPage: 10 }), { wrapper: w });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    expect(list.result.current.data?.rows).toHaveLength(1);
    expect(getCallCount).toBe(1);

    const remove = renderHook(() => api.useRemove(), { wrapper: w });
    remove.result.current.mutate("1");
    await waitFor(() => expect(remove.result.current.isSuccess).toBe(true));

    // Query keys.all invalidation must trigger a refetch of the still-mounted list query.
    await waitFor(() => expect(getCallCount).toBe(2));
    await waitFor(() => expect(list.result.current.data?.rows).toHaveLength(0));
  });
});

describe("createResourceApi.useRemoveMany", () => {
  it("POST bulk-delete untuk banyak id", async () => {
    server.use(
      http.post("http://localhost:3000/api/items/bulk-delete", async ({ request }) => {
        const body = (await request.json()) as { ids: string[] };
        expect(body.ids).toEqual(["1", "2"]);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useRemoveMany(), { wrapper: wrapper() });
    result.current.mutate(["1", "2"]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("createResourceApi.useTransition", () => {
  it("POST transition dengan {action} lalu invalidate list/one/audit", async () => {
    let transitionBody: { action: string } | null = null;
    let getOneCallCount = 0;
    server.use(
      http.post("http://localhost:3000/api/items/1/transition", async ({ request }) => {
        transitionBody = (await request.json()) as { action: string };
        return HttpResponse.json({ id: "1", nama: "A" });
      }),
      http.get("http://localhost:3000/api/items/1", () => {
        getOneCallCount += 1;
        return HttpResponse.json({ id: "1", nama: "A" });
      }),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const w = wrapperWithClient(qc);

    const one = renderHook(() => api.useGetOne("1"), { wrapper: w });
    await waitFor(() => expect(one.result.current.isSuccess).toBe(true));
    expect(getOneCallCount).toBe(1);

    const transition = renderHook(() => api.useTransition(), { wrapper: w });
    transition.result.current.mutate({ id: "1", action: "submit" });
    await waitFor(() => expect(transition.result.current.isSuccess).toBe(true));

    expect(transitionBody).toEqual({ action: "submit" });
    // Invalidation of `keys.all`/`keys.one(id)` must trigger (>=1) refetch of the still-mounted getOne query.
    await waitFor(() => expect(getOneCallCount).toBeGreaterThan(1));
  });
});

describe("createResourceApi.useAudit", () => {
  it("mengambil audit trail berdasarkan id", async () => {
    const rows = [
      { id: "a1", entityId: "1", action: "submit", from: "draft", to: "review", actor: "u1", at: "2026-07-01T00:00:00Z" },
    ];
    server.use(
      http.get("http://localhost:3000/api/items/1/audit", () => HttpResponse.json(rows)),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useAudit("1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(rows);
  });
});

describe("createResourceApi.useOptions", () => {
  it("cascade guard: tidak fetch saat parent belum lengkap", async () => {
    let called = false;
    server.use(
      http.get("http://localhost:3000/api/items/options", () => {
        called = true;
        return HttpResponse.json([{ value: "1", label: "A" }]);
      }),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useOptions({ parent: { id_kelas: "" } }), { wrapper: wrapper() });

    // Query stays disabled the moment it mounts; give any errant async fetch a chance to surface.
    expect(result.current.fetchStatus).toBe("idle");
    await new Promise((r) => setTimeout(r, 30));
    expect(result.current.fetchStatus).toBe("idle");
    expect(called).toBe(false);
  });

  it("fetch options saat parent lengkap", async () => {
    server.use(
      http.get("http://localhost:3000/api/items/options", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("parent[id_kelas]")).toBe("5");
        return HttpResponse.json([{ value: "1", label: "A" }]);
      }),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useOptions({ parent: { id_kelas: "5" } }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ value: "1", label: "A" }]);
  });

  it("fetch options saat tidak ada parent sama sekali", async () => {
    server.use(
      http.get("http://localhost:3000/api/items/options", () =>
        HttpResponse.json([{ value: "1", label: "A" }]),
      ),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const { result } = renderHook(() => api.useOptions({}), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ value: "1", label: "A" }]);
  });
});

describe("createResourceApi.optionsQueryOptions", () => {
  it("queryKey sama dengan keys.options(params)", () => {
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    expect(api.optionsQueryOptions({}).queryKey).toEqual(api.keys.options({}));
  });

  it("queryFn (via qc.fetchQuery) mengembalikan Option[]", async () => {
    server.use(
      http.get("http://localhost:3000/api/items/options", () =>
        HttpResponse.json([{ value: "1", label: "A" }]),
      ),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const data = await qc.fetchQuery(api.optionsQueryOptions({}));
    expect(data).toEqual([{ value: "1", label: "A" }]);
  });

  it("parent menghasilkan queryKey berbeda & queryFn menambah parent[k]=v", async () => {
    server.use(
      http.get("http://localhost:3000/api/items/options", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("parent[parentId]")).toBe("x");
        return HttpResponse.json([{ value: "1", label: "A" }]);
      }),
    );
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    const emptyOpts = api.optionsQueryOptions({});
    const parentOpts = api.optionsQueryOptions({ parent: { parentId: "x" } });
    expect(parentOpts.queryKey).not.toEqual(emptyOpts.queryKey);

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const data = await qc.fetchQuery(parentOpts);
    expect(data).toEqual([{ value: "1", label: "A" }]);
  });

  it("enabled false saat ada parent dengan nilai kosong", () => {
    const api = createResourceApi<Item, unknown, unknown>({ resource: "items", path: "/items" });
    expect(api.optionsQueryOptions({ parent: { id_kelas: "" } }).enabled).toBe(false);
  });
});
