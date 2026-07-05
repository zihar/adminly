"use client";

import * as React from "react";
import Link from "next/link";
import {
  type ColumnDef as TanstackColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";

import { Can } from "@/components/auth/can";
import { useI18n } from "@/components/providers/i18n-provider";
import { useScope } from "@/components/providers/scope-provider";
import { getResource } from "@/config/resources/index";
import { RelationCell } from "@/components/crud/relation-cell";
import { WorkflowTransitionButton } from "@/components/crud/workflow-transition-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResourceDef } from "@/lib/crud/define-resource";
import { downloadBlob, exportPdf, toCsv, type ExportColumn } from "@/lib/crud/export";
import { initialListParams } from "@/lib/crud/list-params";
import type { ListParams } from "@/lib/crud/types";
import { format, resolveLabel } from "@/locales";

// Semua baris cocok filter/sort/scope diambil dalam satu halaman "besar" saat
// ekspor (bukan paginasi berulang) — 10000 dianggap cukup utk data demo/CRUD
// generik ini; resource dgn dataset jauh lebih besar butuh strategi lain
// (streaming/backend job) di luar cakupan task ini.
const EXPORT_PAGE_SIZE = 10000;

type Row = Record<string, unknown>;

// Key nuqs per field filter — prefix `filter_` (BUKAN bentuk bracket
// `filter[x]`) supaya tetap valid sbg satu segmen query-string biasa; nilai
// ini dipetakan ke `ListParams.filters` (bentuk `filter[x]=v` di request
// sungguhan, lihat `buildListSearchParams`) HANYA saat dikirim ke backend.
function filterKey(field: string): string {
  return `filter_${field}`;
}

/**
 * Kontrol filter satu field, dipisah dari `ResourceTable` sbg komponen anak
 * yang stabil per field — WAJIB, supaya hook `useOptions` (dipakai filter
 * `optionsFrom`/async-select) dipanggil di top level komponennya sendiri,
 * bukan di dalam `.map` induk (rules-of-hooks: hook tak boleh dipanggil di
 * loop/kondisi).
 */
function ResourceFilter({
  def,
  field,
  value,
  onChange,
}: {
  def: ResourceDef;
  field: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const meta = def.form.fields[field];
  const label = resolveLabel(t, meta?.labelKey ?? field);
  const source = meta?.optionsFrom ? getResource(meta.optionsFrom) : undefined;
  // Sama seperti pola `AsyncSelectField`: hook tetap dipanggil di top level
  // walau `source` bisa `undefined` (field filter statis) — `useOptions`
  // sendiri yang men-skip fetch lewat `enabled` saat tak relevan.
  const asyncOptions = source?.api.useOptions({});
  const options: { value: string | number; label: string }[] =
    meta?.options ?? asyncOptions?.data ?? [];

  return (
    <label className="flex items-center gap-1 text-sm">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded px-2 py-1"
      >
        <option value="">{t.common.all}</option>
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Tabel data generik untuk satu resource CRUD.
 *
 * - Pagination/sort/search server-side lewat `useList` — backend/mock yang
 *   memotong & mengurutkan data. `@tanstack/react-table` dipakai mode manual
 *   (`manualPagination`+`manualSorting`) murni untuk model kolom/header,
 *   BUKAN untuk mengolah data di klien.
 * - State (page/q/sort/order) disinkron ke URL lewat `nuqs` agar bisa
 *   di-bookmark & bertahan lewat navigasi (keputusan proyek D8).
 * - Label kolom & teks UI selalu lewat i18n (`resolveLabel`/`t`) — tak ada
 *   raw labelKey atau string hardcode.
 */
export function ResourceTable({ def }: { def: ResourceDef }) {
  const { t } = useI18n();
  // Params awal (page/perPage/sort/order) di-derive dari SATU helper yang sama
  // dgn prefetch RSC (`resource-page.tsx`) supaya query key render pertama cocok
  // dgn cache prefetch — cegah hydration miss / skeleton flash.
  const initial = initialListParams(def);
  const [state, setState] = useQueryStates({
    page: parseAsInteger.withDefault(initial.page),
    q: parseAsString.withDefault(""),
    sort: parseAsString.withDefault(initial.sort ?? ""),
    order: parseAsString.withDefault(initial.order ?? "asc"),
  });
  const perPage = initial.perPage;
  const primaryKey = def.primaryKey ?? "id";

  // Filter per-kolom (Filter UI Task 2): satu param nuqs (`filter_<field>`)
  // per field yang dideklarasikan `def.list.filters`. Dipanggil lewat
  // `useQueryStates` TERPISAH dari state page/q/sort/order di atas (BUKAN
  // digabung ke satu objek config) — menghindari percampuran tipe parser
  // number (`page`) dgn parser string dinamis dlm satu literal objek yang
  // bikin TypeScript memaksakan index signature seragam. Config-nya sendiri
  // di-memo (stabil selama daftar field filter resource tak berubah) supaya
  // `useQueryStates` tak menerima objek baru tiap render.
  const filterFields = def.list?.filters ?? [];
  const filterParsersConfig = React.useMemo(
    () =>
      Object.fromEntries(filterFields.map((f) => [filterKey(f), parseAsString.withDefault("")])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key stabil by-value (join), bukan by-reference
    [filterFields.join(",")],
  );
  const [filterState, setFilterState] = useQueryStates(filterParsersConfig);

  // Suntik scope global (mis. `workspace`) ke query list HANYA jika resource
  // mendeklarasikan `def.scope` — resource tanpa itu tak terpengaruh.
  // `undefined`/`""` di-drop (samakan dgn `initialListParams`), dan hasil
  // kosong di-resolve ke `undefined` (BUKAN `{}`) — supaya query key `useList`
  // di render pertama (tanpa scope aktif) hash-equal dgn prefetch RSC yang
  // meng-omit `scope` sepenuhnya. Kalau tetap `{}`, TanStack Query menganggap
  // `{ scope: {} }` beda dgn `{}` (tanpa key `scope`) → cache prefetch
  // terbuang & skeleton berkedip di paint pertama.
  const { scope } = useScope();
  const scopedEntries = def.scope?.length
    ? def.scope
        .map((k) => [k, scope[k]] as const)
        .filter(([, v]) => v !== undefined && v !== "")
    : [];
  const scopedFilter = scopedEntries.length
    ? Object.fromEntries(scopedEntries)
    : undefined;

  // Nilai filter aktif (non-kosong saja) — sama alasannya dgn `scopedFilter`
  // di atas: kalau selalu jadi `{}` (bukan `undefined`) saat tak ada filter
  // aktif, query key `useList` di render pertama beda dari `initialListParams`
  // (prefetch RSC, yang meng-omit `filters` sepenuhnya) → cache prefetch
  // terbuang & skeleton berkedip.
  const activeFilters = Object.fromEntries(
    filterFields.map((f) => [f, filterState[filterKey(f)]]).filter(([, v]) => v),
  );
  const filters = Object.keys(activeFilters).length ? activeFilters : undefined;

  // Params list "aktif" (page/perPage/q/sort/order/filters/scope) — SATU
  // objek yang sama dipakai `useList` (paginasi tampilan) DAN ekspor (Task 4,
  // hanya `page`/`perPage` di-override) supaya hasil ekspor selalu konsisten
  // dgn filter/sort/scope yang sedang terlihat di layar.
  const listParams: ListParams = {
    page: state.page,
    perPage,
    q: state.q || undefined,
    sort: state.sort || undefined,
    order: state.order === "desc" ? "desc" : "asc",
    filters,
    scope: scopedFilter,
  };
  const query = def.api.useList(listParams);

  const qc = useQueryClient();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const removeMany = def.api.useRemoveMany();
  // Hook transisi diambil SEKALI di top level (bukan di dalam map per-baris) —
  // wajib mengikuti Rules of Hooks; instance yang sama dipakai semua tombol
  // transisi tiap baris (lihat filter `allowedTransitions` di bawah).
  const transition = def.api.useTransition();

  // Input pencarian dikontrol lokal (bukan `defaultValue`) — Base UI `Input`
  // memperlakukan `defaultValue` sebagai nilai awal murni; mengubahnya di
  // render berikutnya (mis. setelah navigasi/back) tak sinkron ulang tanpa ini.
  const [searchInput, setSearchInput] = React.useState(state.q);
  React.useEffect(() => setSearchInput(state.q), [state.q]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Ekspor SEMUA baris cocok filter/sort/scope aktif (bukan hanya halaman yang
  // sedang tampil) — fetch terpisah lewat `qc.fetchQuery` (BUKAN `query.data`)
  // dengan `page`/`perPage` di-override ke satu halaman besar, lalu map ke
  // `ExportColumn[]` dari `def.columns` (header i18n via `resolveLabel`).
  async function handleExport(kind: "csv" | "pdf") {
    try {
      const { rows } = await qc.fetchQuery(
        def.api.listQueryOptions({ ...listParams, page: 1, perPage: EXPORT_PAGE_SIZE }),
      );
      const cols: ExportColumn[] = def.columns.map((c) => ({
        header: resolveLabel(t, c.labelKey),
        field: c.field,
      }));
      // Kolom `render:"relation"` diekspor sbg LABEL (bukan id mentah) —
      // Map id->label per resource sumber di-fetch SEKALI (paralel) lewat
      // `optionsQueryOptions` (Task 1), cache-nya sama dgn yang dipakai
      // `RelationCell` di tabel (Task 2), jadi biasanya sudah warm.
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
          // Denormalisasi `<field>_label` di baris menang (sama prioritas dgn
          // `RelationCell`), lalu Map hasil options, terakhir fallback nilai mentah.
          const denorm = row[`${c.field}_label`];
          copy[c.field] =
            denorm !== undefined && denorm !== null
              ? String(denorm)
              : relMaps[c.field]?.get(String(row[c.field])) ?? row[c.field];
        }
        return copy;
      });
      if (kind === "csv") {
        downloadBlob(`${def.name}.csv`, "text/csv;charset=utf-8", toCsv(cols, exportRows));
      } else {
        await exportPdf(cols, exportRows, def.name, `${def.name}.pdf`);
      }
    } catch {
      toast.error(t.common.exportFailed);
    }
  }

  const columns = React.useMemo<TanstackColumnDef<Row>[]>(
    () =>
      def.columns.map((c) => ({
        id: c.field,
        accessorFn: (row: Row) => row[c.field],
        header: resolveLabel(t, c.labelKey),
        enableSorting: !!c.sortable,
        // Tiap `c.render` di-cocokkan lalu elemen dirender LANGSUNG (BUKAN
        // lewat lookup komponen dinamis dari `Map`/objek — itu memicu
        // eslint-plugin-react-hooks `static-components` karena identitas
        // komponen dianggap berubah tiap render). Fallback akhir: `String`
        // mentah (dipakai render "text"/tak diset).
        cell: (info) => {
          const value = info.getValue();
          if (c.render === "badge") {
            const status = def.workflow?.statuses.find((s) => s.value === value);
            if (status) {
              return (
                <Badge variant={status.variant ?? "secondary"}>
                  {resolveLabel(t, status.labelKey)}
                </Badge>
              );
            }
          }
          if (c.render === "date") {
            // Guard: nilai kosong/bukan string-atau-angka/Date invalid → "".
            if (typeof value === "string" || typeof value === "number") {
              const date = new Date(value);
              if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
            }
            return "";
          }
          if (c.render === "boolean") {
            return resolveLabel(t, value ? "common.yes" : "common.no");
          }
          if (c.render === "currency") {
            // Format generik (demo) — mata uang default USD, deterministik
            // (bukan bergantung locale khusus proyek).
            const amount = Number(value);
            if (Number.isNaN(amount)) return "";
            return new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: "USD",
            }).format(amount);
          }
          if (c.render === "image") {
            if (typeof value === "string" && value.length > 0) {
              // `<img>` biasa (BUKAN `next/image`) sengaja dipakai — sumber
              // `value` bebas per-resource (domain eksternal apa pun, tak
              // diketahui saat build) & tak ada dimensi tetap yang bisa
              // dijamin utk tiap sel, dua prasyarat yang diwajibkan
              // `next/image`.
              // eslint-disable-next-line @next/next/no-img-element
              return <img src={value} alt="" className="h-8 w-8 rounded object-cover" />;
            }
            return "";
          }
          if (c.render === "relation") {
            // `RelationCell` (komponen module-level, lihat file-nya) yang
            // menangani hybrid: pakai `<field>_label` denormalisasi dari baris
            // kalau ada (TIDAK fetch), kalau tidak & `c.relation` (nama
            // resource sumber) diset → resolve id->label lewat `useOptions`
            // resource itu, jatuh ke nilai mentah kalau tak ketemu/tak ada
            // resource sama sekali. Dirender sbg elemen (BUKAN dipanggil sbg
            // fungsi) krn cell factory ini berjalan di dalam `useMemo` — hook
            // di dalam `RelationCell`/`ResolvedRelation` tak boleh terpanggil
            // di sini.
            return (
              <RelationCell
                resource={c.relation}
                value={value}
                denormLabel={info.row.original[`${c.field}_label`]}
              />
            );
          }
          return String(value ?? "");
        },
      })),
    [def.columns, def.workflow, t],
  );

  const sorting: SortingState = state.sort ? [{ id: state.sort, desc: state.order === "desc" }] : [];
  const rows = React.useMemo(() => query.data?.rows ?? [], [query.data]);
  const total = query.data?.total ?? 0;

  // React Compiler tak bisa mem-memoize hasil `useReactTable` (fungsi baru tiap
  // render) — batasan dikenal dari `@tanstack/react-table`, bukan indikasi bug.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows as Row[],
    columns,
    state: { sorting },
    manualPagination: true,
    manualSorting: true,
    // `pageCount` tak dipakai langsung (kontrol Prev/Next di bawah pakai
    // `state.page`/`total` dari nuqs+`useList`, bukan API paginasi internal
    // tabel) — tetap disertakan agar konfigurasi manual-pagination lengkap
    // sesuai kontrak `@tanstack/react-table`.
    pageCount: Math.max(1, Math.ceil(total / perPage)),
    getRowId: (row) => String(row[primaryKey]),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      void setState({ sort: first?.id ?? "", order: first?.desc ? "desc" : "asc", page: 1 });
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const colSpan = def.columns.length + 2; // + kolom pilih + kolom aksi

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder={t.common.searchPlaceholder}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void setState({ q: searchInput, page: 1 });
            }
          }}
          className="max-w-sm"
        />
        {filterFields.map((field) => (
          <ResourceFilter
            key={field}
            def={def}
            field={field}
            value={filterState[filterKey(field)] ?? ""}
            onChange={(value) => {
              // Ganti filter kolom → reset ke halaman 1 (samakan dgn search &
              // sort di atas). `setState`+`setFilterState` dipanggil di tick
              // yang sama → nuqs menggabungkannya jadi satu penulisan URL
              // (aman, bukan dua navigasi terpisah).
              void setFilterState({ [filterKey(field)]: value || null });
              void setState({ page: 1 });
            }}
          />
        ))}
        <Can permission={def.permissions.create}>
          <Button render={<Link href={`/${def.name}/create`} />}>{t.common.create}</Button>
        </Can>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            {t.common.export}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => void handleExport("csv")}>
              {t.common.exportCsv}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleExport("pdf")}>
              {t.common.exportPdf}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {selected.size > 0 && (
          <Can permission={def.permissions.delete}>
            <Button
              variant="destructive"
              onClick={() =>
                removeMany.mutate([...selected], {
                  // Toast i18n dipasang di caller (bukan factory) — default
                  // locale English; factory sendiri toast-free.
                  onSuccess: () => {
                    setSelected(new Set());
                    toast.success(t.common.deleted);
                  },
                  onError: () => toast.error(t.common.deleteFailed),
                })
              }
            >
              {format(t.common.deleteSelected, { count: String(selected.size) })}
            </Button>
          </Can>
        )}
      </div>

      {/* Indikator refetch latar (ganti page/sort/search) — non-destruktif:
          baris lama tetap tampil, hanya diberi opasitas turun. Skeleton penuh
          HANYA untuk load pertama (`isPending`), lihat `<TableBody>`. */}
      <Table
        aria-busy={query.isFetching && !query.isPending}
        className={
          query.isFetching && !query.isPending ? "opacity-60 transition-opacity" : undefined
        }
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              <TableHead className="w-8" />
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="flex items-center gap-1"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && <span aria-hidden>▲</span>}
                      {header.column.getIsSorted() === "desc" && <span aria-hidden>▼</span>}
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
              <TableHead>{t.common.actions}</TableHead>
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {query.isPending && (
            <TableRow>
              <TableCell colSpan={colSpan}>
                <Skeleton className="h-6 w-full" />
              </TableCell>
            </TableRow>
          )}
          {query.isError && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-destructive">
                {t.common.loadError}
              </TableCell>
            </TableRow>
          )}
          {query.isSuccess && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-muted-foreground">
                {t.common.empty}
              </TableCell>
            </TableRow>
          )}
          {table.getRowModel().rows.map((row) => {
            const id = row.id;
            // Transisi yang diizinkan dari status baris ini (`row.original[field]`)
            // — dihitung per-baris di dalam `.map` biasa (BUKAN hook), jadi aman
            // dari Rules of Hooks; hook `useTransition()` sendiri sudah dipanggil
            // sekali di atas.
            const wf = def.workflow;
            const allowedTransitions = wf
              ? wf.transitions.filter((tr) => tr.from.includes(String(row.original[wf.field])))
              : [];
            return (
              <TableRow key={id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(id)}
                    onChange={() => toggle(id)}
                    aria-label={format(t.common.selectRow, { id })}
                  />
                </TableCell>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Can permission={def.permissions.update}>
                      <Button variant="ghost" size="sm" render={<Link href={`/${def.name}/${id}/edit`} />}>
                        {t.common.edit}
                      </Button>
                    </Can>
                    {allowedTransitions.map((tr) => (
                      <Can key={tr.action} permission={tr.permission}>
                        <WorkflowTransitionButton transition={tr} id={id} mutation={transition} />
                      </Can>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={state.page <= 1}
          onClick={() => void setState({ page: state.page - 1 })}
        >
          {t.common.previous}
        </Button>
        <span className="text-sm">{format(t.common.page, { page: String(state.page) })}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={state.page * perPage >= total}
          onClick={() => void setState({ page: state.page + 1 })}
        >
          {t.common.next}
        </Button>
      </div>
    </div>
  );
}
