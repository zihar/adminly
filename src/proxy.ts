import { NextResponse, type NextRequest } from "next/server";

import { ROLE_COOKIE, ROUTE_PERMISSIONS, can, parseRole } from "@/config/rbac";

/**
 * Proteksi route berbasis RBAC.
 *
 * Catatan: di Next.js 16 `middleware` di-deprecate & diganti `proxy`
 * (fungsi diekspor sebagai `proxy`, default Node.js runtime).
 *
 * Di project nyata: jangan hanya andalkan proxy — verifikasi juga otorisasi
 * di Server Component / Server Action (lihat docs Data Security).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = parseRole(request.cookies.get(ROLE_COOKIE)?.value);

  const rule = ROUTE_PERMISSIONS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );

  if (rule && !can(role, rule.permission)) {
    // Tidak berhak → arahkan ke dashboard (selalu boleh untuk semua role).
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = `?denied=${encodeURIComponent(rule.prefix.slice(1))}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/users/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
