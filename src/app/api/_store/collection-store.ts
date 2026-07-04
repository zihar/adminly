// Store generik in-memory untuk resource demo. Ganti dengan database sungguhan
// di produksi — lihat juga src/lib/api/users-store.ts untuk pola serupa.
export function createCollectionStore<T extends { id: string }>(seed: T[]) {
  let rows: T[] = [...seed];
  return {
    list({
      page = 1,
      perPage = 10,
      q = "",
    }: {
      page?: number;
      perPage?: number;
      q?: string;
    }) {
      const filtered = q
        ? rows.filter((r) =>
            JSON.stringify(r).toLowerCase().includes(q.toLowerCase()),
          )
        : rows;
      const start = (page - 1) * perPage;
      return {
        data: filtered.slice(start, start + perPage),
        meta: { total: filtered.length, page, per_page: perPage },
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
