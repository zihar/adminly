import { users as seed, type AppUser } from "@/lib/data";

// Salinan mutable di memori agar Route Handler bisa create/delete saat dev.
// Ganti dengan database sungguhan di produksi.
let store: AppUser[] = [...seed];

export function listUsers(): AppUser[] {
  return store;
}

export function createUser(input: {
  name: string;
  email: string;
  role: string;
}): AppUser {
  const user: AppUser = {
    id: `u_${Date.now()}`,
    name: input.name,
    email: input.email,
    role: input.role,
    status: "invited",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  store = [user, ...store];
  return user;
}

export function deleteUser(id: string): boolean {
  const before = store.length;
  store = store.filter((u) => u.id !== id);
  return store.length < before;
}
