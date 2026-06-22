import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { UsersTable } from "@/components/dashboard/users-table";
import { getDictionary } from "@/lib/get-dictionary";
import { users } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.users.title };
}

export default async function UsersPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.users.title} description={t.users.description}>
        <Can permission="users:manage">
          <Button>
            <Plus className="size-4" />
            {t.users.addUser}
          </Button>
        </Can>
      </PageHeader>
      <UsersTable data={users} />
    </>
  );
}
