import { createCollectionStore } from "@/app/api/_store/collection-store";

// `country/state/city` opsional — demo field `cascade` (Task 6/7), sumber
// opsinya resource generik `regions`. `status` — demo workflow approval (P3),
// lihat `itemsResource.workflow` di `config/resources/items.ts`. `catatan`/
// `tanggal`/`aktif`/`prioritas` — demo field textarea/date/checkbox/select
// baru (Task 6), lihat tab "items.detailTab" di form.
export type ItemRow = {
  id: string;
  nama: string;
  country?: string;
  state?: string;
  city?: string;
  status: string;
  catatan?: string;
  tanggal?: string;
  aktif?: boolean;
  prioritas?: string;
  // Demo field `file` (Task 5) — URL hasil unggah `/api/uploads` (Task 1),
  // disimpan lewat dropzone `FileField` (Task 2).
  lampiran?: string;
  // Demo kolom `render:"relation"` (Task 4, rencana `relation-label`) — id
  // region TOP-LEVEL (`parentId === ""`) dari `regions/_data.ts`, karena
  // `RelationCell`/export me-resolve via `useOptions({})` (tanpa `parent`),
  // yang cuma mengembalikan region root (`c1`/`c2`). Opsional supaya jalur
  // fallback nilai-mentah/kosong tetap teruji lewat item yang tak diisi.
  regionId?: string;
};

export const itemsStore = createCollectionStore<ItemRow>([
  { id: "itm-1", nama: "Contoh A", status: "draft", tanggal: "2024-01-15", aktif: true, prioritas: "high", regionId: "c1" },
  // `prioritas: "low"` — beda dgn `itm-1` ("high") supaya tes filter
  // `filter[prioritas]` (Task 1 Filter UI) bermakna (bukan cuma 1 nilai unik).
  { id: "itm-2", nama: "Contoh B", status: "draft", prioritas: "low", regionId: "c2" },
]);
