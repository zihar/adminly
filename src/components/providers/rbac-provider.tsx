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

  React.useEffect(() => {
    // apiClient (client) mengirim Bearer dari cookie token pada tiap request.
    setAuthTokenProvider(() => getToken());
  }, []);

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
