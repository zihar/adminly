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
      {/* `min-w-0`: tanpa ini kolom konten adalah flex item ber-`min-width:auto`,
          jadi tabel yang lebih lebar dari viewport MENDORONG lebarnya dan yang
          menggulir mendatar adalah SELURUH halaman, bukan tabelnya.
          `SiteHeader` cuma `sticky top-0` (terkunci vertikal), jadi ia ikut
          bergeser ke kiri menimpa sidebar yang `fixed` — logo tertutup judul
          halaman. Terukur pada struktur ini: scrollWidth 1696 pada viewport
          1440 → 1440 sesudah `min-w-0`. */}
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}
