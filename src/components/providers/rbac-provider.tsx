"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { hasPermission, type Permission } from "@/config/rbac";
import { setAuthTokenProvider } from "@/lib/api/auth";
import { getToken, clearSession } from "@/lib/session";

type RbacContextValue = {
  permissions: string[];
  can: (permission: Permission) => boolean;
  logout: () => void;
};

const RbacContext = React.createContext<RbacContextValue | null>(null);

// Set saat module-load (client): apiClient membawa Bearer dari cookie SEBELUM
// fetch pertama → hindari race 401→/login. Di server getToken()=null (SSR
// prefetch tanpa token → 401, tapi client refetch bawa token).
setAuthTokenProvider(() => getToken());

/**
 * Menyediakan permission sesi ke seluruh UI. `initialPermissions` di-seed dari
 * cookie di server (`(app)/layout.tsx`) — setelah login, `router.refresh()`
 * membuat server membaca cookie baru → prop ini ikut ter-update. Juga
 * menyambungkan token JWT ke apiClient.
 */
export function RbacProvider({
  initialPermissions,
  children,
}: {
  initialPermissions: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();

  const logout = React.useCallback(() => {
    clearSession();
    router.push("/login");
    router.refresh();
  }, [router]);

  const value = React.useMemo<RbacContextValue>(
    () => ({
      permissions: initialPermissions,
      can: (permission) => hasPermission(initialPermissions, permission),
      logout,
    }),
    [initialPermissions, logout],
  );

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
}

export function useRbac() {
  const ctx = React.useContext(RbacContext);
  if (!ctx) {
    throw new Error("useRbac harus dipakai di dalam <RbacProvider>");
  }
  return ctx;
}
