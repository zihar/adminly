import type { ResourceDef } from "@/lib/crud/define-resource";

/**
 * Registry menyimpan resource dari berbagai `TItem`/`TNew`/`TUpdate` yang
 * berbeda-beda (heterogen), jadi disimpan type-erased sebagai `any` di sini.
 * Tiap `defineResource(...)` di titik pemanggilannya tetap fully-typed;
 * `any` hanya dipakai pada boundary registry ini.
 */
type AnyResourceDef = ResourceDef<any, any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const registry = new Map<string, AnyResourceDef>();

export function registerResources(list: AnyResourceDef[]) {
  for (const def of list) {
    if (registry.has(def.name)) throw new Error(`Resource duplikat: ${def.name}`);
    registry.set(def.name, def);
  }
}
export function getResource(name: string): AnyResourceDef | undefined { return registry.get(name); }
export function allResources(): AnyResourceDef[] { return [...registry.values()]; }
/** Hanya untuk test. */
export function _resetRegistry() { registry.clear(); }
