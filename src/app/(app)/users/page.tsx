import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { UsersTable } from "@/components/dashboard/users-table";
import { getDictionary } from "@/lib/get-dictionary";
import { getQueryClient } from "@/lib/query/get-query-client";
import { usersQueryOptions } from "@/hooks/api/use-users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.users.title };
}

export default async function UsersPage() {
  const t = await getDictionary();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(usersQueryOptions());

  return (
    <>
      <PageHeader title={t.users.title} description={t.users.description} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <UsersTable />
      </HydrationBoundary>
    </>
  );
}
