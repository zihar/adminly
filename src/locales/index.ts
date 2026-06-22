import type { Locale } from "@/config/i18n";
import { en, type Dictionary } from "./en";
import { id } from "./id";

export const dictionaries: Record<Locale, Dictionary> = { en, id };

export type { Dictionary };

/** Ganti placeholder `{name}` dst. pada string kamus. */
export function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}
