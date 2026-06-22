export type UserStatus = "active" | "invited" | "suspended";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  createdAt: string;
};

/** Data contoh. Ganti dengan fetch ke API / database sungguhan. */
export const users: AppUser[] = [
  { id: "1", name: "Andi Wijaya", email: "andi@example.com", role: "Admin", status: "active", createdAt: "2026-01-12" },
  { id: "2", name: "Bunga Lestari", email: "bunga@example.com", role: "Editor", status: "active", createdAt: "2026-02-03" },
  { id: "3", name: "Citra Dewi", email: "citra@example.com", role: "Viewer", status: "invited", createdAt: "2026-03-21" },
  { id: "4", name: "Dimas Pratama", email: "dimas@example.com", role: "Editor", status: "suspended", createdAt: "2026-03-28" },
  { id: "5", name: "Eka Saputra", email: "eka@example.com", role: "Viewer", status: "active", createdAt: "2026-04-15" },
];
