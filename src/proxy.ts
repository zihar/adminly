import { NextResponse, type NextRequest } from "next/server";

import {
  ROUTE_PERMISSIONS,
  PERMS_COOKIE,
  parsePermissions,
  hasPermission,
  resolveResourceRoute,
} from "@/config/rbac";
import { ensureResourcesRegistered } from "@/config/resources/register";

/**
 * Proteksi route berbasis RBAC (F2): permission sesi dari cookie (di-set saat
 * /auth/login). Belum login → /login; login tapi tak berhak → /dashboard.
 *
 * Catatan: proxy = pengganti middleware (Next 16). Enforcement asli tetap di
 * backend (PermissionGuard) — ini hanya UX gating.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const perms = parsePermissions(request.cookies.get(PERMS_COOKIE)?.value);

  ensureResourcesRegistered();

  const staticRule = ROUTE_PERMISSIONS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  const rule = staticRule ?? resolveResourceRoute(pathname);

  // Rute terproteksi tapi belum login → arahkan ke login.
  if (rule && perms.length === 0) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Login tapi tak punya permission → dashboard (selalu boleh) + tanda denied.
  if (rule && !hasPermission(perms, rule.permission)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = `?denied=${encodeURIComponent(rule.prefix.slice(1))}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|login(?:/|$)).*)"],
};
