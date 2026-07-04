/**
 * Konfigurasi RBAC (Role-Based Access Control).
 *
 * File ini sengaja "pure" (tanpa import React/Node) supaya bisa dipakai di mana
 * saja: Server Component, Client Component, maupun `proxy.ts` (edge/server).
 *
 * Cara memakai di project nyata:
 * - Ganti sumber role: ambil dari sesi/JWT user, bukan dari cookie demo.
 * - Sesuaikan daftar Permission + pemetaan ROLE_PERMISSIONS sesuai kebutuhan.
 */

import { allResources } from "@/config/resources/index";

export const ROLES = ["Admin", "Editor", "Viewer"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "dashboard:view"
  | "analytics:view"
  | "users:manage"
  | "settings:manage"
  | "items:view"
  | "items:create"
  | "items:update"
  | "items:delete";

/** Permission yang dimiliki tiap role. Admin = superset. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Admin: [
    "dashboard:view",
    "analytics:view",
    "users:manage",
    "settings:manage",
    "items:view",
    "items:create",
    "items:update",
    "items:delete",
  ],
  Editor: ["dashboard:view", "analytics:view", "items:view", "items:create", "items:update"],
  Viewer: ["dashboard:view", "items:view"],
};

/** Apakah `role` punya `permission`? */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Pemetaan prefix route → permission yang dibutuhkan. Dipakai oleh `proxy.ts`
 * untuk memblokir akses halaman. Urutan tidak penting (dicek per-prefix).
 */
export const ROUTE_PERMISSIONS: { prefix: string; permission: Permission }[] = [
  { prefix: "/analytics", permission: "analytics:view" },
  { prefix: "/users", permission: "users:manage" },
  { prefix: "/settings", permission: "settings:manage" },
  { prefix: "/dashboard", permission: "dashboard:view" },
];

/**
 * Pemetaan prefix route → permission untuk resource CRUD generik dari
 * registry (`allResources()`), supaya route `/[resource]` otomatis
 * terproteksi tanpa perlu didaftarkan manual di `ROUTE_PERMISSIONS`.
 *
 * Didefinisikan di sini (bukan `site.ts`) supaya `proxy.ts` bisa
 * mengimpornya tanpa ikut menarik modul UI (ikon dsb.) — `config/resources`
 * sendiri adalah registry murni (Map), tanpa import React.
 */
export function resourceRoutePermissions(): { prefix: string; permission: Permission }[] {
  return allResources().map((r) => ({ prefix: `/${r.name}`, permission: r.permissions.view }));
}

/** Nama cookie penyimpan role (DEMO — di produksi pakai sesi sungguhan). */
export const ROLE_COOKIE = "adminly_role";
export const DEFAULT_ROLE: Role = "Admin";

/** Validasi nilai cookie → Role yang aman (fallback ke DEFAULT_ROLE). */
export function parseRole(value: string | undefined | null): Role {
  return ROLES.includes(value as Role) ? (value as Role) : DEFAULT_ROLE;
}
