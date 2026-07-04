import { registerResources } from "@/config/resources/index";
import { itemsResource } from "@/config/resources/items";

/**
 * Registrasi semua resource CRUD generik ke registry, sekali per proses
 * server. Dipanggil dari route dinamis `[resource]`/layout app — modul route
 * bisa dieksekusi berkali-kali dalam siklus hidup server yang sama, jadi
 * guard `done` mencegah `registerResources` melempar "Resource duplikat".
 */
let done = false;
export function ensureResourcesRegistered() {
  if (done) return;
  registerResources([itemsResource]);
  done = true;
}
