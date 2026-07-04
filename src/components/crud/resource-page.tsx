import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { ResourceTableBoundary } from "@/components/crud/resource-table-boundary";
import { PageHeader } from "@/components/layout/page-header";
import { getResource } from "@/config/resources/index";
import { getDictionary } from "@/lib/get-dictionary";
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
  const perPage = def.list?.perPage ?? 20;
  await queryClient.prefetchQuery(def.api.listQueryOptions({ page: 1, perPage }));

  return (
    <div className="space-y-4">
      <PageHeader title={resolveLabel(t, `${def.name}.title`)} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ResourceTableBoundary resource={resource} />
      </HydrationBoundary>
    </div>
  );
}
