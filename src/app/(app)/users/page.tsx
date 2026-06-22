import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { UsersTable } from "@/components/dashboard/users-table";
import { users } from "@/lib/data";

export const metadata: Metadata = { title: "Pengguna" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Pengguna" description="Kelola pengguna dan aksesnya.">
        <Can permission="users:manage">
          <Button>
            <Plus className="size-4" />
            Tambah Pengguna
          </Button>
        </Can>
      </PageHeader>
      <UsersTable data={users} />
    </>
  );
}
