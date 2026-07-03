# Design: TanStack Query + Typed OpenAPI Client

**Date:** 2026-07-03
**Status:** Approved
**Scope:** Add client-side data layer to the Adminly starter — TanStack Query (cache, mutation, optimistic update) + an end-to-end typed HTTP client generated from OpenAPI.

## Goal

Adminly is a fork-per-project dashboard starter. Today data comes from `src/lib/data.ts`
(dummy) and pages are Server Components. This work adds the reusable client-data
infrastructure a forked project needs, plus **one concrete worked example** (the users
page) so the patterns are copyable.

Two pillars:
1. **TanStack Query** — caching, mutations, optimistic updates with rollback.
2. **Typed API client via OpenAPI** — `openapi-typescript` generates TS types from a
   committed `openapi.yaml`; `openapi-fetch` consumes them for a fully typed client.
   End-to-end types mean the API contract can never silently drift.

## Decisions

- **OpenAPI source: self-contained.** Ship Next.js Route Handlers under `src/app/api/*`
  that serve `data.ts`, plus a committed `openapi.yaml` describing them. The demo runs
  out-of-the-box over real HTTP. A forker swaps `openapi.yaml` + the base URL to point at
  their real Go/Node (Huma / NestJS+Swagger) backend; nothing else changes.
- **HTTP client: `openapi-fetch`.** The official companion to `openapi-typescript`: ~6kb,
  fully typed from the spec (path, params, body, response), no extra client codegen.
- **Integration depth: replace the users page.** Full worked example — list query +
  create/delete mutations with optimistic update — plus the RSC-prefetch + hydrate pattern.

## Data flow

```
openapi.yaml  ──(openapi-typescript)──►  src/lib/api/schema.d.ts   (contract types)
     ▲                                              │
     │ describes                                    ▼
app/api/* (Route Handlers)  ◄──(HTTP)──  openapi-fetch client  ◄── TanStack Query hooks ◄── components
     │
     └── backed by src/lib/data.ts (in-memory mutable store)
```

`openapi.yaml` is the single source of truth for the contract.

## Units

| Unit | Responsibility | Depends on |
|---|---|---|
| `openapi.yaml` | Contract: `GET /users`, `POST /users`, `DELETE /users/{id}`. Source for type generation. | — |
| `src/app/api/users/route.ts` | `GET` (list) + `POST` (create) handlers implementing the contract. | `data.ts` store |
| `src/app/api/users/[id]/route.ts` | `DELETE` handler. | `data.ts` store |
| `src/lib/api/schema.d.ts` | **Generated** — never hand-edited. | `openapi.yaml` |
| `src/lib/api/client.ts` | `createClient<paths>()` from openapi-fetch; base URL from env with localhost default. | `schema.d.ts` |
| `src/lib/query/get-query-client.ts` | QueryClient factory: singleton in browser, fresh per request on server. | `@tanstack/react-query` |
| `src/components/providers/query-provider.tsx` | `<QueryClientProvider>` + Devtools (dev only). Mounted in root layout. | get-query-client |
| `src/hooks/api/use-users.ts` | `useUsers()`, `useCreateUser()`, `useDeleteUser()` — optimistic update + rollback + invalidate. | client, react-query |
| `src/app/(app)/users/page.tsx` | RSC: prefetch `users` → `HydrationBoundary` → render client component. | get-query-client, client |
| `src/components/dashboard/users-table.tsx` | Client component using `useUsers`; add create/delete UI to exercise mutations. | use-users |
| `package.json` | `gen:api` script + deps. | — |

**Dependencies added:** `@tanstack/react-query`, `@tanstack/react-query-devtools`,
`openapi-fetch` (runtime); `openapi-typescript` (dev).

## Key patterns demonstrated

- **Cache:** `useUsers()` with `queryKey: ['users']` and a sensible `staleTime`.
- **Prefetch + hydrate:** server prefetches in the RSC, hydrates into the client — no
  loading flash, good UX. This is the canonical App Router pattern.
- **Optimistic update:** `onMutate` writes the cache and snapshots it; `onError` rolls
  back; `onSettled` invalidates. Errors surface via Sonner (already wired).

## Error handling

- Route Handlers return proper status codes (400 on invalid body, 404 on missing id).
- `openapi-fetch` returns `{ data, error }`; hooks throw on `error` so React Query's
  `onError` / `isError` paths trigger. Mutations roll back optimistic writes and toast.

## Testing / verification

- `npm run gen:api` regenerates types cleanly from `openapi.yaml`.
- `npm run build` and `npm run lint` pass.
- Manual: users page loads (prefetched), create adds a row optimistically, delete removes
  one optimistically; a forced API error rolls the UI back and toasts.

## Out of scope (YAGNI)

- No `openapi-react-query` binding (extra dep + magic for a starter).
- No auth headers plumbing, pagination, or infinite queries.
- Other pages (analytics/settings/dashboard) stay as-is.

## Next.js 16 note

Per `AGENTS.md`, Next 16 has breaking changes vs. training data (e.g. `proxy.ts` instead
of `middleware.ts`, async params/APIs). Read `node_modules/next/dist/docs/` for Route
Handlers, async request APIs, and layout conventions before writing code.
