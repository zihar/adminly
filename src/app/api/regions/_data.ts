import { createCollectionStore } from "@/app/api/_store/collection-store";

export type Region = { id: string; name: string; parentId: string };

// Hierarki generik 3 level: country → state → city (parentId "" = root).
export const regionsData: Region[] = [
  { id: "c1", name: "Country A", parentId: "" },
  { id: "c2", name: "Country B", parentId: "" },
  { id: "s1", name: "State A1", parentId: "c1" },
  { id: "s2", name: "State A2", parentId: "c1" },
  { id: "s3", name: "State B1", parentId: "c2" },
  { id: "t1", name: "City A1a", parentId: "s1" },
  { id: "t2", name: "City A1b", parentId: "s1" },
  { id: "t3", name: "City A2a", parentId: "s2" },
];

export const regionsStore = createCollectionStore<Region>(regionsData);
