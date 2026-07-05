# Relation id→label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Kolom `render:"relation"` menampilkan **label** (bukan id mentah) di tabel **dan** di export CSV/PDF, dengan resolusi id→label generik lewat resource sumber yang dideklarasikan di `ColumnDef.relation`.

**Architecture:** `ColumnDef.relation?: string` (nama resource sumber, sudah ada di tipe tapi belum dipakai) menjadi sumber resolusi. Resolusi **hybrid**: kalau baris punya sibling denormalisasi `<field>_label`, pakai itu (tanpa fetch); kalau tidak, resolve via options resource sumber → Map `id→label`. Tabel memakai komponen sel `RelationCell` yang memanggil `useOptions` (React Query dedupe → **1 request per resource**, hook stabil karena komponen module-level). Export (di luar React) memakai factory baru `optionsQueryOptions` via `qc.fetchQuery` — **berbagi query-key/cache yang sama** dengan tabel.

**Tech Stack:** React 19, TanStack Query (`queryOptions`/`useQuery`/`fetchQuery`), shadcn Base UI, Vitest + @testing-library/react + MSW, Playwright.

## Context / Decisions
- **Hybrid source:** `row[`${field}_label`]` menang (backend denormalisasi); else resolve via `c.relation` options; else nilai mentah (fallback saat loading / id tak ditemukan).
- **Shared cache:** tambah `optionsQueryOptions(params)` ke `create-resource-api` (mirror `listQueryOptions`), refactor `useOptions` di atasnya. Tabel (`useOptions`) & export (`fetchQuery(optionsQueryOptions)`) memakai key `keys.options(params)` yang sama → satu fetch.
- **Scope:** tabel + export (keputusan user). Relasi sangat besar (fetch seluruh options) = deferral v1; endpoint `?ids=` lookup = follow-up (dicatat).
- **Demo:** items dapat kolom `render:"relation" relation:"regions"` atas field `regionId` baru (opsional), sebagian seed diisi id region nyata.
- Generic; i18n mirror en/id; Base UI; no `any`; `@/` alias; komentar Indonesia; indentasi dua spasi.

## Global Constraints
- Reuse: `getResource` (`@/config/resources/index`), `useOptions`/`keys.options` + `Option`/`OptionParams` (`create-resource-api`), `resolveLabel`/`useI18n`, `createCollectionStore`, `toCsv`/`exportPdf`/`downloadBlob` (`@/lib/crud/export`). `npx tsc --noEmit`+`npm run lint` bersih; test verifikasi perilaku nyata (MSW serve options; cell tampil label; CSV berisi label). Route handler pola `withErrorEnvelope`.
- Rules-of-hooks: `RelationCell` komponen module-level (identitas stabil); jangan panggil hook di dalam `cell` factory (yang jalan di `useMemo` kolom) — render `<RelationCell/>` saja.
- `getResource` dapat mengembalikan `undefined` → guard sebelum akses `.api`.

---

### Task 1: `optionsQueryOptions` factory (shared cache untuk tabel + export)
**Files:** `src/lib/crud/create-resource-api.ts`; test `src/lib/crud/__tests__/create-resource-api.test.ts`.
**Interfaces:**
- Produces: `optionsQueryOptions(params: OptionParams)` (dikembalikan dari `createResourceApi`) memakai `queryOptions({ queryKey: keys.options(params), queryFn, enabled })` — queryFn/enabled identik dengan `useOptions` sekarang. `useOptions(params)` di-refactor jadi `useQuery(optionsQueryOptions(params))`.
- Consumes: `keys.options`, `req<Option[]>`, `buildListSearchParams`/URLSearchParams pola lama.

- [ ] Step 1 (RED): tambah test — `api.optionsQueryOptions({}).queryKey` sama dengan `keys.options({})` (mis. `[resource,"options",{}]`); `queryFn` (via `qc.fetchQuery` + MSW yang serve `GET /{base}/options`) mengembalikan `Option[]`; `optionsQueryOptions({ parent:{ parentId:"x" } })` menghasilkan queryKey berbeda & queryFn menambah `parent[parentId]=x`. `enabled` false saat ada `parent` dengan nilai kosong. (Mirror test hook options yang ada; boleh pakai `qc.fetchQuery` untuk factory.)
- [ ] Step 2: implement — ekstrak isi `useOptions` menjadi `function optionsQueryOptions(params: OptionParams) { return queryOptions({ queryKey: keys.options(params), queryFn: async (): Promise<Option[]> => { const sp = new URLSearchParams(); if (params.q) sp.set("q", params.q); for (const [k,v] of Object.entries(params.parent ?? {})) sp.set(`parent[${k}]`, String(v)); return (await req<Option[]>("GET", `${base}/options?${sp.toString()}`)).data ?? []; }, enabled: params.parent ? Object.values(params.parent).every((v) => v !== undefined && v !== null && v !== "") : true }); }` lalu `function useOptions(params: OptionParams) { return useQuery(optionsQueryOptions(params)); }`. Tambah `optionsQueryOptions` ke objek return.
- [ ] Step 3: `npm test -- create-resource-api`, `npx tsc --noEmit && npm run lint`. Commit `"Tambah optionsQueryOptions factory (shared cache) + refactor useOptions"`.

### Task 2: `RelationCell` + wire ke renderer tabel
**Files:** `src/components/crud/relation-cell.tsx` (baru); `src/components/crud/resource-table.tsx` (renderer `relation`); test `src/components/crud/__tests__/resource-table.test.tsx` (atau `relation-cell.test.tsx` baru).
**Consumes:** `getResource`, `useOptions` (Task 1 tak wajib untuk ini — cukup hook `useOptions`), `Option`.
**Produces:** `RelationCell({ resource, value, denormLabel }: { resource?: string; value: unknown; denormLabel?: unknown })`.

- [ ] Step 1 (RED): test —
  - kolom `render:"relation" relation:"regions"`, baris `{ regionId: "r1" }` (tanpa `_label`), MSW serve `GET /api/regions/options` → `[{value:"r1",label:"Jawa Barat"}]` → sel menampilkan `"Jawa Barat"`.
  - baris dengan `regionId_label:"Sudah"` → sel menampilkan `"Sudah"` **tanpa** memerlukan fetch (boleh assert teks; opsional assert tak ada request).
  - `relation` tak diset / id tak ada di options (setelah load) → tampil nilai mentah `"r1"`.
- [ ] Step 2: implement `relation-cell.tsx` (komponen module-level, `"use client"`):
  ```tsx
  "use client";
  import { getResource } from "@/config/resources/index";
  export function RelationCell({ resource, value, denormLabel }: { resource?: string; value: unknown; denormLabel?: unknown }) {
    // Label denormalisasi dari baris menang — tak perlu fetch.
    if (denormLabel !== undefined && denormLabel !== null) return <>{String(denormLabel)}</>;
    const source = resource ? getResource(resource) : undefined;
    // Hook selalu dipanggil (identitas komponen stabil); saat `source` tak ada,
    // panggil `useOptions` milik resource dummy tak mungkin — jadi guard: bila
    // tak ada source, langsung render nilai mentah TANPA hook.
    if (!source) return <>{value == null ? "" : String(value)}</>;
    return <ResolvedRelation api={source.api} value={value} />;
  }
  function ResolvedRelation({ api, value }: { api: { useOptions: (p: Record<string, never>) => { data?: { value: string | number; label: string }[] } }; value: unknown }) {
    const { data } = api.useOptions({});
    const label = data?.find((o) => String(o.value) === String(value))?.label;
    return <>{label ?? (value == null ? "" : String(value))}</>;
  }
  ```
  (Catatan hooks: `RelationCell` boleh early-return sebelum hook APA PUN karena ia sendiri tak memanggil hook; hook hanya ada di `ResolvedRelation` yang selalu memanggilnya sekali — konsisten. Sesuaikan tipe `api` agar tanpa `any`: impor tipe kembalian `createResourceApi` bila perlu, mis. `ReturnType<typeof createResourceApi>`.)
  Di `resource-table.tsx` ganti blok `if (c.render === "relation")` menjadi:
  ```tsx
  if (c.render === "relation") {
    return <RelationCell resource={c.relation} value={value} denormLabel={info.row.original[`${c.field}_label`]} />;
  }
  ```
- [ ] Step 3: `npm test -- resource-table relation-cell`, `npx tsc --noEmit && npm run lint`. Commit `"RelationCell: resolusi id→label di tabel (hybrid _label / options)"`.

### Task 3: Export resolve relation label
**Files:** `src/components/crud/resource-table.tsx` (`handleExport`); test `resource-table.test.tsx`.
**Consumes:** `getResource(...).api.optionsQueryOptions` (Task 1), `qc.fetchQuery`, `Option`.

- [ ] Step 1 (RED): test — kolom `render:"relation" relation:"regions"`; MSW serve list (`GET /api/items` rows dg `regionId:"r1"`, tanpa `_label`) + `GET /api/regions/options` → `[{value:"r1",label:"Jawa Barat"}]`; klik Export → CSV; assert `downloadBlob` (spy) dipanggil dengan konten memuat `"Jawa Barat"` (BUKAN `"r1"`) di kolom relation. (Mock/spy `@/lib/crud/export` seperti test export existing.)
- [ ] Step 2: implement di `handleExport`, setelah `rows` didapat & sebelum bangun `exportRows`:
  ```ts
  // Bangun Map id→label untuk tiap kolom relation (satu fetch options per resource).
  const relationCols = def.columns.filter((c) => c.render === "relation" && c.relation);
  const relMaps: Record<string, Map<string, string>> = {};
  await Promise.all(
    relationCols.map(async (c) => {
      const src = getResource(c.relation!);
      if (!src) return;
      const opts = await qc.fetchQuery(src.api.optionsQueryOptions({}));
      relMaps[c.field] = new Map(opts.map((o) => [String(o.value), o.label]));
    }),
  );
  const exportRows = (rows as Row[]).map((row) => {
    if (relationCols.length === 0) return row;
    const copy: Row = { ...row };
    for (const c of relationCols) {
      const denorm = row[`${c.field}_label`];
      copy[c.field] =
        denorm !== undefined && denorm !== null
          ? String(denorm)
          : relMaps[c.field]?.get(String(row[c.field])) ?? row[c.field];
    }
    return copy;
  });
  ```
  Ganti `const exportRows = rows as Row[];` dengan blok di atas. `cols`/`toCsv`/`exportPdf` tetap.
- [ ] Step 3: `npm test -- resource-table`, `npx tsc --noEmit && npm run lint`. Commit `"Export: resolve relation id→label di CSV/PDF (shared options cache)"`.

### Task 4: Demo items + verifikasi + e2e
**Files:** `src/config/resources/items.ts` (kolom + field relation), `src/app/api/items/_data.ts` (`ItemRow.regionId` + seed), `openapi.yaml` (Item.regionId opsional) + `npm run gen:api`, `src/locales/en.ts`+`id.ts` (label), `itemSchema`; e2e.
- [ ] Step 1: tambah `regionId?: string` ke `ItemRow` + seed 1–2 item dg id region yang ADA di `regions/_data.ts` (verifikasi id-nya); `itemSchema` `regionId: z.string().optional()`; `openapi.yaml` `Item.regionId` (string, opsional) → `npm run gen:api`. Tambah kolom `{ field:"regionId", labelKey:"items.region", render:"relation", relation:"regions" }` ke `itemsResource.columns`; tambah form field `regionId: { type:"async-select", labelKey:"items.region", optionsFrom:"regions" }` + ke layout. i18n `items.region` (en "Region"/id "Wilayah") mirror.
- [ ] Step 2: sweep penuh — `npm run gen:api` (idempoten), `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx playwright test --workers=1`. Semua hijau. (Catatan: bila port 3000 dipakai proses lain di sandbox, itu kuirk lingkungan — jangan ubah `playwright.config.ts` di commit.)
- [ ] Step 3: e2e — di `/items`, assert kolom Region menampilkan label region (mis. teks nama), bukan id mentah. (Selektor robust; andalkan seed.) Commit `"Demo items regionId (kolom relation) + verifikasi label"`.

---

## Self-Review
**Coverage:** shared `optionsQueryOptions` (T1) → tabel `RelationCell` (T2) → export resolve (T3) → demo+verify+e2e (T4). Hybrid `_label`/options + fallback mentah di ketiganya. Tabel & export berbagi cache key. ✓
**Placeholder scan:** tiap task RED test + kode konkret vs file nyata; `getResource` guard; hooks-stability via komponen module-level + hook di `ResolvedRelation`. No TBD. ✓
**Type consistency:** `ColumnDef.relation: string`, `optionsQueryOptions(params: OptionParams)`, `Option{value:string|number,label:string}`, key `keys.options(params)` sama untuk tabel & export. ✓
**Deferrals (documented):** relasi besar (fetch seluruh options; `?ids=` lookup = follow-up); relation di filter (item terpisah).
