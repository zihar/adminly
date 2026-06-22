"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  ROLE_COOKIE,
  can as roleCan,
  type Permission,
  type Role,
} from "@/config/rbac";

type RbacContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  can: (permission: Permission) => boolean;
};

const RbacContext = React.createContext<RbacContextValue | null>(null);

/**
 * Menyediakan role aktif ke seluruh UI. `initialRole` di-seed dari cookie di
 * server (lihat `(app)/layout.tsx`) supaya konsisten dengan `proxy.ts`.
 */
export function RbacProvider({
  initialRole,
  children,
}: {
  initialRole: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRoleState] = React.useState<Role>(initialRole);

  const setRole = React.useCallback(
    (next: Role) => {
      setRoleState(next);
      // Simpan ke cookie agar proxy & Server Component ikut memakai role baru.
      document.cookie = `${ROLE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // Re-render route saat ini agar proteksi route dievaluasi ulang.
      router.refresh();
    },
    [router],
  );

  const value = React.useMemo<RbacContextValue>(
    () => ({ role, setRole, can: (permission) => roleCan(role, permission) }),
    [role, setRole],
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
