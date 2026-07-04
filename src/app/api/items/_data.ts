import { createCollectionStore } from "@/app/api/_store/collection-store";

export type ItemRow = { id: string; nama: string };

export const itemsStore = createCollectionStore<ItemRow>([
  { id: "itm-1", nama: "Contoh A" },
  { id: "itm-2", nama: "Contoh B" },
]);
