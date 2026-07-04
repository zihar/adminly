import type { ResourceDef } from "@/lib/crud/define-resource";
import type { ListParams } from "@/lib/crud/types";

/** perPage default bila resource tak menyetel `list.perPage`. */
export const DEFAULT_PER_PAGE = 20;

/**
 * `ListParams` awal yang dipakai `ResourceTable` pada render pertama.
 *
 * Dipakai BERSAMA oleh prefetch RSC (`resource-page.tsx`) dan default
 * nuqs / `useList` awal (`resource-table.tsx`) sebagai satu-satunya sumber
 * kebenaran, supaya query key kedua sisi TIDAK pernah bergeser — kalau beda,
 * cache hasil prefetch terbuang & skeleton berkedip saat paint pertama.
 *
 * `scope` sengaja tidak disertakan: nilainya berasal dari `ScopeProvider`
 * (client-only) yang tak tersedia saat prefetch di server; `undefined` juga
 * di-drop saat hashing query key sehingga tak memengaruhi kecocokan untuk
 * resource tanpa `def.scope`.
 */
export function initialListParams(def: ResourceDef): ListParams {
  return {
    page: 1,
    perPage: def.list?.perPage ?? DEFAULT_PER_PAGE,
    // `defaultSort` kosong → undefined (kolom tak terurut), samakan dgn tabel.
    sort: def.list?.defaultSort || undefined,
    order: "asc",
  };
}
