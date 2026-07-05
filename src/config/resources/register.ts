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
import { provinsiResource } from "@/config/resources/provinsi";
import { kabupatenResource } from "@/config/resources/kabupaten";
import { kecamatanResource } from "@/config/resources/kecamatan";
import { kelurahanResource } from "@/config/resources/kelurahan";
import { kelasResource } from "@/config/resources/kelas";
import { jambelajarResource } from "@/config/resources/jambelajar";
import { menumobileResource } from "@/config/resources/menumobile";
import { parameterResource } from "@/config/resources/parameter";
import { paramjabatanResource } from "@/config/resources/paramjabatan";
import { silabusindikatorResource } from "@/config/resources/silabusindikator";

/** Registrasi resource CRUD Edelweiss (F0 agama + F1 katalog referensi). */
let done = false;
export function ensureResourcesRegistered() {
  if (done) return;
  registerResources([agamaResource, bahasarumahResource, kewarganegaraanResource, pekerjaanResource, pendidikanResource, penilaianResource, situasibelajarResource, sliderResource, sumberResource, semesterResource, unitResource, jenisprogramResource, tahunajaranResource, provinsiResource, kabupatenResource, kecamatanResource, kelurahanResource, kelasResource, jambelajarResource, menumobileResource, parameterResource, paramjabatanResource, silabusindikatorResource]);
  done = true;
}
