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
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { toast } from "sonner";

import { Can } from "@/components/auth/can";
import { useI18n } from "@/components/providers/i18n-provider";
import { useScope } from "@/components/providers/scope-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResourceDef } from "@/lib/crud/define-resource";
import { initialListParams } from "@/lib/crud/list-params";
import { format, resolveLabel } from "@/locales";

type Row = Record<string, unknown>;

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

  const query = def.api.useList({
    page: state.page,
    perPage,
    q: state.q || undefined,
    sort: state.sort || undefined,
    order: state.order === "desc" ? "desc" : "asc",
    scope: scopedFilter,
  });

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const removeMany = def.api.useRemoveMany();

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

  const columns = React.useMemo<TanstackColumnDef<Row>[]>(
    () =>
      def.columns.map((c) => ({
        id: c.field,
        accessorFn: (row: Row) => row[c.field],
        header: resolveLabel(t, c.labelKey),
        enableSorting: !!c.sortable,
        cell: (info) => String(info.getValue() ?? ""),
      })),
    [def.columns, t],
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
        <Can permission={def.permissions.create}>
          <Button render={<Link href={`/${def.name}/create`} />}>{t.common.create}</Button>
        </Can>
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
                  <Can permission={def.permissions.update}>
                    <Button variant="ghost" size="sm" render={<Link href={`/${def.name}/${id}/edit`} />}>
                      {t.common.edit}
                    </Button>
                  </Can>
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
