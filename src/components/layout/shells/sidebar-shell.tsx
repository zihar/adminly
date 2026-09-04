import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Shell "sidebar" — kerangka bawaan Adminly. Server Component: `SidebarProvider`
 * dan `AppSidebar` adalah Client Component yang dirender dari sini.
 *
 * `defaultOpen` dibaca dari cookie oleh `(app)/layout.tsx`, bukan di sini,
 * supaya shell tidak perlu tahu apa-apa soal cookie.
 */
export function SidebarShell({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
