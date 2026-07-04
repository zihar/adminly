import { describe, it, expect } from 'vitest';
import { createCollectionStore } from '../collection-store';

describe('collection-store', () => {
  describe('update', () => {
    it('should not allow patch to overwrite the primary id field', () => {
      const store = createCollectionStore<{ id: string; nama: string }>([
        { id: 'a', nama: 'A' },
      ]);

      // Attempt to update with a patch that includes id: "hacked"
      store.update('a', { nama: 'Updated', id: 'hacked' });

      // The row should still have the original id
      const row = store.get('a');
      expect(row).not.toBeNull();
      expect(row?.id).toBe('a');
      expect(row?.nama).toBe('Updated');

      // The row should not be findable by the attempted "hacked" id
      const hackedRow = store.get('hacked');
      expect(hackedRow).toBeNull();
    });

    it('should update normal fields correctly', () => {
      const store = createCollectionStore<{ id: string; nama: string }>([
        { id: 'a', nama: 'A' },
      ]);

      // Normal update
      store.update('a', { nama: 'X' });

      // The row should be found and updated
      const row = store.get('a');
      expect(row).not.toBeNull();
      expect(row?.id).toBe('a');
      expect(row?.nama).toBe('X');
    });
  });

  describe('list sort/order', () => {
    const seed = [
      { id: '1', nama: 'Charlie', umur: 30 },
      { id: '2', nama: 'alpha', umur: 10 },
      { id: '3', nama: 'Bravo', umur: 20 },
    ];

    it('mengurutkan string secara ascending (case-insensitive via localeCompare)', () => {
      const store = createCollectionStore(seed);
      const { data } = store.list({ sort: 'nama', order: 'asc' });
      expect(data.map((r) => r.nama)).toEqual(['alpha', 'Bravo', 'Charlie']);
    });

    it('mengurutkan string secara descending', () => {
      const store = createCollectionStore(seed);
      const { data } = store.list({ sort: 'nama', order: 'desc' });
      expect(data.map((r) => r.nama)).toEqual(['Charlie', 'Bravo', 'alpha']);
    });

    it('mengurutkan number secara numerik (bukan leksikografis)', () => {
      const store = createCollectionStore(seed);
      const { data } = store.list({ sort: 'umur', order: 'asc' });
      expect(data.map((r) => r.umur)).toEqual([10, 20, 30]);
    });

    it('tanpa sort: mempertahankan urutan seed', () => {
      const store = createCollectionStore(seed);
      const { data } = store.list({});
      expect(data.map((r) => r.id)).toEqual(['1', '2', '3']);
    });

    it('tidak memutasi urutan sumber saat sort (pemanggilan berikutnya tetap urutan seed)', () => {
      const store = createCollectionStore(seed);
      store.list({ sort: 'nama', order: 'desc' });
      const { data } = store.list({});
      expect(data.map((r) => r.id)).toEqual(['1', '2', '3']);
    });
  });
});
