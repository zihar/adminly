"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { LOCALE_COOKIE, type Locale } from "@/config/i18n";
import { dictionaries, type Dictionary } from "@/locales";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Kamus locale aktif. Pakai: `const { t } = useI18n(); t.nav.dashboard`. */
  t: Dictionary;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

/**
 * Menyediakan kamus locale aktif ke Client Component. `initialLocale` di-seed
 * dari cookie di server (root layout) agar konsisten dengan render server.
 */
export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const setLocale = React.useCallback(
    (next: Locale) => {
      setLocaleState(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      // Re-render server components agar teks server ikut berganti bahasa.
      router.refresh();
    },
    [router],
  );

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n harus dipakai di dalam <I18nProvider>");
  }
  return ctx;
}
