import { createCollectionStore } from "@/app/api/_store/collection-store";

// `country/state/city` opsional — demo field `cascade` (Task 6/7), sumber
// opsinya resource generik `regions`. `status` — demo workflow approval (P3),
// lihat `itemsResource.workflow` di `config/resources/items.ts`.
export type ItemRow = {
  id: string;
  nama: string;
  country?: string;
  state?: string;
  city?: string;
  status: string;
};

export const itemsStore = createCollectionStore<ItemRow>([
  { id: "itm-1", nama: "Contoh A", status: "draft" },
  { id: "itm-2", nama: "Contoh B", status: "draft" },
]);
