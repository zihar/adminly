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
});
