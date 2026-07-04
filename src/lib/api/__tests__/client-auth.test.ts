import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

import { setAuthTokenProvider } from "@/lib/api/auth";

const server = setupServer();
beforeAll(() => { process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3000/api"; server.listen(); });
afterEach(() => {
  server.resetHandlers();
  // Reset singleton provider modul supaya test lain tidak kebocoran state (order-independent).
  setAuthTokenProvider(() => null);
});
afterAll(() => server.close());

describe("apiClient auth middleware", () => {
  it("tanpa header Authorization saat memakai provider default bawaan (belum di-set)", async () => {
    // Sengaja TIDAK memanggil setAuthTokenProvider di sini — menguji default asli dari auth.ts.
    const { apiClient } = await import("@/lib/api/client");
    let seen: string | null = "x";
    server.use(http.get("http://localhost:3000/api/items", ({ request }) => {
      seen = request.headers.get("authorization");
      return HttpResponse.json({ data: [], meta: { total: 0, page: 1, per_page: 10 } });
    }));
    await apiClient.GET("/items" as never);
    expect(seen).toBeNull();
  });

  it("menyertakan header Authorization saat token tersedia", async () => {
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

  it("redirect ke /login saat respons 401 diterima", async () => {
    const { apiClient } = await import("@/lib/api/client");
    const originalLocation = window.location;
    // jsdom tidak mengimplementasikan navigasi sungguhan (assignment ke href akan
    // memicu error "Not implemented: navigation"). Ganti window.location dengan
    // objek tiruan yang writable agar assignment bisa diamati tanpa efek samping,
    // lalu kembalikan aslinya di akhir test.
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: "" },
    });
    try {
      server.use(http.get("http://localhost:3000/api/items", () => new HttpResponse(null, { status: 401 })));
      await apiClient.GET("/items" as never);
      expect(window.location.href).toBe("/login");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        writable: true,
        value: originalLocation,
      });
    }
  });
});
