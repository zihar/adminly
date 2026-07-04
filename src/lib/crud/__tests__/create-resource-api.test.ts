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
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api";
  server.listen();
  vi.resetModules();
  ({ createResourceApi } = await import("@/lib/crud/create-resource-api"));
});
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

describe("createResourceApi error path", () => {
  it("melempar CrudError ternormalisasi saat server error", async () => {
    server.use(
      http.get("http://localhost:3000/api/items", () =>
        HttpResponse.json({ message: "Validasi gagal", errors: { nama: ["wajib diisi"] } }, { status: 422 }),
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
