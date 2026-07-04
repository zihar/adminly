# Scope + Cascade Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make two cross-module patterns first-class reusable primitives in the generic CRUD layer: (1) a multi-dimension **global scope** with a shell picker + cookie persistence + auto-inject into list & create; (2) a **multi-level cascade** field-registry primitive with a working generic demo.

**Architecture:** Both extend existing, well-understood primitives — scope reuses the role/locale switcher+cookie+`router.refresh()` pattern and the already-working `def.scope`→`useList` injection; cascade reuses the `async-select` `useWatch`/`useOptions`/reset-guard mechanism, generalized to an ordered N-level chain driven by one `FieldMeta.cascade` descriptor. No architectural change to the data layer.

**Tech Stack:** Next.js 16 (App Router, `proxy` not middleware), React 19, TypeScript, shadcn **Base UI** (`@base-ui/react`, `render={<C/>}` not `asChild`), TanStack Query, react-hook-form, Vitest + @testing-library/react, Playwright.

## Global Constraints

- **Generic only** — no domain terms (siswa/tahun-ajaran/wilayah); demo dimensions/resources are neutral (`workspace`, `regions`). Fork configures the real ones. Ref spec `docs/superpowers/specs/2026-07-03-adminly-crud-layer-design.md`.
- **i18n mandatory** — all user-facing copy via `useI18n()` + `resolveLabel(t, key)` (`@/locales`); new keys added to BOTH `src/locales/en.ts` (type source) and `id.ts`.
- **Base UI composition** — `render={<Component/>}`, never `asChild`; mirror existing `src/components/**` patterns.
- **No `any`**; `@/` alias; Indonesian code comments; two-space indent. `npx tsc --noEmit` + `npm run lint` must stay clean; test output pristine.
- **TDD** — failing test first; tests verify real behavior (real providers/HTTP via MSW, RHF state), not mocks.
- Cookie pattern verbatim from existing: `document.cookie = \`${NAME}=${v}; path=/; max-age=31536000; samesite=lax\`` then `router.refresh()` (see `src/components/providers/rbac-provider.tsx:35-44`); server seed via `cookies()` in `src/app/(app)/layout.tsx`.

---

### Task 1: Scope config + `parseScope`

**Files:**
- Create: `src/config/scope.ts`
- Create: `src/config/__tests__/scope.test.ts`

**Interfaces:**
- Produces: `type ScopeDimension = { key: string; labelKey: string; optionsFrom?: string; options?: { value: string; label: string }[] }`.
- Produces: `scopeDimensions: ScopeDimension[]` (demo: one `workspace` dimension with static options).
- Produces: `SCOPE_COOKIE = "adminly_scope"`; `parseScope(value: string | undefined | null): Record<string, string>` (JSON-parse safe; keep only keys present in `scopeDimensions`; drop empty; fallback `{}`).

- [ ] **Step 1: Write the failing test**

Create `src/config/__tests__/scope.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseScope } from "@/config/scope";

describe("parseScope", () => {
  it("returns {} for undefined/invalid JSON", () => {
    expect(parseScope(undefined)).toEqual({});
    expect(parseScope("not-json")).toEqual({});
  });
  it("keeps only known dimension keys and drops empties", () => {
    const raw = JSON.stringify({ workspace: "w1", bogus: "x", period: "" });
    expect(parseScope(raw)).toEqual({ workspace: "w1" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- scope`
Expected: FAIL (`Cannot find module '@/config/scope'`).

- [ ] **Step 3: Implement**

Create `src/config/scope.ts`:

```ts
/**
 * Konfigurasi "global scope" generik (pure — aman di server/client/proxy).
 * Fork mengisi `scopeDimensions` sesuai domainnya (mis. Edelweiss: tahun
 * ajaran/semester/term/unit). adminly kirim contoh generik `workspace`.
 */
export type ScopeDimension = {
  key: string;
  labelKey: string;                 // kunci i18n untuk label picker
  optionsFrom?: string;             // resource sumber opsi (via useOptions)
  options?: { value: string; label: string }[]; // opsi statis
};

export const scopeDimensions: ScopeDimension[] = [
  {
    key: "workspace",
    labelKey: "scope.workspace",
    options: [
      { value: "w1", label: "Workspace 1" },
      { value: "w2", label: "Workspace 2" },
    ],
  },
];

export const SCOPE_COOKIE = "adminly_scope";

/** Validasi cookie scope → map key→value aman (hanya key dimensi dikenal). */
export function parseScope(
  value: string | undefined | null,
): Record<string, string> {
  if (!value) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object") return {};
  const known = new Set(scopeDimensions.map((d) => d.key));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (known.has(k) && v !== undefined && v !== null && v !== "") {
      out[k] = String(v);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- scope` → Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/config/scope.ts src/config/__tests__/scope.test.ts
git commit -m "Tambah config scope + parseScope (dimensi generik + cookie)"
```

---

### Task 2: Persist scope in `ScopeProvider` + seed from cookie

**Files:**
- Modify: `src/components/providers/scope-provider.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Create: `src/components/providers/__tests__/scope-provider.test.tsx`

**Interfaces:**
- Consumes: `SCOPE_COOKIE` (Task 1).
- Produces: `useScope()` unchanged shape `{ scope, setScope }`, but `setScope(patch)` now (a) merges, (b) **deletes** a key when its value is `""`/`undefined`, (c) writes `SCOPE_COOKIE` (JSON) + calls `router.refresh()`.

- [ ] **Step 1: Write the failing test**

Create `src/components/providers/__tests__/scope-provider.test.tsx`:

```tsx
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as React from "react";
import { ScopeProvider, useScope } from "@/components/providers/scope-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function Probe() {
  const { scope, setScope } = useScope();
  return (
    <div>
      <span data-testid="ws">{String(scope.workspace ?? "-")}</span>
      <button onClick={() => setScope({ workspace: "w2" })}>set</button>
      <button onClick={() => setScope({ workspace: "" })}>clear</button>
    </div>
  );
}

afterEach(() => { document.cookie = "adminly_scope=; path=/; max-age=0"; });

describe("ScopeProvider persistence", () => {
  it("sets, persists to cookie, and clears a dimension", () => {
    render(<ScopeProvider initial={{}}><Probe /></ScopeProvider>);
    expect(screen.getByTestId("ws").textContent).toBe("-");
    act(() => { screen.getByText("set").click(); });
    expect(screen.getByTestId("ws").textContent).toBe("w2");
    expect(document.cookie).toContain("adminly_scope");
    act(() => { screen.getByText("clear").click(); });
    expect(screen.getByTestId("ws").textContent).toBe("-");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- scope-provider`
Expected: FAIL (persistence/clear not implemented — cookie assertion or clear fails).

- [ ] **Step 3: Implement provider changes**

In `src/components/providers/scope-provider.tsx`: import `useRouter` from `next/navigation` and `SCOPE_COOKIE` from `@/config/scope`; replace the `setScope` callback so it computes the next state (merge, delete keys whose value is `""`/`undefined`), writes the cookie, and calls `router.refresh()`. Keep `useScope()`'s non-throwing fallback. Concretely, replace the body of `ScopeProvider` state+setter with:

```tsx
  const router = useRouter();
  const [scope, setScopeState] = React.useState<ScopeValue>(initial);
  const setScope = React.useCallback(
    (patch: ScopeValue) => {
      setScopeState((s) => {
        const next: ScopeValue = { ...s };
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === "") delete next[k];
          else next[k] = v;
        }
        document.cookie = `${SCOPE_COOKIE}=${encodeURIComponent(
          JSON.stringify(next),
        )}; path=/; max-age=31536000; samesite=lax`;
        return next;
      });
      // Re-render Server Components (mis. prefetch list) agar ikut scope baru.
      router.refresh();
    },
    [router],
  );
```

(Add `"use client"` is already present. The `ScopeValue`/`Ctx`/`useScope` types stay as-is.)

- [ ] **Step 4: Seed from cookie in the app layout**

In `src/app/(app)/layout.tsx`: import `SCOPE_COOKIE, parseScope` from `@/config/scope`, read the cookie alongside the existing `cookieStore`, and pass it to the provider. Change `<ScopeProvider>` (line 29) to:

```tsx
      <ScopeProvider initial={parseScope(cookieStore.get(SCOPE_COOKIE)?.value)}>
```

- [ ] **Step 5: Run to verify it passes + typecheck/lint**

Run: `npm test -- scope-provider && npx tsc --noEmit && npm run lint`
Expected: PASS / clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/providers/scope-provider.tsx "src/app/(app)/layout.tsx" src/components/providers/__tests__/scope-provider.test.tsx
git commit -m "ScopeProvider: persist ke cookie + clear-dimensi + seed server"
```

---

### Task 3: `ScopeSwitcher` in the shell

**Files:**
- Create: `src/components/layout/scope-switcher.tsx`
- Modify: `src/components/layout/site-header.tsx`
- Modify: `src/locales/en.ts`, `src/locales/id.ts`
- Create: `src/components/layout/__tests__/scope-switcher.test.tsx`

**Interfaces:**
- Consumes: `scopeDimensions` (Task 1), `useScope` (Task 2), `resolveLabel` (`@/locales`), dropdown-menu UI.
- Produces: `ScopeSwitcher` React component (renders one radio dropdown per dimension; nothing if `scopeDimensions` is empty).

- [ ] **Step 1: Add i18n keys**

In `src/locales/en.ts` inside the `common` block add nothing; add a new top-level block `scope: { workspace: "Workspace" }`. Mirror in `src/locales/id.ts`: `scope: { workspace: "Workspace" }`. (en is the type source; keep shapes identical.)

- [ ] **Step 2: Write the failing test**

Create `src/components/layout/__tests__/scope-switcher.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScopeSwitcher } from "@/components/layout/scope-switcher";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { ScopeProvider } from "@/components/providers/scope-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("ScopeSwitcher", () => {
  it("renders a trigger for the workspace dimension label", () => {
    render(
      <I18nProvider initialLocale="en">
        <ScopeProvider initial={{}}>
          <ScopeSwitcher />
        </ScopeProvider>
      </I18nProvider>,
    );
    // Label resolved via i18n (scope.workspace → "Workspace")
    expect(screen.getAllByText(/Workspace/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- scope-switcher`
Expected: FAIL (`Cannot find module '@/components/layout/scope-switcher'`).

- [ ] **Step 4: Implement `ScopeSwitcher`**

Create `src/components/layout/scope-switcher.tsx` (mirror `role-switcher.tsx` structure; one dropdown per dimension, using static `dim.options`; label via `resolveLabel`). Use `render={<Button variant="outline" size="sm" />}` on the trigger. Example:

```tsx
"use client";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScope } from "@/components/providers/scope-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { resolveLabel } from "@/locales";
import { scopeDimensions } from "@/config/scope";

/** Picker scope global (mis. workspace). Fork mengisi `scopeDimensions`. */
export function ScopeSwitcher() {
  const { scope, setScope } = useScope();
  const { t } = useI18n();
  if (scopeDimensions.length === 0) return null;
  return (
    <>
      {scopeDimensions.map((dim) => {
        const label = resolveLabel(t, dim.labelKey);
        const current = String(scope[dim.key] ?? "");
        const opts = dim.options ?? [];
        return (
          <DropdownMenu key={dim.key}>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Layers className="size-4" />
              {opts.find((o) => o.value === current)?.label ?? label}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{label}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={current}
                onValueChange={(v) => setScope({ [dim.key]: v })}
              >
                {opts.map((o) => (
                  <DropdownMenuRadioItem key={o.value} value={o.value}>
                    {o.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </>
  );
}
```

- [ ] **Step 5: Mount in the header**

In `src/components/layout/site-header.tsx`: import `ScopeSwitcher` and render it in the toolbar `div.ml-auto` (line 43-47), before `<LocaleSwitcher />`:

```tsx
        <ScopeSwitcher />
        <LocaleSwitcher />
```

- [ ] **Step 6: Run tests + typecheck + lint**

Run: `npm test -- scope-switcher && npx tsc --noEmit && npm run lint`
Expected: PASS / clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/scope-switcher.tsx src/components/layout/site-header.tsx src/locales/en.ts src/locales/id.ts src/components/layout/__tests__/scope-switcher.test.tsx
git commit -m "Tambah ScopeSwitcher di header + kunci i18n scope"
```

---

### Task 4: Scope-consistent prefetch + wire demo `items` scope

**Files:**
- Modify: `src/lib/crud/list-params.ts`
- Modify: `src/components/crud/resource-page.tsx`
- Modify: `src/config/resources/items.ts`
- Modify: `src/components/crud/__tests__/resource-table.test.tsx` (extend existing scope test if needed)

**Interfaces:**
- Consumes: `SCOPE_COOKIE`, `parseScope` (Task 1); `useScope` scope→`useList` injection already in `resource-table.tsx:64-76`.
- Produces: `initialListParams(def, scope?: Record<string, unknown>): ListParams` — same as today plus, when `def.scope?.length`, includes a `scope` object built from the passed `scope` for `def.scope` keys (dropping undefined). Signature is backward-compatible (scope optional).

- [ ] **Step 1: Extend `initialListParams` to accept scope**

In `src/lib/crud/list-params.ts`, change the signature/body:

```ts
export function initialListParams(
  def: ResourceDef,
  scope?: Record<string, unknown>,
): ListParams {
  const scoped =
    def.scope?.length && scope
      ? Object.fromEntries(
          def.scope
            .map((k) => [k, scope[k]] as const)
            .filter(([, v]) => v !== undefined && v !== ""),
        )
      : undefined;
  return {
    page: 1,
    perPage: def.list?.perPage ?? DEFAULT_PER_PAGE,
    sort: def.list?.defaultSort || undefined,
    order: "asc",
    ...(scoped && Object.keys(scoped).length ? { scope: scoped } : {}),
  };
}
```

Update the docstring: scope is now included when the caller supplies it (server reads the scope cookie), so the prefetch key matches the client's first `useList` (which injects the same scope) — no hydration miss when a scope is active.

- [ ] **Step 2: Read scope cookie in the RSC page**

In `src/components/crud/resource-page.tsx`: import `cookies` from `next/headers` and `SCOPE_COOKIE, parseScope` from `@/config/scope`; read the cookie and pass to `initialListParams`. Change line 28 area:

```tsx
  const store = await cookies();
  const scope = parseScope(store.get(SCOPE_COOKIE)?.value);
  await queryClient.prefetchQuery(
    def.api.listQueryOptions(initialListParams(def, scope)),
  );
```

Also ensure `ResourceTable`'s first `useList` uses the same scope subset — it already injects `def.scope` keys from `useScope()` (`resource-table.tsx:64-76`); confirm the client's initial params include `initialListParams(def)` defaults (page/perPage/sort/order) merged with the injected scope so keys align.

- [ ] **Step 3: Give the demo `items` a scope dimension**

In `src/config/resources/items.ts`, add `scope: ["workspace"]` to the `defineResource({...})` object (so the demo list visibly refetches when the workspace picker changes). The mock `items` store ignores unknown `scope[...]` params (harmless); this is a demo of the wiring.

- [ ] **Step 4: Verify the scope→list path end-to-end**

Confirm the existing test `src/components/crud/__tests__/resource-table.test.tsx` (which already asserts `scope[...]` reaches the request for a scoped resource) still passes; if `items` now declares scope, adjust any fixture expectation. Run: `npm test -- resource-table`.
Expected: PASS.

- [ ] **Step 5: Full check + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean; build compiles.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crud/list-params.ts src/components/crud/resource-page.tsx src/config/resources/items.ts src/components/crud/__tests__/resource-table.test.tsx
git commit -m "Prefetch scope-consistent (server baca cookie) + items demo scope"
```

---

### Task 5: Scoped-create in `ResourceForm`

**Files:**
- Modify: `src/components/crud/resource-form.tsx`
- Modify: `src/components/crud/__tests__/resource-form.test.tsx`

**Interfaces:**
- Consumes: `useScope` (Task 2), `def.scope`.
- Produces: on **create** (not edit), the current scope values for the resource's `def.scope` keys are merged into the submitted payload as hidden defaults.

- [ ] **Step 1: Write the failing test**

In `src/components/crud/__tests__/resource-form.test.tsx`, add a test: render `ResourceForm` for a def with `scope: ["workspace"]` inside `<ScopeProvider initial={{ workspace: "w1" }}>` + `<I18nProvider>` (+ the existing QueryClient wrapper / MSW as used by that file). Submit a create; assert the POST body captured by MSW includes `workspace: "w1"` alongside the form field. (Mirror the existing create-flow test in this file; add the scope assertion.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- resource-form`
Expected: FAIL (scope not present in create payload).

- [ ] **Step 3: Implement scoped-create**

In `src/components/crud/resource-form.tsx`: import `useScope` from `@/components/providers/scope-provider`; read `const { scope } = useScope();`. In `onSubmit`, for the create branch, merge the resource's scope keys into `values` before mutate:

```tsx
      if (isEdit) {
        await update.mutateAsync({ id: id!, values });
      } else {
        const scoped = (def.scope ?? []).reduce<Record<string, unknown>>((acc, k) => {
          if (scope[k] !== undefined && scope[k] !== "") acc[k] = scope[k];
          return acc;
        }, {});
        await create.mutateAsync({ ...values, ...scoped });
      }
```

- [ ] **Step 4: Run to verify it passes + checks**

Run: `npm test -- resource-form && npx tsc --noEmit && npm run lint`
Expected: PASS / clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/crud/resource-form.tsx src/components/crud/__tests__/resource-form.test.tsx
git commit -m "ResourceForm: stempel scope aktif saat create (scoped-create)"
```

---

### Task 6: Generic `regions` options source (parent-filtered) + `cascade` field type

**Files:**
- Create: `src/app/api/regions/_data.ts`, `src/app/api/regions/options/route.ts`, `src/app/api/regions/route.ts`, `src/app/api/regions/[id]/route.ts`
- Create: `src/config/resources/regions.ts`
- Modify: `src/config/resources/register.ts` (register `regionsResource`)
- Modify: `src/lib/crud/define-resource.ts` (add `"cascade"` to `FieldType`, add `cascade` to `FieldMeta`)
- Create: `src/app/api/regions/__tests__/regions-options.test.ts`

**Interfaces:**
- Produces: a self-referential region hierarchy mock: rows `{ id, name, parentId }` (parentId `""` for roots). `GET /api/regions/options?parent[parentId]=<id>` returns `{value,label}[]` filtered to children of `<id>` (roots when absent), plus `q` filter.
- Produces: `regionsResource` registered so `getResource("regions")` resolves (used as `optionsFrom`).
- Produces: `FieldType` gains `"cascade"`; `FieldMeta.cascade?: { key: string; labelKey?: string; optionsFrom: string; parentParam?: string; searchable?: boolean }[]`.

- [ ] **Step 1: Write the failing test for parent filtering**

Create `src/app/api/regions/__tests__/regions-options.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { regionsData } from "@/app/api/regions/_data";

function childrenOf(parentId: string) {
  return regionsData.filter((r) => r.parentId === parentId);
}

describe("regions hierarchy fixture", () => {
  it("has roots and nested children", () => {
    expect(childrenOf("").length).toBeGreaterThan(0);          // countries
    const country = childrenOf("")[0];
    expect(childrenOf(country.id).length).toBeGreaterThan(0);   // states
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- regions`
Expected: FAIL (`Cannot find module '@/app/api/regions/_data'`).

- [ ] **Step 3: Create the region hierarchy fixture**

Create `src/app/api/regions/_data.ts`:

```ts
export type Region = { id: string; name: string; parentId: string };

// Hierarki generik 3 level: country → state → city (parentId "" = root).
export const regionsData: Region[] = [
  { id: "c1", name: "Country A", parentId: "" },
  { id: "c2", name: "Country B", parentId: "" },
  { id: "s1", name: "State A1", parentId: "c1" },
  { id: "s2", name: "State A2", parentId: "c1" },
  { id: "s3", name: "State B1", parentId: "c2" },
  { id: "t1", name: "City A1a", parentId: "s1" },
  { id: "t2", name: "City A1b", parentId: "s1" },
  { id: "t3", name: "City A2a", parentId: "s2" },
];
```

- [ ] **Step 4: Run to verify the fixture test passes**

Run: `npm test -- regions` → Expected: PASS.

- [ ] **Step 5: Create the options route honoring `parent`**

Create `src/app/api/regions/options/route.ts` (mirror the **committed** `src/app/api/items/options/route.ts` — plain exported `GET`, no `withErrorEnvelope`; that helper is NOT in the committed tree):

```ts
import { NextRequest, NextResponse } from "next/server";
import { regionsData } from "@/app/api/regions/_data";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parentId = sp.get("parent[parentId]") ?? "";
  const q = (sp.get("q") ?? "").toLowerCase();
  const rows = regionsData
    .filter((r) => r.parentId === parentId)
    .filter((r) => (q ? r.name.toLowerCase().includes(q) : true));
  return NextResponse.json(rows.map((r) => ({ value: r.id, label: r.name })));
}
```

- [ ] **Step 6: Create list/[id] routes + resource def + register**

Create `src/app/api/regions/route.ts` and `src/app/api/regions/[id]/route.ts` following `src/app/api/items/route.ts` and `items/[id]/route.ts` exactly (backed by a `createCollectionStore(regionsData)` instance — add it to `_data.ts` as `regionsStore` or a local store; list/get/create/update/delete). These exist so the generic `[resource]` route/registry are satisfied even though `regions` is used mainly as an options source.

Create `src/config/resources/regions.ts` (minimal, mirror `items.ts`): `regionsResource = defineResource<Region,...>({ name:"regions", path:"/regions", api: createResourceApi(...), permissions: { view:"items:view", create:"items:create", update:"items:update", delete:"items:delete" }, columns:[{field:"name",labelKey:"regions.name",sortable:true,searchable:true}], list:{defaultSort:"name",perPage:20}, form:{ schema: z.object({ name: z.string().min(1) }), layout:[{tabKey:"umum",fields:["name"]}], fields:{ name:{type:"text",labelKey:"regions.name"} } } })`. (Reuse `items:*` permissions to avoid touching the RBAC union; regions is a demo options source.)

In `src/config/resources/register.ts`, register `regionsResource` alongside `itemsResource`. Add `regions: { name: "Regions" }` i18n key to `en.ts` + `id.ts`.

- [ ] **Step 7: Add the `cascade` field type**

In `src/lib/crud/define-resource.ts`: add `"cascade"` to the `FieldType` union (line 6-8), and add to `FieldMeta` (line 21-28):

```ts
  cascade?: {
    key: string;            // nama field RHF untuk level ini
    labelKey?: string;
    optionsFrom: string;    // resource sumber opsi
    parentParam?: string;   // nama param parent[...] (default "parentId")
    searchable?: boolean;
  }[];
```

- [ ] **Step 8: Verify + commit**

Run: `npm test -- regions && npx tsc --noEmit && npm run lint`.
Expected: PASS / clean. Then:

```bash
git add "src/app/api/regions" src/config/resources/regions.ts src/config/resources/register.ts src/lib/crud/define-resource.ts src/locales/en.ts src/locales/id.ts src/app/api/regions/__tests__/regions-options.test.ts
git commit -m "Tambah mock regions (options parent-filtered) + tipe field cascade"
```

---

### Task 7: `CascadeField` primitive + demo + tests

**Files:**
- Create: `src/components/crud/fields/cascade-field.tsx`
- Modify: `src/components/crud/fields/index.tsx` (register `"cascade"`)
- Modify: `src/config/resources/items.ts` + `openapi.yaml` + `src/app/api/items/_data.ts` (extend demo `items` with optional region fields) + run `npm run gen:api`
- Create: `src/components/crud/fields/__tests__/cascade-field.test.tsx`

**Interfaces:**
- Consumes: `FieldMeta.cascade` (Task 6), `getResource(optionsFrom)` → `useOptions({ parent, q })` (Task 6 regions route), `FieldProps` (`fields/index.tsx`), RHF `useFormContext`/`useWatch`.
- Produces: `CascadeField` rendering N chained `<select>`s; `registerField("cascade", CascadeField)`.

- [ ] **Step 1: Write the failing RTL test**

Create `src/components/crud/fields/__tests__/cascade-field.test.tsx` using MSW to serve `/api/regions/options` (parent-filtered) + the QueryClient + FormProvider wrapper (mirror the existing `async-select-field` test setup). Assert: (a) level 2 select is empty/disabled until level 1 chosen; (b) after choosing country `c1`, level 2 shows its states; (c) changing country resets level 2 & 3 to `""`; (d) an edit-mode prefill (form default values for all levels) is NOT wiped on mount.

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- cascade-field`
Expected: FAIL (`Cannot find module '.../cascade-field'`).

- [ ] **Step 3: Implement `CascadeField`**

Create `src/components/crud/fields/cascade-field.tsx` — render each `meta.cascade[]` level as a `<select>` bound to its own RHF field (`level.key`). For level i>0, watch the previous level's value and call `getResource(level.optionsFrom).api.useOptions({ parent: { [level.parentParam ?? "parentId"]: prevValue }, q })`, gated by `enabled` (the factory already gates until parents non-empty). On a level's change, **explicitly reset all deeper levels** to `""` (guaranteed cascade reset, not emergent). Reuse the `mounted` ref guard from `async-select-field.tsx:23-30` so edit-mode prefills aren't wiped on first mount. Labels via `resolveLabel`. Example skeleton (fill in per the async-select pattern):

```tsx
"use client";
import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { getResource } from "@/config/resources/index";
import { useI18n } from "@/components/providers/i18n-provider";
import { resolveLabel } from "@/locales";
import type { FieldProps } from "./index";

export function CascadeField({ meta }: FieldProps) {
  const levels = meta.cascade ?? [];
  return (
    <div className="space-y-2">
      {levels.map((level, i) => (
        <CascadeLevel key={level.key} level={level} levels={levels} index={i} />
      ))}
    </div>
  );
}
```

`CascadeLevel` (one component per level, so hooks are stable): watches `levels[index-1].key` (root level watches nothing), fetches options, renders the `<select id={level.key} {...register(level.key)}>`, and on change resets `levels[index+1..].key` to `""` via `setValue`. Keep it typed, no `any`.

- [ ] **Step 4: Register the field**

In `src/components/crud/fields/index.tsx`: `import { CascadeField } from "./cascade-field";` and `registerField("cascade", CascadeField);`.

- [ ] **Step 5: Run the RTL test**

Run: `npm test -- cascade-field` → Expected: PASS (all four assertions).

- [ ] **Step 6: Wire the cascade into the `items` demo form**

Extend the demo so the cascade is exercised in a real form/page:
- `openapi.yaml`: add optional `country`, `state`, `city` string props to the `Item` (and `NewItem`) schema; run `npm run gen:api`.
- `src/app/api/items/_data.ts`: widen `ItemRow` with optional `country?/state?/city?`.
- `src/config/resources/items.ts`: extend `itemSchema` with optional `country/state/city` (`z.string().optional()`); add a form tab/field `region` of type `cascade` with `meta.cascade` = three levels (country/state/city) all `optionsFrom: "regions"`, `parentParam: "parentId"`; add the three field keys to a form tab's `fields`.

- [ ] **Step 7: Full verification + build**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all green; build compiles the extended `items`.

- [ ] **Step 8: Commit**

```bash
git add src/components/crud/fields/cascade-field.tsx src/components/crud/fields/index.tsx src/components/crud/fields/__tests__/cascade-field.test.tsx src/config/resources/items.ts openapi.yaml src/lib/api/schema.d.ts src/app/api/items/_data.ts
git commit -m "Tambah CascadeField (rantai N-level, reset berantai) + demo items region"
```

---

## Self-Review

**Spec coverage (plan file `immutable-stirring-trinket.md` §A/§B):**
- A1 scope config → Task 1. A2 provider persist+seed → Task 2. A3 picker+header → Task 3. A4 auto-inject list (already works) + demo scope → Task 4. A5 scoped-create → Task 5. A6 scope-consistent prefetch → Task 4. ✓
- B1 `cascade` field type → Task 6. B2 CascadeField primitive + register → Task 7. B3 mock `/options` honor `parent` + demo → Tasks 6 & 7. ✓
- Deferred (workflow, file/export) → intentionally NOT in this plan. ✓

**Placeholder scan:** Task 7 Step 3 gives a skeleton + precise behavior spec referencing the exact reuse pattern (`async-select-field.tsx:23-30`) rather than full code — acceptable because it is a direct generalization of an existing, cited component; the implementer TDDs against the Step-1 test. All other code steps are complete. No TBD/TODO.

**Type consistency:** `ScopeDimension`/`scopeDimensions`/`SCOPE_COOKIE`/`parseScope` (Task 1) used verbatim in Tasks 2–4. `initialListParams(def, scope?)` new signature (Task 4) is backward-compatible with its call in `resource-page.tsx`. `FieldMeta.cascade` shape (Task 6) matches `CascadeField` consumption (Task 7). `regions` route `parent[parentId]` param matches `parentParam` default `"parentId"` (Tasks 6 & 7). Reused `items:*` permissions for `regions` avoids RBAC-union edits.
