# API Error Envelope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> ⚠️ **EXECUTION HOLD:** A concurrent session was observed mutating this repo in real time (branches appearing, HEAD moving mid-command). Do NOT start SDD until the user confirms only one session is active, then re-verify git state is stable before Task 1.

**Goal:** Standardize all API Route Handler **error** responses into one i18n envelope `{ code, status:"error", message, data }`, driven by a `withErrorEnvelope` wrapper + throw-based `ApiError`, with Zod validation (→422) — re-derived cleanly on current `main` from the stale `stash@{1}` reference and extended to the `regions` routes.

**Architecture:** A new `src/lib/api/handler.ts` provides `withErrorEnvelope(fn)` (maps thrown `ZodError`→422, `ApiError`→coded, unknown→500, messages from an i18n `errors` dict) + `ApiError` + helper constructors. Routes become `export const M = withErrorEnvelope(async (req, ctx?) => {…})`, using `throw notFound()` and `schema.parse()`. Success responses stay un-enveloped. Client `normalizeError`/`ErrorEnvelope` migrate field errors from `errors` → `data`.

**Tech Stack:** Next.js 16 Route Handlers (`RouteContext`, `proxy` not middleware), Zod v4 (`z.flattenError`), TypeScript, Vitest, Playwright. Reference (design source): spec `docs/superpowers/specs/2026-07-04-api-error-envelope-design.md`.

## Global Constraints

- **Error-only envelope**: `{ code:number, status:"error", message:string, data: Record<string,string[]> | null }`. Success payloads unchanged (raw `{data,meta}` / raw object).
- **Field errors under `data`** (not `errors`) — keep `handler.ts`, `ErrorEnvelope`, `normalizeError`, and OpenAPI `Error.data` consistent.
- **i18n**: error messages from a new `errors` dictionary block; resolved via dynamic `getDictionary()` with English fallback. New keys mirrored in BOTH `src/locales/en.ts` (type source) and `id.ts`.
- **Validation** via resource Zod schemas → 422 (users POST changes 400→422).
- **`ctx` optional** in the wrapper's handler type so context-less routes (collection GET/POST) remain callable with one arg (fixes the stash's tsc errors).
- Next.js 16: dynamic routes use `RouteContext<"/api/…/[id]">` + `await ctx.params`. Generic only; no `any`; `@/` alias; Indonesian comments; two-space indent. `npx tsc --noEmit` + `npm run lint` clean; tests import-and-invoke handlers with a real `NextRequest` (pattern: `src/app/api/items/__tests__/items-route.test.ts`).
- Handlers are Node-runtime; `handler.ts` must NOT `import "server-only"` (keep it Vitest-testable).

---

### Task 1: `handler.ts` core + i18n `errors` block

**Files:**
- Create: `src/lib/api/handler.ts`
- Create: `src/lib/api/__tests__/handler.test.ts`
- Modify: `src/locales/en.ts`, `src/locales/id.ts` (add `errors` block)

**Interfaces (Produces):**
- `type FieldErrors = Record<string,string[]>`; `type ErrorKey = keyof typeof en.errors`.
- `class ApiError extends Error` — `code:number`, `messageKey?:ErrorKey`, `override?:string`, `data:FieldErrors|null`.
- Helpers: `badRequest(m?)`, `unauthorized(m?)`, `forbidden(m?)`, `notFound(m?)`, `validationError(fields, m?)`.
- `withErrorEnvelope<C>(fn: (req: NextRequest, ctx?: C) => Promise<Response>|Response): (req: NextRequest, ctx?: C) => Promise<Response>`.

- [ ] **Step 1: Add the `errors` i18n block (en source, id mirror).** In `src/locales/en.ts` add after `common`: `errors: { badRequest: "Bad request", unauthorized: "You are not signed in", forbidden: "You don't have access", notFound: "Not found", validation: "Validation failed", internal: "Something went wrong. Please try again." }`. Mirror in `id.ts` with Indonesian strings (`"Permintaan tidak valid"`, `"Anda belum masuk"`, `"Anda tidak punya akses"`, `"Tidak ditemukan"`, `"Validasi gagal"`, `"Terjadi kesalahan. Coba lagi."`). Keep shapes identical (en is the type source).

- [ ] **Step 2: Write failing handler tests.** Create `src/lib/api/__tests__/handler.test.ts` (import `{ NextRequest }` from `next/server`, `{ z } from "zod"`, and `{ withErrorEnvelope, notFound, validationError, ApiError } from "@/lib/api/handler"`):

```ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorEnvelope, notFound } from "@/lib/api/handler";

const req = () => new NextRequest("http://localhost/api/x");

describe("withErrorEnvelope", () => {
  it("passes success through unchanged (not enveloped)", async () => {
    const h = withErrorEnvelope(async () => Response.json({ ok: true }));
    const res = await h(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
  it("maps ApiError notFound() to a 404 envelope", async () => {
    const h = withErrorEnvelope(async () => { throw notFound(); });
    const res = await h(req());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 404, status: "error", data: null });
  });
  it("maps ZodError to a 422 envelope with field errors under data", async () => {
    const schema = z.object({ nama: z.string().min(1) });
    const h = withErrorEnvelope(async () => { schema.parse({ nama: "" }); return Response.json({}); });
    const res = await h(req());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toMatchObject({ code: 422, status: "error" });
    expect(Array.isArray(body.data.nama)).toBe(true);
  });
  it("maps unknown errors to a 500 envelope without leaking details", async () => {
    const h = withErrorEnvelope(async () => { throw new Error("secret stack"); });
    const res = await h(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ code: 500, status: "error", data: null });
    expect(JSON.stringify(body)).not.toContain("secret stack");
  });
});
```

- [ ] **Step 3: Run to verify fail.** `npm test -- handler` → FAIL (module missing).

- [ ] **Step 4: Implement `handler.ts`** (per the spec's design — envelope `{code,status:"error",message,data}`; `ApiError`; helpers; `errorDict()` = `try { (await import("@/lib/get-dictionary")).getDictionary() then .errors } catch { en.errors }`; `withErrorEnvelope` awaits `fn`, catches `ZodError`→`envelope(422, dict.validation, z.flattenError(err).fieldErrors)`, `ApiError`→`envelope(err.code, err.override ?? (err.messageKey ? dict[err.messageKey] : err.message), err.data)`, else→`console.error(...)` + `envelope(500, dict.internal, null)`). **`RouteHandler<C>` handler type must have `ctx?: C` optional.** No `import "server-only"`; `import { en } from "@/locales/en"`.

- [ ] **Step 5: Run to verify pass.** `npm test -- handler` → PASS (4). Then `npx tsc --noEmit && npm run lint` clean.

- [ ] **Step 6: Commit.** `git add src/lib/api/handler.ts src/lib/api/__tests__/handler.test.ts src/locales/en.ts src/locales/id.ts && git commit -m "Tambah withErrorEnvelope + ApiError + i18n errors block"` (end body with the Co-Authored-By trailer).

---

### Task 2: Client contract migration (`errors` → `data`)

**Files:**
- Modify: `src/lib/crud/types.ts` (`ErrorEnvelope`), `src/lib/crud/errors.ts` (`normalizeError` 422 branch)
- Modify: `src/lib/crud/__tests__/errors.test.ts`, `src/lib/crud/__tests__/create-resource-api.test.ts`

**Interfaces:**
- `ErrorEnvelope = { code?: number; status?: string; message?: string; data?: Record<string,string[]> | null }`.
- `normalizeError` 422 reads `env.data` (produces `CrudError.fieldErrors`).

- [ ] **Step 1: Update `errors.test.ts` first (RED).** Change the 422 fixture from `{ ..., errors: {...} }` to `{ code:422, status:"error", message:"...", data: { nama: ["..."] } }` and assert `CrudError.fieldErrors` is populated from `data`. Run `npm test -- errors` → FAIL.

- [ ] **Step 2: Implement.** In `src/lib/crud/types.ts` change `ErrorEnvelope` to the shape above (`code?: number`, field errors under `data`). In `src/lib/crud/errors.ts` `normalizeError` 422 branch: `new CrudError(422, env.message || "Validasi gagal", env.data ?? undefined)`.

- [ ] **Step 3: Update `create-resource-api.test.ts`** any error fixtures to `{code,status,message,data}`. Run `npm test -- errors create-resource-api` → PASS. `npx tsc --noEmit && npm run lint` clean.

- [ ] **Step 4: Commit.** `git add src/lib/crud/types.ts src/lib/crud/errors.ts src/lib/crud/__tests__/errors.test.ts src/lib/crud/__tests__/create-resource-api.test.ts && git commit -m "Migrasi kontrak error client: field errors di data (bukan errors)"`.

---

### Task 3: OpenAPI `Error` schema + responses + regenerate types

**Files:**
- Modify: `openapi.yaml`
- Modify (generated): `src/lib/api/schema.d.ts` (via `npm run gen:api`)

- [ ] **Step 1: Add to `openapi.yaml`** under `components`: `schemas.Error` (`required: [code,status,message,data]`; `code:integer`, `status: {type:string, enum:[error]}`, `message:string`, `data: {type:[object,"null"], additionalProperties:{type:array, items:{type:string}}}`); `responses.NotFound` and `responses.ValidationError` (each `content: application/json: schema: $ref '#/components/schemas/Error'`). Then wire responses: items `POST` add `422:$ref ValidationError`; items `/{id}` `GET` add `404:$ref NotFound`, `PUT` add `404`+`422`; users `POST` change `400`→`422:$ref ValidationError`; users `/{id}` `DELETE` `404`→`$ref NotFound`; regions `POST` add `422`, regions `/{id}` `GET`/`PUT` add `404` (+`422` on PUT).

- [ ] **Step 2: Regenerate.** `npm run gen:api` → `src/lib/api/schema.d.ts` updates with `components.schemas.Error` + responses. Run `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit.** `git add openapi.yaml src/lib/api/schema.d.ts && git commit -m "OpenAPI: schema Error + response NotFound/ValidationError + regen tipe"`.

---

### Task 4: Wrap `items` routes

**Files:**
- Modify: `src/app/api/items/route.ts`, `items/[id]/route.ts`, `items/bulk-delete/route.ts`, `items/options/route.ts`
- Modify: `src/app/api/items/__tests__/items-route.test.ts` (ctx arg if needed)
- Create: `src/app/api/items/__tests__/items-error-envelope.test.ts`

**Interfaces:** Consumes `withErrorEnvelope`/`notFound` (Task 1), `itemSchema` (`@/config/resources/items`, exists).

- [ ] **Step 1: Write failing envelope test.** Create `items-error-envelope.test.ts`: import `{ GET as getOne } from "@/app/api/items/[id]/route"` and `{ POST as createItem } from "@/app/api/items/route"`; assert GET missing id → 404 `{code:404,status:"error",data:null}`; POST `{nama:""}` → 422 with `data.nama` array. Run → FAIL.

- [ ] **Step 2: Wrap the routes.** Convert each `export async function M(req, ctx){…}` to `export const M = withErrorEnvelope(async (req, ctx: RouteContext<"/api/items/[id]">) => {…})` (collection routes omit `ctx`). Replace `NextResponse.json({message:"Tidak ditemukan"},{status:404})` with `throw notFound()`. POST/PUT: `const body = itemSchema.parse(await req.json())`. bulk-delete: `const { ids } = z.object({ ids: z.array(z.string()).default([]) }).parse(await req.json())`. Success responses unchanged.

- [ ] **Step 3: Fix `items-route.test.ts` call sites** if the (now-wrapped) collection handlers require a second arg — the wrapper's `ctx?` optional (Task 1) should keep single-arg calls valid; if tsc still complains, pass `undefined` explicitly. Run `npm test -- items` + `npx tsc --noEmit` → PASS/clean.

- [ ] **Step 4: Commit.** `git add "src/app/api/items" && git commit -m "Bungkus route items dgn withErrorEnvelope + validasi Zod (422/404)"`.

---

### Task 5: Wrap `users` routes

**Files:** Modify `src/app/api/users/route.ts`, `users/[id]/route.ts`; add/adjust a users route test.

- [ ] **Step 1: Failing test.** Add a test asserting users `POST` invalid body → **422** envelope with `data`, and `DELETE` missing id → 404 envelope. Run → FAIL.

- [ ] **Step 2: Implement.** `users/route.ts` POST: replace the manual `typeof` 400 checks with `const body = z.object({ name: z.string().min(1), email: z.string().min(1), role: z.string().min(1) }).parse(await req.json())`; wrap in `withErrorEnvelope`. GET wrapped. `users/[id]/route.ts` DELETE: `if (!deleteUser(id)) throw notFound()`, wrapped with `RouteContext<"/api/users/[id]">`.

- [ ] **Step 3: Verify + commit.** `npm test -- users && npx tsc --noEmit && npm run lint` → clean. `git add "src/app/api/users" && git commit -m "Bungkus route users dgn envelope (POST invalid → 422, delete → 404)"`.

---

### Task 6: Wrap `regions` routes (new surface) + `regionSchema`

**Files:** Modify `src/app/api/regions/route.ts`, `regions/[id]/route.ts`, `regions/options/route.ts`; modify `src/config/resources/regions.ts` (export `regionSchema`); add a regions route/validation test.

- [ ] **Step 1: Add `regionSchema`.** In `src/config/resources/regions.ts` export `regionSchema` (mirror `itemSchema`; the region row shape is `{ name, parentId? }` — validate `name: z.string().min(1)` and any required fields). Ensure the resource still uses it as `form.schema`.

- [ ] **Step 2: Failing test.** Add a regions test: `POST /api/regions` with invalid body → 422 envelope `data`; `GET /api/regions/{id}` missing → 404 envelope. Run → FAIL.

- [ ] **Step 3: Wrap the routes.** Same pattern as items: `withErrorEnvelope`, `throw notFound()` on GET/PUT missing, `regionSchema.parse(...)` on POST/PUT, wrap options GET. Keep the `parent[parentId]` filter logic in options unchanged.

- [ ] **Step 4: Verify + commit.** `npm test -- regions && npx tsc --noEmit && npm run lint` → clean. `git add "src/app/api/regions" src/config/resources/regions.ts && git commit -m "Bungkus route regions dgn envelope + regionSchema (422/404)"`.

---

### Task 7: Full verification (regression)

- [ ] **Step 1: Regenerate + full sweep.** `npm run gen:api` (idempotent), then `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx playwright test`. All green; capture output.
- [ ] **Step 2: Confirm no stray `env.errors` readers.** `grep -rn "\.errors" src/lib/crud src/components | grep -vi fielderrors` → ensure nothing still reads the old key. Fix any.
- [ ] **Step 3: Manual (dev + Playwright/curl).** POST invalid items/regions/users → 422 with `data`; GET/DELETE missing id → 404 envelope; force a 500 → generic `internal` message, no stack leaked; e2e create/edit still surface field errors.
- [ ] **Step 4: Commit any verification fixes.** `git commit -m "Verifikasi menyeluruh error-envelope"` (if changes).

---

## Self-Review

**Spec coverage:** envelope + handler (Task 1); client `data` migration (Task 2); OpenAPI Error + responses + regen (Task 3); items/users/regions routes wrapped + validated (Tasks 4–6); `ctx?` optional fix (Task 1, applied in 4–6); regions new-surface coverage (Task 6); i18n `errors` mirrored (Task 1); verification incl. no-leak 500 + stray-`errors` grep (Task 7). ✓

**Placeholder scan:** Task 1 gives complete handler tests; Task 4/2 describe exact edits against current committed route/errors shapes (from exploration). handler.ts body is specified by the spec's design section (envelope/ApiError/errorDict/mapping) + reproduced in Task 1 Step 4 — implementer transcribes it. No TBD/TODO.

**Type consistency:** envelope `{code,status,message,data}`, `FieldErrors`, `ErrorEnvelope.data`, `ApiError`, `withErrorEnvelope` `ctx?` optional, `z.flattenError().fieldErrors`, `RouteContext<"/api/…/[id]">` — consistent across tasks and match the current committed route signatures.

## Base / concurrency notes
- Re-derive on **current `main`** (verify HEAD after the concurrency hold clears). Do NOT `git stash apply stash@{1}` (stale); use it only as a reference — the CLEAN files can be transcribed, `schema.d.ts` regenerated, `regions` extended.
- Unrelated: `stash@{0}` (plop/tsx devDeps) belongs to the committed generator feature (`fc0c4da`) whose `package.json` is MISSING plop/tsx — a separate defect to raise with the user, not part of this plan.
- My spec commit is `b26cb09` (currently on `feat/api-error-envelope` + `fix/e2e-crud-items-robustness`); reconcile branch placement once the repo is stable.
