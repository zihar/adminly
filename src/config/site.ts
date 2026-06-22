import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Konfigurasi global aplikasi. Ganti nilai-nilai di sini saat memakai
 * starter ini untuk project baru — selebihnya UI ikut menyesuaikan.
 */
export const siteConfig = {
  name: "Adminly",
  description: "Starter dashboard untuk internal tool — siap di-fork tiap project baru.",
};

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

/** Item navigasi utama di sidebar. */
export const navMain: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Pengguna", href: "/users", icon: Users },
  { title: "Analitik", href: "/analytics", icon: BarChart3 },
  { title: "Pengaturan", href: "/settings", icon: Settings },
];
