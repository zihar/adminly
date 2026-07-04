"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { SCOPE_COOKIE } from "@/config/scope";

type ScopeValue = Record<string, unknown>;
type Ctx = { scope: ScopeValue; setScope: (patch: ScopeValue) => void };

const ScopeContext = React.createContext<Ctx | null>(null);

/**
 * Menyediakan "scope" global generik (mis. `workspace`) yang dipakai resource
 * untuk memfilter data (`ListParams.scope`) & sebagai default tersembunyi di
 * form. Tidak melempar error bila dipakai tanpa provider — `def.scope`
 * bersifat opsional per resource, jadi `ResourceTable` tetap harus jalan
 * normal walau `<ScopeProvider>` belum dipasang di shell.
 */
export function ScopeProvider({
  initial = {},
  children,
}: {
  initial?: ScopeValue;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [scope, setScopeState] = React.useState<ScopeValue>(initial);
  const setScope = React.useCallback(
    (patch: ScopeValue) => {
      setScopeState((s) => {
        const next: ScopeValue = { ...s };
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === "") delete next[k];
          else next[k] = v;
        }
        document.cookie = `${SCOPE_COOKIE}=${encodeURIComponent(
          JSON.stringify(next),
        )}; path=/; max-age=31536000; samesite=lax`;
        return next;
      });
      // Re-render Server Components (mis. prefetch list) agar ikut scope baru.
      router.refresh();
    },
    [router],
  );
  const value = React.useMemo(() => ({ scope, setScope }), [scope, setScope]);
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): Ctx {
  const ctx = React.useContext(ScopeContext);
  return ctx ?? { scope: {}, setScope: () => {} };
}
