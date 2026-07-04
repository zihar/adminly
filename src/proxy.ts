import { NextResponse, type NextRequest } from "next/server";

import { ROLE_COOKIE, ROUTE_PERMISSIONS, can, parseRole, resourceRoutePermissions } from "@/config/rbac";
import { ensureResourcesRegistered } from "@/config/resources/register";

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

  // Isi registry (idempotent) supaya rule permission resource CRUD generik
  // (mis. `items`, didaftarkan lewat `defineResource`) ikut diperiksa di sini
  // — bukan hanya rule statis di `ROUTE_PERMISSIONS`.
  ensureResourcesRegistered();
  const rules = [...ROUTE_PERMISSIONS, ...resourceRoutePermissions()];

  const rule = rules.find(
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
  // Matcher statis Next.js tidak bisa dihitung dari registry saat build, jadi
  // dilebarkan ke semua route KECUALI aset/infra (api, _next, favicon) & rute
  // publik (login) — permission tetap dicek per-request di atas lewat rule
  // gabungan (statis + `resourceRoutePermissions()`). Ini yang membuat resource
  // baru otomatis terproteksi tanpa perlu update matcher secara manual.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
