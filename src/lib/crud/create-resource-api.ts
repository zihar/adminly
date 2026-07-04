import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { buildListSearchParams, normalizeError } from "@/lib/crud/errors";
import type {
  ID,
  ListParams,
  OptionParams,
  ListResult,
  Option,
  ListEnvelope,
} from "@/lib/crud/types";

type Cfg = { resource: string; path: string; primaryKey?: string };

type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

/**
 * openapi-fetch (`apiClient`) is typed per literal path (from `paths`), but this
 * factory works over a *dynamic* `path: string` supplied by callers. There is no
 * way to keep that dynamic string statically checked against `paths`, so we cast
 * the path to `never` at this single boundary (`fn(path as never, ...)`). Entity
 * typing (`TItem`/`TNew`/`TUpdate`) is preserved via the generics on `req<T>` and
 * on `createResourceApi`, so callers never see `any`/`never` leak out. This is a
 * documented trade-off (see spec §4) — a small, isolated unsafe cast in exchange
 * for a generic, resource-agnostic CRUD factory.
 */
type ApiMethodFn = (
  path: never,
  init?: { body?: unknown },
) => Promise<{ data?: unknown; error?: unknown; response: Response }>;

async function req<T>(
  method: ApiMethod,
  path: string,
  opts?: { body?: unknown },
): Promise<{ data?: T; res: Response }> {
  const fn = (apiClient as unknown as Record<ApiMethod, ApiMethodFn>)[method];
  const { data, error, response } = await fn(
    path as never,
    opts?.body !== undefined ? { body: opts.body } : undefined,
  );
  if (error || !response.ok) {
    throw normalizeError(response.status, error);
  }
  return { data: data as T, res: response };
}

export function createResourceApi<TItem, TNew = Partial<TItem>, TUpdate = Partial<TItem>>(
  cfg: Cfg,
) {
  const pk = cfg.primaryKey ?? "id";
  const base = cfg.path.replace(/\/$/, "");
  const keys = {
    all: [cfg.resource] as const,
    list: (params: ListParams) => [cfg.resource, "list", params] as const,
    one: (id: ID) => [cfg.resource, "one", id] as const,
    options: (params: OptionParams) => [cfg.resource, "options", params] as const,
  };

  function listQueryOptions(params: ListParams) {
    return queryOptions({
      queryKey: keys.list(params),
      queryFn: async (): Promise<ListResult<TItem>> => {
        const qs = buildListSearchParams(params).toString();
        const { data } = await req<ListEnvelope<TItem>>("GET", `${base}?${qs}`);
        const env = data!;
        return {
          rows: env.data,
          total: env.meta.total,
          page: env.meta.page,
          perPage: env.meta.per_page,
        };
      },
    });
  }

  function getOneQueryOptions(id: ID) {
    return queryOptions({
      queryKey: keys.one(id),
      queryFn: async () => (await req<TItem>("GET", `${base}/${id}`)).data!,
    });
  }

  const useList = (params: ListParams) => useQuery(listQueryOptions(params));
  // `useGetOne` menerima `options` (mis. `enabled`) supaya caller bisa memanggil
  // hook TANPA syarat (aturan React Hooks) lalu men-gate fetch-nya — dipakai
  // `ResourceForm` untuk mode create (tak ada `id`, `enabled: false`).
  const useGetOne = (id: ID, options?: { enabled?: boolean }) =>
    useQuery({ ...getOneQueryOptions(id), ...options });

  // Factory sengaja TOAST-FREE: notifikasi UI adalah keputusan i18n (default
  // English) yang dipasang di caller ber-`useI18n()` (ResourceForm/ResourceTable).
  // Di sini cukup invalidate cache; kegagalan tetap dilempar sbg `CrudError`.
  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (values: TNew) =>
        (await req<TItem>("POST", base, { body: values })).data!,
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, values }: { id: ID; values: TUpdate }) =>
        (await req<TItem>("PUT", `${base}/${id}`, { body: values })).data!,
      onSuccess: (_d, v) => {
        qc.invalidateQueries({ queryKey: keys.all });
        qc.invalidateQueries({ queryKey: keys.one(v.id) });
      },
    });
  }

  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: ID) => {
        await req<void>("DELETE", `${base}/${id}`);
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  function useRemoveMany() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (ids: ID[]) => {
        await req<void>("POST", `${base}/bulk-delete`, { body: { ids } });
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  function useOptions(params: OptionParams) {
    return useQuery({
      queryKey: keys.options(params),
      queryFn: async (): Promise<Option[]> => {
        const sp = new URLSearchParams();
        if (params.q) sp.set("q", params.q);
        for (const [k, v] of Object.entries(params.parent ?? {})) {
          sp.set(`parent[${k}]`, String(v));
        }
        return (await req<Option[]>("GET", `${base}/options?${sp.toString()}`)).data ?? [];
      },
      enabled: params.parent
        ? Object.values(params.parent).every((v) => v !== undefined && v !== null && v !== "")
        : true,
    });
  }

  return {
    pk,
    keys,
    listQueryOptions,
    useList,
    getOneQueryOptions,
    useGetOne,
    useCreate,
    useUpdate,
    useRemove,
    useRemoveMany,
    useOptions,
  };
}

export type ResourceApi<TItem, TNew = Partial<TItem>, TUpdate = Partial<TItem>> = ReturnType<
  typeof createResourceApi<TItem, TNew, TUpdate>
>;
