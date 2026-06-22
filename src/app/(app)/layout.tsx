import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RbacProvider } from "@/components/providers/rbac-provider";
import { ROLE_COOKIE, parseRole } from "@/config/rbac";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pertahankan state buka/tutup sidebar antar reload via cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  // Role aktif (DEMO) di-seed dari cookie agar konsisten dengan proxy.ts.
  const role = parseRole(cookieStore.get(ROLE_COOKIE)?.value);

  return (
    <RbacProvider initialRole={role}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            {children}
          </main>
          <SiteFooter />
        </SidebarInset>
      </SidebarProvider>
    </RbacProvider>
  );
}
