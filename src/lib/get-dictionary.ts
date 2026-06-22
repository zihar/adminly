import "server-only";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, parseLocale, type Locale } from "@/config/i18n";
import { dictionaries, type Dictionary } from "@/locales";

/** Locale aktif dari cookie (server). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
}

/** Kamus untuk locale aktif (server). Dipakai di Server Component. */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}
