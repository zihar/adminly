"use client";

import * as React from "react";

import { useRbac } from "@/components/providers/rbac-provider";
import type { Permission } from "@/config/rbac";

/**
 * Render `children` hanya jika role aktif punya `permission`.
 * Contoh: <Can permission="users:manage"><Button>Hapus</Button></Can>
 */
export function Can({
  permission,
  fallback = null,
  children,
}: {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { can } = useRbac();
  return <>{can(permission) ? children : fallback}</>;
}
