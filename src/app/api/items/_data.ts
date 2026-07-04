import { createCollectionStore } from "@/app/api/_store/collection-store";

// `country/state/city` opsional — demo field `cascade` (Task 6/7), sumber
// opsinya resource generik `regions`.
export type ItemRow = { id: string; nama: string; country?: string; state?: string; city?: string };

export const itemsStore = createCollectionStore<ItemRow>([
  { id: "itm-1", nama: "Contoh A" },
  { id: "itm-2", nama: "Contoh B" },
]);
