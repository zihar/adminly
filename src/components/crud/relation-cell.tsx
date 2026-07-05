"use client";

import { getResource } from "@/config/resources/index";
import type { createResourceApi } from "@/lib/crud/create-resource-api";

// Tipe api resource sumber relasi diturunkan dari kembalian factory generik
// (BUKAN `any` literal) — `getResource` sendiri mengembalikan resource
// ter-type-erased (`ResourceDef<any, any, any>`, lihat `config/resources/index.ts`),
// jadi `source.api` di bawah cocok ke tipe ini tanpa kita menulis `any` sendiri.
type ResourceApiLike = ReturnType<typeof createResourceApi>;

/**
 * Sel kolom `render:"relation"` — resolusi id→label secara hybrid:
 * 1. `denormLabel` (field `<field>_label` dari baris) menang kalau ada
 *    (bukan `undefined`/`null`) — TIDAK fetch apa pun.
 * 2. Kalau tak ada denormLabel & `resource` (nama resource sumber, dari
 *    `ColumnDef.relation`) diset → resolve lewat `useOptions({})` resource
 *    itu, cocokkan `String(o.value) === String(value)`; selagi loading atau
 *    saat tak ketemu → fallback ke nilai mentah.
 * 3. Kalau tak ada `resource` sama sekali → tampilkan nilai mentah langsung
 *    (tanpa fetch).
 *
 * Komponen module-level (identitas stabil per elemen JSX, BUKAN factory yang
 * dipanggil sbg fungsi biasa) — wajib dirender sbg `<RelationCell .../>` dari
 * cell factory `resource-table.tsx` (yang sendiri berjalan di dalam
 * `useMemo`, tempat memanggil hook dilarang) supaya hook di `ResolvedRelation`
 * (lihat di bawah) taat Rules of Hooks.
 */
export function RelationCell({
  resource,
  value,
  denormLabel,
}: {
  resource?: string;
  value: unknown;
  denormLabel?: unknown;
}) {
  // Label denormalisasi dari baris menang — tak perlu fetch.
  if (denormLabel !== undefined && denormLabel !== null) return <>{String(denormLabel)}</>;
  const source = resource ? getResource(resource) : undefined;
  // Tak ada resource sumber → render nilai mentah TANPA memanggil hook apa
  // pun. Aman terhadap Rules of Hooks: `RelationCell` sendiri tak pernah
  // memanggil hook di badan manapun (hook hanya ada di `ResolvedRelation`,
  // yang baru dirender/dipanggil setelah guard ini).
  if (!source) return <>{value == null ? "" : String(value)}</>;
  return <ResolvedRelation api={source.api} value={value} />;
}

function ResolvedRelation({ api, value }: { api: ResourceApiLike; value: unknown }) {
  // Hook selalu dipanggil sekali tanpa syarat di sini — komponen ini hanya
  // dirender saat `source` sudah pasti ada (lihat guard di `RelationCell`),
  // jadi tak ada cabang di dalam komponen ini yang men-skip hook.
  const { data } = api.useOptions({});
  const label = data?.find((o) => String(o.value) === String(value))?.label;
  return <>{label ?? (value == null ? "" : String(value))}</>;
}
