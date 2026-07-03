# TanStack Query + Typed OpenAPI Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-side data layer to the Adminly starter — TanStack Query (cache, mutation, optimistic update) fed by a fully-typed HTTP client generated from an OpenAPI contract — and convert the users page into the worked example.

**Architecture:** A committed `openapi.yaml` is the single source of truth. `openapi-typescript` generates `src/lib/api/schema.d.ts`; `openapi-fetch` consumes those types for an isomorphic typed client. Next.js 16 Route Handlers under `src/app/api/*` implement the contract against an in-memory store seeded from `src/lib/data.ts`. TanStack Query hooks wrap the client; the users page prefetches on the server and hydrates on the client.

**Tech Stack:** Next.js 16 (App Router, Route Handlers), React 19, TypeScript, `@tanstack/react-query` + devtools, `openapi-fetch`, `openapi-typescript` (dev), Sonner (existing).

## Global Constraints

- Next.js 16 — read `node_modules/next/dist/docs/` before touching framework code. Route Handler dynamic params are async: `await ctx.params`, typed via the global `RouteContext<'/api/users/[id]'>`.
- Route Handler files live in `src/app/api/**/route.ts`; a `route.ts` cannot share a segment with `page.ts`.
- `src/lib/api/schema.d.ts` is **generated** — never hand-edit; regenerate with `npm run gen:api`.
- No test runner is installed and adding one is out of scope. Each task's "test" is executable verification: `curl` against the dev server, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and a final Playwright drive-through.
- Preserve existing conventions: `@/` path alias, Indonesian code comments, i18n via `useI18n()`, permission gating via `<Can>`.
- Keep `src/lib/data.ts` as the type + seed source; do not delete it.

---

### Task 1: OpenAPI contract + type generation pipeline

**Files:**
- Create: `openapi.yaml`
- Create: `src/lib/api/schema.d.ts` (generated output — committed)
- Modify: `package.json` (deps + `gen:api` script)
- Create: `.env.example`

**Interfaces:**
- Produces: `openapi.yaml` with paths `/users` (GET, POST), `/users/{id}` (DELETE) and schemas `User`, `NewUser`.
- Produces: generated types importable as `import type { paths, components } from "@/lib/api/schema"`, where `components["schemas"]["User"]` and `components["schemas"]["NewUser"]` are the row and create-payload types.
- Produces: `npm run gen:api` script.

- [ ] **Step 1: Install dependencies**

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools openapi-fetch
npm install -D openapi-typescript
```

- [ ] **Step 2: Add the `gen:api` script to `package.json`**

In the `"scripts"` block, add:

```json
"gen:api": "openapi-typescript openapi.yaml -o src/lib/api/schema.d.ts"
```

- [ ] **Step 3: Write the OpenAPI contract**

Create `openapi.yaml`:

```yaml
openapi: 3.1.0
info:
  title: Adminly API
  version: 1.0.0
  description: >-
    Self-contained contract for the starter. Route Handlers under src/app/api
    implement it against an in-memory store. Swap `servers.url` + the generated
    schema for your real backend (Go/Huma, NestJS+Swagger, ...).
servers:
  - url: /api
paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      responses:
        "200":
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/User"
    post:
      operationId: createUser
      summary: Create a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewUser"
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "400":
          description: Invalid input
  /users/{id}:
    delete:
      operationId: deleteUser
      summary: Delete a user
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Deleted
        "404":
          description: Not found
components:
  schemas:
    User:
      type: object
      required: [id, name, email, role, status, createdAt]
      properties:
        id: { type: string }
        name: { type: string }
        email: { type: string }
        role: { type: string }
        status:
          type: string
          enum: [active, invited, suspended]
        createdAt: { type: string }
    NewUser:
      type: object
      required: [name, email, role]
      properties:
        name: { type: string }
        email: { type: string }
        role: { type: string }
```

- [ ] **Step 4: Generate the types**

Run: `npm run gen:api`
Expected: creates `src/lib/api/schema.d.ts` with `export interface paths` and `export interface components` (no errors printed).

- [ ] **Step 5: Verify the generated types are usable**

Run: `npx tsc --noEmit`
Expected: PASS (exit 0). The new file compiles.

- [ ] **Step 6: Add `.env.example`**

Create `.env.example`:

```bash
# Base URL of the API the typed client talks to.
# Leave unset to use the built-in Next.js Route Handlers (same origin, /api).
# Point this at your real backend (Go/Huma, NestJS+Swagger, ...) in production,
# then regenerate types from its spec: npm run gen:api
# NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

- [ ] **Step 7: Commit**

```bash
git add openapi.yaml src/lib/api/schema.d.ts package.json package-lock.json .env.example
git commit -m "Tambah kontrak OpenAPI + pipeline generate tipe (openapi-typescript)"
```

---

### Task 2: In-memory store + Route Handlers

**Files:**
- Create: `src/lib/api/users-store.ts`
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/[id]/route.ts`

**Interfaces:**
- Consumes: `users`, `AppUser` from `@/lib/data` (Task pre-existing).
- Produces: `listUsers(): AppUser[]`, `createUser(input: { name: string; email: string; role: string }): AppUser`, `deleteUser(id: string): boolean` from `@/lib/api/users-store`.
- Produces: HTTP endpoints `GET /api/users`, `POST /api/users`, `DELETE /api/users/{id}`.

- [ ] **Step 1: Write the in-memory store**

Create `src/lib/api/users-store.ts`:

```ts
import { users as seed, type AppUser } from "@/lib/data";

// Salinan mutable di memori agar Route Handler bisa create/delete saat dev.
// Ganti dengan database sungguhan di produksi.
let store: AppUser[] = [...seed];

export function listUsers(): AppUser[] {
  return store;
}

export function createUser(input: {
  name: string;
  email: string;
  role: string;
}): AppUser {
  const user: AppUser = {
    id: `u_${Date.now()}`,
    name: input.name,
    email: input.email,
    role: input.role,
    status: "invited",
    createdAt: new Date().toISOString().slice(0, 10),
  };
  store = [user, ...store];
  return user;
}

export function deleteUser(id: string): boolean {
  const before = store.length;
  store = store.filter((u) => u.id !== id);
  return store.length < before;
}
```

- [ ] **Step 2: Write the collection Route Handler**

Create `src/app/api/users/route.ts`:

```ts
import { NextResponse } from "next/server";

import { createUser, listUsers } from "@/lib/api/users-store";

export async function GET() {
  return NextResponse.json(listUsers());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.role !== "string"
  ) {
    return NextResponse.json(
      { message: "Invalid user payload" },
      { status: 400 },
    );
  }

  const user = createUser({
    name: body.name,
    email: body.email,
    role: body.role,
  });
  return NextResponse.json(user, { status: 201 });
}
```

- [ ] **Step 3: Write the item Route Handler**

Create `src/app/api/users/[id]/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

import { deleteUser } from "@/lib/api/users-store";

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/users/[id]">,
) {
  const { id } = await ctx.params;
  const removed = deleteUser(id);
  if (!removed) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 4: Start the dev server**

Run: `npm run dev` (leave running in a background terminal)
Expected: "Ready" on http://localhost:3000. (`RouteContext` types are generated during `next dev`.)

- [ ] **Step 5: Test GET — list**

Run: `curl -s http://localhost:3000/api/users`
Expected: JSON array containing the 5 seed users (e.g. `"Andi Wijaya"`).

- [ ] **Step 6: Test POST — create (happy + invalid)**

Run:
```bash
curl -s -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test User","email":"test@example.com","role":"Viewer"}' -w '\n%{http_code}\n'
curl -s -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' -d '{"name":"x"}' -w '\n%{http_code}\n'
```
Expected: first returns the created user with a generated `id` and status `201`; second returns `{"message":"Invalid user payload"}` and status `400`.

- [ ] **Step 7: Test DELETE (happy + missing)**

Run:
```bash
curl -s -X DELETE http://localhost:3000/api/users/1 -w '%{http_code}\n'
curl -s -X DELETE http://localhost:3000/api/users/does-not-exist -w '\n%{http_code}\n'
```
Expected: first returns empty body + status `204`; second returns `{"message":"User not found"}` + status `404`.

- [ ] **Step 8: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/api/users-store.ts "src/app/api/users/route.ts" "src/app/api/users/[id]/route.ts"
git commit -m "Tambah in-memory store + Route Handlers users (GET/POST/DELETE)"
```

---

### Task 3: Typed client + QueryClient + provider

**Files:**
- Create: `src/lib/api/client.ts`
- Create: `src/lib/query/get-query-client.ts`
- Create: `src/components/providers/query-provider.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `paths` from `@/lib/api/schema` (Task 1).
- Produces: `apiClient` (openapi-fetch client, typed by `paths`) from `@/lib/api/client`.
- Produces: `getQueryClient(): QueryClient` from `@/lib/query/get-query-client`.
- Produces: `QueryProvider` component from `@/components/providers/query-provider`.

- [ ] **Step 1: Write the typed client**

Create `src/lib/api/client.ts`:

```ts
import createClient from "openapi-fetch";

import type { paths } from "@/lib/api/schema";

// Base URL client. Di browser pakai relatif "/api" (Route Handler lokal).
// Di server (RSC prefetch) fetch butuh URL absolut → fallback ke localhost.
// Set NEXT_PUBLIC_API_BASE_URL untuk mengarah ke backend sungguhan.
function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  return `http://localhost:${process.env.PORT ?? "3000"}/api`;
}

export const apiClient = createClient<paths>({ baseUrl: resolveBaseUrl() });
```

- [ ] **Step 2: Write the QueryClient factory**

Create `src/lib/query/get-query-client.ts`:

```ts
import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query";

// Pola App Router: instance baru per-request di server, singleton di browser.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
      dehydrate: {
        // Ikut dehydrate query yang masih "pending" agar prefetch streaming jalan.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
```

- [ ] **Step 3: Write the provider**

Create `src/components/providers/query-provider.tsx`:

```tsx
"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { getQueryClient } from "@/lib/query/get-query-client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Mount the provider in the root layout**

In `src/app/layout.tsx`, add the import after the other provider imports:

```tsx
import { QueryProvider } from "@/components/providers/query-provider";
```

Then wrap the existing tree. Replace:

```tsx
      <body className="min-h-full">
        <I18nProvider initialLocale={locale}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </I18nProvider>
      </body>
```

with:

```tsx
      <body className="min-h-full">
        <QueryProvider>
          <I18nProvider initialLocale={locale}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
```

- [ ] **Step 5: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 6: Verify the app still renders**

With `npm run dev` running, run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/dashboard`
Expected: `200`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/api/client.ts src/lib/query/get-query-client.ts src/components/providers/query-provider.tsx src/app/layout.tsx
git commit -m "Tambah typed openapi-fetch client + QueryClient provider"
```

---

### Task 4: Users query + mutation hooks (optimistic)

**Files:**
- Create: `src/hooks/api/use-users.ts`

**Interfaces:**
- Consumes: `apiClient` from `@/lib/api/client`; `components` from `@/lib/api/schema`.
- Produces: type `User = components["schemas"]["User"]`, `NewUser = components["schemas"]["NewUser"]`.
- Produces: `usersKey` (`readonly ["users"]`), `usersQueryOptions()`, `useUsers()`, `useCreateUser()`, `useDeleteUser()`.
- Note: **no `"use client"` directive** — the file is imported by the RSC page (for `usersQueryOptions`) and by the client table (for the hooks). Hook bodies only execute inside client components.

- [ ] **Step 1: Write the hooks**

Create `src/hooks/api/use-users.ts`:

```ts
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";

export type User = components["schemas"]["User"];
export type NewUser = components["schemas"]["NewUser"];

export const usersKey = ["users"] as const;

// Dibagikan antara prefetch server (page RSC) dan useUsers() di client.
export function usersQueryOptions() {
  return queryOptions({
    queryKey: usersKey,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/users");
      if (error || !data) {
        throw new Error("Failed to load users");
      }
      return data;
    },
  });
}

export function useUsers() {
  return useQuery(usersQueryOptions());
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewUser) => {
      const { data, error } = await apiClient.POST("/users", { body: input });
      if (error || !data) {
        throw new Error("Failed to create user");
      }
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: usersKey });
      const previous = queryClient.getQueryData<User[]>(usersKey);

      const optimistic: User = {
        id: `temp-${input.email}`,
        name: input.name,
        email: input.email,
        role: input.role,
        status: "invited",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      queryClient.setQueryData<User[]>(usersKey, (old = []) => [
        optimistic,
        ...old,
      ]);

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(usersKey, context.previous);
      }
      toast.error("Could not add user");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: usersKey });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.DELETE("/users/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error("Failed to delete user");
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: usersKey });
      const previous = queryClient.getQueryData<User[]>(usersKey);

      queryClient.setQueryData<User[]>(usersKey, (old = []) =>
        old.filter((u) => u.id !== id),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(usersKey, context.previous);
      }
      toast.error("Could not delete user");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: usersKey });
    },
  });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. In particular, `apiClient.GET("/users")` returns `data: User[] | undefined` and `apiClient.DELETE("/users/{id}", { params: { path: { id } } })` typechecks — proving end-to-end types.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/api/use-users.ts
git commit -m "Tambah hooks useUsers/useCreateUser/useDeleteUser (optimistic update)"
```

---

### Task 5: Wire the users page (prefetch + hydrate) and table

**Files:**
- Modify: `src/app/(app)/users/page.tsx`
- Modify: `src/components/dashboard/users-table.tsx`
- Modify: `src/locales/en.ts` and `src/locales/id.ts` (add create-form + error strings)

**Interfaces:**
- Consumes: `usersQueryOptions`, `useUsers`, `useCreateUser`, `useDeleteUser` from `@/hooks/api/use-users`; `getQueryClient` from `@/lib/query/get-query-client`.
- Produces: `UsersTable` now takes **no props** (`<UsersTable />`); it fetches via `useUsers`.

- [ ] **Step 1: Add i18n strings (English source of truth)**

In `src/locales/en.ts`, inside the `users:` object, after `deletingToast`, add these keys:

```ts
    addTitle: "Add user",
    formName: "Name",
    formEmail: "Email",
    formRole: "Role",
    create: "Create",
    cancel: "Cancel",
    loadError: "Failed to load users.",
    retry: "Retry",
    createError: "Could not add user",
    deleteError: "Could not delete user",
```

- [ ] **Step 2: Mirror the strings in Indonesian**

In `src/locales/id.ts`, inside the matching `users:` object, add:

```ts
    addTitle: "Tambah pengguna",
    formName: "Nama",
    formEmail: "Email",
    formRole: "Peran",
    create: "Buat",
    cancel: "Batal",
    loadError: "Gagal memuat pengguna.",
    retry: "Coba lagi",
    createError: "Gagal menambah pengguna",
    deleteError: "Gagal menghapus pengguna",
```

- [ ] **Step 3: Point the mutation toasts at the i18n strings**

The hooks in Task 4 use hard-coded English toast text so they stay i18n-agnostic. Leave them as-is (they are the fallback). The table (client, has `useI18n`) will surface localized errors via `isError` state instead — no change needed to `use-users.ts`.

- [ ] **Step 4: Rewrite the users page as prefetch + hydrate**

Replace the entire contents of `src/app/(app)/users/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { PageHeader } from "@/components/layout/page-header";
import { UsersTable } from "@/components/dashboard/users-table";
import { getDictionary } from "@/lib/get-dictionary";
import { getQueryClient } from "@/lib/query/get-query-client";
import { usersQueryOptions } from "@/hooks/api/use-users";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.users.title };
}

export default async function UsersPage() {
  const t = await getDictionary();

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(usersQueryOptions());

  return (
    <>
      <PageHeader title={t.users.title} description={t.users.description} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <UsersTable />
      </HydrationBoundary>
    </>
  );
}
```

Note: the "Add user" button moves from the header into the table (Step 5), so the `<Can>` + `Button` + `Plus` imports and the header child are removed here.

- [ ] **Step 5: Rewrite the users table to use the hooks**

Replace the entire contents of `src/components/dashboard/users-table.tsx` with:

```tsx
"use client";

import * as React from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/components/auth/can";
import { useI18n } from "@/components/providers/i18n-provider";
import { format } from "@/locales";
import {
  useCreateUser,
  useDeleteUser,
  useUsers,
  type User,
} from "@/hooks/api/use-users";

const statusVariant: Record<
  User["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  invited: "secondary",
  suspended: "destructive",
};

export function UsersTable() {
  const { t } = useI18n();
  const [query, setQuery] = React.useState("");

  const { data, isPending, isError, refetch } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    createUser.mutate(
      { name: name.trim(), email: email.trim(), role: "Viewer" },
      {
        onSuccess: () => {
          setName("");
          setEmail("");
          setAdding(false);
        },
      },
    );
  }

  const filtered = (data ?? []).filter((u) =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.users.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Can permission="users:manage">
          <Button onClick={() => setAdding((v) => !v)}>
            <Plus className="size-4" />
            {t.users.addUser}
          </Button>
        </Can>
      </div>

      <Can permission="users:manage">
        {adding ? (
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3 rounded-md border p-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="new-name">{t.users.formName}</Label>
              <Input
                id="new-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-email">{t.users.formEmail}</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={createUser.isPending}>
              {t.users.create}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              {t.users.cancel}
            </Button>
          </form>
        ) : null}
      </Can>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.users.colName}</TableHead>
              <TableHead>{t.users.colRole}</TableHead>
              <TableHead>{t.users.colStatus}</TableHead>
              <TableHead>{t.users.colJoined}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    {t.users.loadError}
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      {t.users.retry}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.users.empty}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>
                          {user.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[user.status]}>
                      {t.users.status[user.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {user.createdAt}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" className="size-8" />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">{t.users.actions}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            toast.info(
                              format(t.users.editingToast, { name: user.name }),
                            )
                          }
                        >
                          {t.users.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteUser.mutate(user.id)}
                        >
                          {t.users.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS. (Confirms `<UsersTable />` no longer needs the removed `data` prop and the old `AppUser`/`UserStatus` imports are gone.)

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: build succeeds; `/users` compiles as a dynamic route.

- [ ] **Step 8: End-to-end drive-through (Playwright MCP)**

With `npm run dev` running, use the Playwright MCP tools to:
1. Navigate to `http://localhost:3000/users`. Expect the seeded users to render immediately (prefetched — no loading skeleton flash).
2. Click **Add user**, fill Name + Email, click **Create**. Expect a new row to appear at the top instantly (optimistic), then settle after the POST.
3. Open a row's actions menu, click **Delete**. Expect the row to disappear immediately (optimistic).
4. Confirm no console errors.

Capture a screenshot as evidence.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/users/page.tsx" src/components/dashboard/users-table.tsx src/locales/en.ts src/locales/id.ts
git commit -m "Sambungkan halaman users ke TanStack Query (prefetch+hydrate, create/delete optimistic)"
```

---

### Task 6: Documentation

**Files:**
- Modify: `README.md`

**Interfaces:** none (docs only).

- [ ] **Step 1: Document the data layer in the README structure section**

In `README.md`, update the `src/` structure block to include the new pieces and add a short "Data layer" subsection. Add these lines to the tree (under the appropriate folders):

```
├─ app/
│  └─ api/users/            # Route Handlers (GET/POST + [id] DELETE) — demo backend
├─ hooks/
│  └─ api/use-users.ts      # TanStack Query hooks (query + optimistic mutations)
├─ lib/
│  ├─ api/client.ts         # typed openapi-fetch client
│  ├─ api/schema.d.ts       # GENERATED from openapi.yaml (npm run gen:api)
│  ├─ api/users-store.ts    # in-memory store behind the Route Handlers
│  └─ query/get-query-client.ts  # QueryClient factory (App Router pattern)
```

And add this subsection after the "Using it for a new project" list:

```markdown
## Data layer (TanStack Query + typed OpenAPI client)

- `openapi.yaml` is the API contract. `npm run gen:api` regenerates
  `src/lib/api/schema.d.ts` with `openapi-typescript` — never edit it by hand.
- `src/lib/api/client.ts` is an `openapi-fetch` client typed end-to-end from the
  spec (paths, params, bodies, responses).
- Query/mutation hooks live in `src/hooks/api/*` and demonstrate caching,
  optimistic updates, and rollback (see `use-users.ts`).
- The users page prefetches on the server and hydrates on the client.

**Pointing at a real backend:** set `NEXT_PUBLIC_API_BASE_URL` (see `.env.example`),
replace `openapi.yaml` with your backend's spec (or a URL), run `npm run gen:api`,
and delete `src/app/api/*` + `src/lib/api/users-store.ts`. Everything else is unchanged.
```

- [ ] **Step 2: Verify the doc renders sanely**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS (no code changed, sanity check only).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Dokumentasikan data layer (TanStack Query + typed OpenAPI client)"
```

---

## Self-Review

**Spec coverage:**
- TanStack Query cache → Task 4 `useUsers`/`usersQueryOptions` + `staleTime` (Task 3). ✓
- Mutation + optimistic update + rollback → Task 4 `useCreateUser`/`useDeleteUser`. ✓
- Typed client via OpenAPI (openapi-typescript + openapi-fetch) → Tasks 1 & 3. ✓
- Self-contained Route Handlers + `openapi.yaml` → Tasks 1 & 2. ✓
- Prefetch + hydrate worked example → Task 5. ✓
- Env swap to real backend → Task 1 `.env.example` + Task 6 docs. ✓
- YAGNI (no openapi-react-query, no auth/pagination) → honored. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `User`/`NewUser` from `components["schemas"]` used consistently in Tasks 4 & 5; `usersKey`, `usersQueryOptions`, `useUsers`, `useCreateUser`, `useDeleteUser` names match across Tasks 4 & 5; `<UsersTable />` prop removal is reflected in both page and table. `RouteContext<"/api/users/[id]">` matches the file path. ✓
