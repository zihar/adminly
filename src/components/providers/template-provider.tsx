"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  TEMPLATE_COOKIE,
  templateById,
  type TemplateId,
} from "@/config/templates";

type Ctx = {
  template: TemplateId;
  setTemplate: (next: TemplateId) => void;
};

const TemplateContext = React.createContext<Ctx | null>(null);

/**
 * Menyediakan template aktif ke Client Component. `initialTemplate` di-seed
 * dari cookie di server (root layout) agar konsisten dengan render server —
 * pola sama dengan `I18nProvider`.
 *
 * Melempar error bila dipakai di luar provider (beda dengan `useScope`):
 * tidak ada perilaku bawaan yang masuk akal untuk "template aktif", dan
 * diam-diam memakai default akan menyembunyikan shell yang salah pasang.
 */
export function TemplateProvider({
  initialTemplate,
  children,
}: {
  initialTemplate: TemplateId;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [template, setState] = React.useState<TemplateId>(initialTemplate);

  const setTemplate = React.useCallback(
    (next: TemplateId) => {
      const def = templateById(next);
      // 1. Pasang atribut lebih dulu supaya warna berganti SEKETIKA. Tanpa
      //    ini pergantian menunggu `router.refresh()` selesai dan terasa
      //    tersendat — shell dirender di server, jadi refresh tak terhindar.
      const el = document.documentElement;
      el.dataset.template = def.id;
      el.dataset.density = def.density;
      el.dataset.surface = def.surface;

      setState(next);
      document.cookie = `${TEMPLATE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // 2. Re-render Server Component agar shell (sidebar vs top-nav) ikut.
      router.refresh();
    },
    [router],
  );

  const value = React.useMemo<Ctx>(
    () => ({ template, setTemplate }),
    [template, setTemplate],
  );

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate(): Ctx {
  const ctx = React.useContext(TemplateContext);
  if (!ctx) {
    throw new Error("useTemplate harus dipakai di dalam <TemplateProvider>");
  }
  return ctx;
}
