import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ResourceTableBoundary } from "@/components/crud/resource-table-boundary";
import { PageHeader } from "@/components/layout/page-header";
import { SCOPE_COOKIE, parseScope } from "@/config/scope";
import { getResource } from "@/config/resources/index";
import { getDictionary } from "@/lib/get-dictionary";
import { initialListParams } from "@/lib/crud/list-params";
import { getQueryClient } from "@/lib/query/get-query-client";
import { resolveLabel } from "@/locales";

/**
 * Halaman list generik untuk satu resource CRUD (Server Component).
 *
 * Pola sama dengan `src/app/(app)/users/page.tsx`: prefetch halaman pertama
 * di server lalu hydrate ke `ResourceTable` (client) lewat
 * `HydrationBoundary`. Resource tak dikenal (bukan di registry) → 404.
 */
export async function ResourcePage({ resource }: { resource: string }) {
  const def = getResource(resource);
  if (!def) notFound();

  const t = await getDictionary();
  const queryClient = getQueryClient();
  // Baca cookie scope global di server (mis. `workspace` terpilih) supaya
  // subset `def.scope` ikut masuk ke params awal — sama dgn yang disuntikkan
  // `ResourceTable` dari `useScope()` pada render pertama. Tanpa ini, saat
  // scope aktif, query key prefetch (tanpa scope) tak akan cocok dgn query
  // key `useList` pertama (dgn scope) → cache prefetch terbuang.
  const store = await cookies();
  const scope = parseScope(store.get(SCOPE_COOKIE)?.value);
  // Prefetch pakai params awal yang IDENTIK dgn render pertama `ResourceTable`
  // (lihat `initialListParams`) supaya query key cocok → hasil prefetch benar-
  // benar dipakai saat hydrate (tanpa refetch/skeleton di paint pertama).
  await queryClient.prefetchQuery(
    def.api.listQueryOptions(initialListParams(def, scope)),
  );

  return (
    <div className="space-y-4">
      <PageHeader title={resolveLabel(t, `${def.name}.title`)} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ResourceTableBoundary resource={resource} />
      </HydrationBoundary>
    </div>
  );
}
