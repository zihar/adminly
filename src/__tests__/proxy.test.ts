import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { z } from "zod";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";
import { ROLE_COOKIE } from "@/config/rbac";
import { ensureResourcesRegistered } from "@/config/resources/register";
import { _resetRegistry, registerResources } from "@/config/resources/index";
import { itemsResource } from "@/config/resources/items";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";

/**
 * Test langsung terhadap `proxy()` (bukan cuma `resourceRoutePermissions()`
 * yang pure) — membuktikan cabang deny→redirect BENAR-BENAR jalan saat
 * dieksekusi sebagai route guard, bukan cuma diturunkan dengan benar.
 */

/** Bikin `NextRequest` ke `pathname` dengan cookie role (opsional). */
function requestFor(pathname: string, role?: string): NextRequest {
  const init = role ? { headers: { cookie: `${ROLE_COOKIE}=${role}` } } : undefined;
  return new NextRequest(new URL(`http://localhost${pathname}`), init);
}

/** True kalau response adalah redirect ke `/dashboard` (hasil deny `proxy()`). */
function isDeniedRedirect(res: Response): boolean {
  const location = res.headers.get("location");
  if (!location) return false;
  const isRedirectStatus = res.status === 307 || res.status === 308;
  return isRedirectStatus && new URL(location).pathname === "/dashboard";
}

describe("proxy (route guard RBAC)", () => {
  beforeAll(() => {
    // Pastikan resource asli (items) terdaftar — `proxy()` memanggil
    // `ensureResourcesRegistered()` sendiri tiap request, jadi cukup panggil
    // sekali di sini supaya registry tidak kosong utk test dashboard/users.
    ensureResourcesRegistered();
  });

  it("route built-in: role tanpa permission ditolak & di-redirect ke /dashboard (Viewer -> /users)", () => {
    const res = proxy(requestFor("/users", "Viewer"));
    expect(res.status === 307 || res.status === 308).toBe(true);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/dashboard");
    expect(isDeniedRedirect(res)).toBe(true);
  });

  it("route built-in: role dengan permission diloloskan (Admin -> /users)", () => {
    const res = proxy(requestFor("/users", "Admin"));
    expect(isDeniedRedirect(res)).toBe(false);
    expect(res.headers.get("location")).toBeNull();
  });

  it("dashboard selalu boleh diakses semua role (mis. Viewer -> /dashboard)", () => {
    const res = proxy(requestFor("/dashboard", "Viewer"));
    expect(isDeniedRedirect(res)).toBe(false);
    expect(res.headers.get("location")).toBeNull();
  });

  describe("route resource dari registry (resourceRoutePermissions)", () => {
    // Resource asli (`items`) punya `items:view`, yang dimiliki SEMUA role
    // seed — jadi tidak bisa membuktikan cabang deny lewat `/items` tanpa
    // memutasi data role global. Sebagai gantinya, daftarkan resource
    // throwaway dengan permission yang cuma dimiliki Admin (`settings:manage`
    // — literal `Permission` yang sudah ada, bukan `any`), supaya rule yang
    // dipakai utk menolak benar-benar datang dari `resourceRoutePermissions()`
    // (bukan `ROUTE_PERMISSIONS` bawaan). Registry di-reset & resource asli
    // dikembalikan di `afterEach` supaya tidak bocor ke test lain.
    const testResource = defineResource({
      name: "proxy-test-resource",
      path: "/proxy-test-resource",
      api: createResourceApi<{ id: string }>({
        resource: "proxy-test-resource",
        path: "/proxy-test-resource",
      }),
      permissions: {
        view: "settings:manage",
        create: "settings:manage",
        update: "settings:manage",
        delete: "settings:manage",
      },
      columns: [{ field: "id", labelKey: "id" }],
      form: { schema: z.object({}), layout: [], fields: {} },
    });

    afterEach(() => {
      _resetRegistry();
      registerResources([itemsResource]);
    });

    it("ditolak & di-redirect ke /dashboard kalau role tak punya permission resource (Viewer -> /proxy-test-resource)", () => {
      registerResources([testResource]);
      const res = proxy(requestFor("/proxy-test-resource", "Viewer"));
      expect(isDeniedRedirect(res)).toBe(true);
    });

    it("diloloskan kalau role punya permission resource (Admin -> /proxy-test-resource)", () => {
      registerResources([testResource]);
      const res = proxy(requestFor("/proxy-test-resource", "Admin"));
      expect(isDeniedRedirect(res)).toBe(false);
    });
  });
});
