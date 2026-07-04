// Store generik in-memory untuk resource demo. Ganti dengan database sungguhan
// di produksi — lihat juga src/lib/api/users-store.ts untuk pola serupa.
export function createCollectionStore<T extends { id: string }>(seed: T[]) {
  let rows: T[] = [...seed];
  return {
    list({
      page = 1,
      perPage = 10,
      q = "",
      sort,
      order = "asc",
    }: {
      page?: number;
      perPage?: number;
      q?: string;
      sort?: string;
      order?: "asc" | "desc";
    }) {
      const filtered = q
        ? rows.filter((r) =>
            JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
          )
        : rows;
      // Urutkan bila `sort` diberikan. Salin dulu (`[...]`) supaya tidak
      // memutasi `rows` sumber; `Array.prototype.sort` stabil (spec ES2019)
      // sehingga baris dgn nilai sama menjaga urutan asal. Number-aware:
      // bandingkan numerik bila kedua nilai number, selain itu string-compare.
      const ordered = sort
        ? [...filtered].sort((a, b) => {
            const av = (a as Record<string, unknown>)[sort];
            const bv = (b as Record<string, unknown>)[sort];
            const cmp =
              typeof av === "number" && typeof bv === "number"
                ? av - bv
                : String(av ?? "").localeCompare(String(bv ?? ""));
            return order === "desc" ? -cmp : cmp;
          })
        : filtered;
      const start = (page - 1) * perPage;
      return {
        data: ordered.slice(start, start + perPage),
        meta: { total: ordered.length, page, per_page: perPage },
      };
    },
    get(id: string) {
      return rows.find((r) => r.id === id) ?? null;
    },
    create(row: T) {
      rows = [row, ...rows];
      return row;
    },
    update(id: string, patch: Partial<T>) {
      rows = rows.map((r) => (r.id === id ? { ...r, ...patch, id: r.id } : r));
      return this.get(id);
    },
    remove(id: string) {
      rows = rows.filter((r) => r.id !== id);
    },
    removeMany(ids: string[]) {
      rows = rows.filter((r) => !ids.includes(r.id));
    },
  };
}
