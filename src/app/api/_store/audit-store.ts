import type { AuditRow } from "@/lib/crud/types";

// Store jejak audit in-memory, generik lintas-resource (append-only). Ganti
// dengan tabel database sungguhan di produksi — lihat juga `collection-store.ts`
// untuk pola serupa dipakai resource CRUD demo.
export function createAuditStore() {
  let rows: AuditRow[] = [];
  return {
    append(row: AuditRow) {
      rows = [row, ...rows];
      return row;
    },
    // Newest-first — baris terbaru untuk `entityId` ditampilkan paling atas
    // (dipakai `AuditTimeline`). `rows` sudah newest-first krn `append`
    // men-*prepend*, jadi cukup filter tanpa perlu sort ulang.
    listFor(entityId: string) {
      return rows.filter((r) => r.entityId === entityId);
    },
  };
}

// Instance tunggal dipakai bersama seluruh resource demo (`items`, dst).
export const auditStore = createAuditStore();
