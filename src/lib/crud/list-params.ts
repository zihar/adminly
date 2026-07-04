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
 * `scope` bersifat opsional: server (`resource-page.tsx`) membaca cookie
 * scope lalu meneruskannya ke sini, sehingga bila resource mendeklarasikan
 * `def.scope`, subset scope yang sama ikut masuk ke params awal — persis
 * seperti yang disuntikkan `ResourceTable` dari `useScope()` pada render
 * pertama. Ini membuat query key prefetch (server) & `useList` awal (client)
 * TETAP cocok walau scope sedang aktif, jadi tak ada hydration miss. Kalau
 * `scope` tak diberikan (mis. dipanggil tanpa cookie), atau resource tak
 * mendeklarasikan `def.scope`, field `scope` di-drop seluruhnya — sama
 * seperti perilaku lama, dan `undefined` juga di-drop saat hashing query key.
 */
export function initialListParams(
  def: ResourceDef,
  scope?: Record<string, unknown>,
): ListParams {
  const scoped =
    def.scope?.length && scope
      ? Object.fromEntries(
          def.scope
            .map((k) => [k, scope[k]] as const)
            .filter(([, v]) => v !== undefined && v !== ""),
        )
      : undefined;
  return {
    page: 1,
    perPage: def.list?.perPage ?? DEFAULT_PER_PAGE,
    // `defaultSort` kosong → undefined (kolom tak terurut), samakan dgn tabel.
    sort: def.list?.defaultSort || undefined,
    order: "asc",
    ...(scoped && Object.keys(scoped).length ? { scope: scoped } : {}),
  };
}
