/**
 * Konfigurasi i18n (pure — aman dipakai di server, client, maupun proxy).
 *
 * Pendekatan: dictionary + cookie (locale TIDAK di URL). Cocok untuk internal
 * tool yang tak butuh SEO multi-locale. Default = English.
 * Di project yang butuh SEO, pertimbangkan routing `app/[lang]/` sesuai
 * guide Next.js: node_modules/next/dist/docs/01-app/02-guides/internationalization.md
 */

export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "adminly_locale";

/** Label tampil di language switcher. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  id: "Indonesia",
};

/** Validasi nilai cookie → Locale yang aman (fallback ke DEFAULT_LOCALE). */
export function parseLocale(value: string | undefined | null): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}
