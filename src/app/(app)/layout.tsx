import { cookies } from "next/headers";

import { SidebarShell } from "@/components/layout/shells/sidebar-shell";
import { TopNavShell } from "@/components/layout/shells/topnav-shell";
import { RbacProvider } from "@/components/providers/rbac-provider";
import { ScopeProvider } from "@/components/providers/scope-provider";
import { ROLE_COOKIE, parseRole } from "@/config/rbac";
import { SCOPE_COOKIE, parseScope } from "@/config/scope";
import { ensureResourcesRegistered } from "@/config/resources/register";
import {
  TEMPLATE_COOKIE,
  parseTemplate,
  templateById,
} from "@/config/templates";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Daftarkan resource CRUD generik (mis. `items`) sekali saat shell app
  // dirender di server — route dinamis `[resource]` bergantung pada registry ini.
  ensureResourcesRegistered();

  const cookieStore = await cookies();
  // Pertahankan state buka/tutup sidebar antar reload via cookie.
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  // Role aktif (DEMO) di-seed dari cookie agar konsisten dengan proxy.ts.
  const role = parseRole(cookieStore.get(ROLE_COOKIE)?.value);
  // Template menentukan kerangka navigasi — karena itu dibaca di SERVER:
  // shell berbeda = markup berbeda, tak bisa ditunda ke client tanpa bikin
  // kerangka halaman berkedip tiap load.
  const def = templateById(
    parseTemplate(cookieStore.get(TEMPLATE_COOKIE)?.value),
  );

  return (
    <RbacProvider initialRole={role}>
      <ScopeProvider initial={parseScope(cookieStore.get(SCOPE_COOKIE)?.value)}>
        {def.shell === "topnav" ? (
          <TopNavShell>{children}</TopNavShell>
        ) : (
          <SidebarShell defaultOpen={defaultOpen}>{children}</SidebarShell>
        )}
      </ScopeProvider>
    </RbacProvider>
  );
}
