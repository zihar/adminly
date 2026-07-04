import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
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
