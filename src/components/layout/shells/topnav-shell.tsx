import { TopNav } from "@/components/layout/top-nav";
import { SiteFooter } from "@/components/layout/site-footer";

/**
 * Shell "topnav" — navigasi horizontal, konten selebar layar, tanpa sidebar.
 */
export function TopNavShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <TopNav />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 md:p-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
