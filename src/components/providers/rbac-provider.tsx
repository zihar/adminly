"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { hasPermission, type Permission } from "@/config/rbac";
import { setAuthTokenProvider } from "@/lib/api/auth";
import { getToken, getSessionPermissions, clearSession } from "@/lib/session";

type RbacContextValue = {
  permissions: string[];
  can: (permission: Permission) => boolean;
  logout: () => void;
};

const RbacContext = React.createContext<RbacContextValue | null>(null);

/**
 * Menyediakan permission sesi (dari /auth/login, disimpan di cookie) ke seluruh
 * UI. `initialPermissions` di-seed dari cookie di server (lihat `(app)/layout.tsx`)
 * agar konsisten dengan `proxy.ts`. Juga menyambungkan token JWT ke apiClient.
 */
export function RbacProvider({
  initialPermissions,
  children,
}: {
  initialPermissions: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [permissions, setPermissions] = React.useState<string[]>(initialPermissions);

  React.useEffect(() => {
    // apiClient (client) mengirim Bearer dari cookie token pada tiap request.
    setAuthTokenProvider(() => getToken());
    // Sinkronkan dari cookie (mis. sesaat setelah login di tab yang sama).
    const fromCookie = getSessionPermissions();
    if (fromCookie.length) setPermissions(fromCookie);
  }, []);

  const logout = React.useCallback(() => {
    clearSession();
    setPermissions([]);
    router.push("/login");
    router.refresh();
  }, [router]);

  const value = React.useMemo<RbacContextValue>(
    () => ({ permissions, can: (permission) => hasPermission(permissions, permission), logout }),
    [permissions, logout],
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
