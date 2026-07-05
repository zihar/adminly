import { registerResources } from "@/config/resources/index";
import { agamaResource } from "@/config/resources/agama";
import { bahasarumahResource } from "@/config/resources/bahasarumah";
import { kewarganegaraanResource } from "@/config/resources/kewarganegaraan";
import { pekerjaanResource } from "@/config/resources/pekerjaan";
import { pendidikanResource } from "@/config/resources/pendidikan";
import { penilaianResource } from "@/config/resources/penilaian";
import { situasibelajarResource } from "@/config/resources/situasibelajar";
import { sliderResource } from "@/config/resources/slider";
import { sumberResource } from "@/config/resources/sumber";
import { semesterResource } from "@/config/resources/semester";
import { unitResource } from "@/config/resources/unit";
import { jenisprogramResource } from "@/config/resources/jenisprogram";
import { tahunajaranResource } from "@/config/resources/tahunajaran";

/** Registrasi resource CRUD Edelweiss (F0 agama + F1 katalog referensi). */
let done = false;
export function ensureResourcesRegistered() {
  if (done) return;
  registerResources([agamaResource, bahasarumahResource, kewarganegaraanResource, pekerjaanResource, pendidikanResource, penilaianResource, situasibelajarResource, sliderResource, sumberResource, semesterResource, unitResource, jenisprogramResource, tahunajaranResource]);
  done = true;
}
