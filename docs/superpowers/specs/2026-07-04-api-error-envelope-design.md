# Design: API Error Envelope (Route Handler error standardization)

**Date:** 2026-07-04
**Status:** Draft — menunggu review user
**Source:** Re-derivation of an uncommitted refactor saved in `stash@{1}` ("withErrorEnvelope refactor"), created by a parallel session at commit `4812fdf`. That stash is **stale** relative to current `main` (which since gained `regions` routes, `items` cascade fields, and a generator/storybook/e2e merge). This spec captures the design and a **clean re-derivation on today's main**, not a blind `git stash apply`.

## Context

Every mock Route Handler under `src/app/api/**` today returns errors ad-hoc: `NextResponse.json({ message }, { status })` with inconsistent statuses (users invalid input → **400** hand-rolled; not-found → 404; no validation elsewhere; POST routes blindly spread the request body). The client CRUD layer (`normalizeError` in `src/lib/crud/errors.ts`) already expects a structured error body, but nothing on the server guarantees one. This feature standardizes **error responses** into a single envelope, driven by a `withErrorEnvelope` wrapper + throw-based `ApiError` control flow, with i18n-resolved messages. **Success responses stay untouched** (raw `{data,meta}` / raw object per `openapi.yaml`).

Goal: one consistent, typed, i18n error contract across all routes; validation via the existing resource Zod schemas (→ 422 with field errors); no server internals leaked on 500. This also closes the CRUD-layer ledger item "no body-validation on items POST/PUT — raise at final review."

## Decisions

1. **Error-only envelope** — only error responses are wrapped; success payloads are unchanged (lower churn, keeps the paginated `{data,meta}` contract).
2. **Envelope shape:** `{ code: number, status: "error", message: string, data: Record<string,string[]> | null }` — `code`=HTTP status; `message`=display-ready (i18n); `data`=field errors on 422, else `null`.
3. **Field errors live under `data`** (not `errors`). This migrates the client contract: `ErrorEnvelope` + `normalizeError` (422 branch) read `data`. Keep `errors.ts`, `types.ts`, and the OpenAPI `Error.data` schema consistent.
4. **Throw-based control flow** — handlers `throw notFound()` / rely on `schema.parse()` throwing `ZodError`; the wrapper maps thrown errors to the envelope. No manual 4xx returns.
5. **Validation via existing resource Zod schemas** — `itemSchema` (exists), add `regionSchema`, a `newUserSchema`, and a `bulkDeleteSchema`. Invalid input → **422** (users POST changes 400→422).
6. **i18n error messages** — a new `errors` dictionary block (`badRequest/unauthorized/forbidden/notFound/validation/internal`), resolved at request time via a dynamic `getDictionary()` import with English fallback (so `handler.ts` stays unit-testable without `server-only`).
7. **Extend to `regions`** — the stash predates the `regions` routes; a complete feature must wrap them too.
8. **Fix the wrapper's context typing** — `RouteHandler`'s `ctx` must be **optional** so context-less routes (items/users collection GET/POST) remain callable with one arg (this is the cause of the stash's 3 tsc errors).

## Envelope + `src/lib/api/handler.ts` (new module)

```
{ code, status: "error", message, data }   // error responses only
```

- `type FieldErrors = Record<string, string[]>`; `type ErrorKey = keyof typeof en.errors`.
- `class ApiError extends Error` — `code`, `messageKey?: ErrorKey`, `override?: string`, `data: FieldErrors | null`.
- Helpers: `badRequest`, `unauthorized`, `forbidden`, `notFound`, `validationError(fields, message?)` (422). (500 only from the catch-all.)
- `errorDict()` — `try { (await import("@/lib/get-dictionary")).getDictionary() → .errors } catch { en.errors }`.
- `withErrorEnvelope<C>(fn: (req: NextRequest, ctx?: C) => Promise<Response> | Response): (req, ctx?) => …` — awaits `fn`; on throw:
  - `ZodError` → 422, `data = z.flattenError(err).fieldErrors`, message `dict.validation`.
  - `ApiError` → `err.code`, message `err.override ?? (err.messageKey ? dict[err.messageKey] : err.message)`, `data = err.data`.
  - else → `console.error(...)` + 500 `dict.internal`, `data: null` (never leak internals).
- **NOT** `import "server-only"` (keeps it Vitest-testable); `import { en } from "@/locales/en"` for the fallback + key typing.

## Files

**New:**
- `src/lib/api/handler.ts` — the wrapper + `ApiError` + helpers + `errorDict`.
- `src/config/resources/regions.ts` — add an exported `regionSchema` (mirror `itemSchema`) for POST/PUT validation. (New; regions currently has no schema.)
- Tests: `src/app/api/items/__tests__/items-error-envelope.test.ts` (404 + 422 envelope), plus a `regions` route/validation test in the same import-and-invoke pattern.

**Apply cleanly (unchanged on main since stash base — low risk):**
- Wrap + validate: `src/app/api/items/route.ts`, `items/[id]/route.ts`, `items/bulk-delete/route.ts`, `items/options/route.ts`, `users/route.ts`, `users/[id]/route.ts` (per the stash's pattern: `export const M = withErrorEnvelope(async (req, ctx) => {…})`, `throw notFound()`, `schema.parse(...)`).
- `src/lib/crud/types.ts` — `ErrorEnvelope = { code?: number; status?: string; message?: string; data?: Record<string,string[]> | null }`.
- `src/lib/crud/errors.ts` — `normalizeError` 422 branch reads `env.data` (was `env.errors`).
- Update client tests `src/lib/crud/__tests__/errors.test.ts` + `create-resource-api.test.ts` to the `{code,status,message,data}` shape.

**Hand-merge (both main & stash changed these — merge, don't overwrite):**
- `src/locales/en.ts` + `id.ts` — add the `errors` block (6 keys) after `common`. Keep the existing `common`/`scope`/`regions`/`items` blocks intact; en stays the type source, id mirrors.
- `openapi.yaml` — add `components.schemas.Error` + `components.responses.{NotFound,ValidationError}`; add 404/422 responses to item **and** users **and** regions paths.
- `src/lib/api/schema.d.ts` — **regenerate** via `npm run gen:api` from the merged `openapi.yaml` (do not hand-merge the generated file).

**New surface to cover (stash predates it):**
- `src/app/api/regions/route.ts` (POST `regionSchema.parse`), `regions/[id]/route.ts` (`throw notFound()` + PUT validate), `regions/options/route.ts` (wrap) + the regions paths' 404/422 in `openapi.yaml`.

## Client contract migration (breaking, internal)

The 422 field-error key moves `errors` → `data`. Everything must agree: `withErrorEnvelope` emits field errors under `data`; `ErrorEnvelope.data`; `normalizeError` reads `data`; OpenAPI `Error.data`; and `ResourceForm`'s 422→`setError` path (which consumes `CrudError.fieldErrors`, already populated by `normalizeError`) keeps working unchanged. Verify no other reader references `env.errors`.

## Verification (end-to-end)

1. `npm run gen:api` regenerates `schema.d.ts` cleanly from merged `openapi.yaml`.
2. Unit (Vitest, import-and-invoke pattern like `items-route.test.ts`): wrapped route returns envelope on 404 (`{code:404,status:"error",data:null}`) and 422 (`data.<field>` is a string[]); success responses are NOT enveloped. `handler.ts` maps ZodError/ApiError/unknown correctly (test `handler.ts` directly with a throwing fn). `normalizeError` reads `data`.
3. `npx tsc --noEmit` clean (confirms the `ctx?` optional fix — no "Expected 2 arguments" errors), `npm run lint` clean, `npm run build` succeeds, `npx playwright test` green (e2e create/edit still surface field errors via the new envelope).
4. Manual: POST invalid `items`/`regions`/`users` → 422 with `data`; GET/DELETE missing id → 404 envelope; force a 500 → generic `internal` message, no stack leaked.

## Notes / risks

- **Stale stash:** `stash@{1}` is a reference, not a drop-in. Re-derive on current `main` (`HEAD` has advanced to a generator/storybook/e2e merge `6fe9a01` beyond the pushed `d4c595d`). Expect textual conflicts in `locales`/`openapi.yaml` if applied; the CLEAN files can be taken as-is, `schema.d.ts` regenerated.
- **`stash@{0}`** (plop/tsx devDeps) is likely now redundant if the generator merge already committed them — verify and drop if so; unrelated to this feature.
- Next.js 16: routes use `RouteContext<"/api/…/[id]">` + `await ctx.params`; `handler.ts`/routes are Node-runtime.
- Keep generic (no domain terms); i18n keys mirrored en/id; no `any`; `@/` alias; Indonesian comments; two-space indent.
