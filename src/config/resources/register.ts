import { registerResources } from "@/config/resources/index";
import { agamaResource } from "@/config/resources/agama";

/**
 * Registrasi resource CRUD Edelweiss ke registry, sekali per proses server.
 * Guard `done` mencegah "Resource duplikat" saat modul route dieksekusi ulang.
 */
let done = false;
export function ensureResourcesRegistered() {
  if (done) return;
  registerResources([agamaResource]);
  done = true;
}
