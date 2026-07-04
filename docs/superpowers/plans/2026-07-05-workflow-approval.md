# Workflow/Approval (P3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship a generic, config-driven **status workflow** (declarative statuses + transitions) with a status badge column, permission-gated per-row transition actions, a status stepper + audit-trail timeline, and a transition API endpoint — demoed on `items` (`draft → submitted → approved/rejected`). Closes P3.

**Architecture:** A `workflow` slot on `ResourceDef` declares statuses + transitions. The generic table renders the status as a `<Badge>` and renders allowed transitions (per current status, `<Can>`-gated) as row actions calling a new `useTransition` hook → `POST /api/{res}/{id}/transition` (validated + audited via `withErrorEnvelope`). The edit page shows a stepper + audit timeline. v1: one-click actions, client-gated authz (real backend must enforce).

**Tech Stack:** Next.js 16 route handlers (`withErrorEnvelope`), React 19, TS, shadcn Base UI (`render={<C/>}`, not asChild), TanStack Query, Vitest, Playwright. Design source: `docs/superpowers/specs/2026-07-05-workflow-approval-design.md`.

## Global Constraints
- **Minimal declarative** — flow from `ResourceDef.workflow`; no state-machine engine. **One-click** actions (no reason dialog). **Client-gate** authz via `<Can>`; endpoint validates transition **legality** only + documents that real backends must enforce authz.
- Generic (`items`/`regions` demos; no domain terms). i18n via `useI18n()`+`resolveLabel`, new keys mirrored `src/locales/en.ts` (type source) + `id.ts`. Base UI composition. `@/` alias; Indonesian comments; two-space indent; no `any`. `npx tsc --noEmit`+`npm run lint` clean; tests verify real behavior; route handlers use `withErrorEnvelope`+`RouteContext<...>`+`await ctx.params`.
- Reuse: `@/lib/api/handler` (`withErrorEnvelope`,`ApiError`,`badRequest`,`notFound`); `create-resource-api.ts` `req`/`keys` (mirror `useUpdate`); `ui/badge.tsx`; `<Can>`/`useRbac`; `createCollectionStore`; sonner `toast`.

---

### Task 1: `workflow` types + Permission + i18n
**Files:** `src/lib/crud/define-resource.ts`; `src/config/rbac.ts`; `src/locales/en.ts`+`id.ts`; test `src/config/__tests__/rbac.test.ts` (if exists, else inline).
**Produces:** `WorkflowStatus`, `WorkflowTransition`, `WorkflowDef` types + `ResourceDef.workflow?: WorkflowDef` (shapes per spec). `Permission` union gains `"items:approve"`; `ROLE_PERMISSIONS` grants it to Admin (NOT Editor/Viewer). i18n `workflow` block: `status: { draft, submitted, approved, rejected }` + `action: { submit, approve, reject }` (en+id).
- [ ] Step 1: Add the three workflow types + `workflow?` slot to `ResourceDef` (no `any`).
- [ ] Step 2: Add `"items:approve"` to `Permission` union + `ROLE_PERMISSIONS` (Admin only). If a rbac test asserts the permission list, update it (RED→GREEN); else add a small test that `can("Admin","items:approve")` is true and `can("Editor","items:approve")` is false.
- [ ] Step 3: Add the `workflow` i18n block to `en.ts` + mirror `id.ts`.
- [ ] Step 4: `npx tsc --noEmit && npm run lint && npm test` clean. Commit `"Tambah tipe workflow + permission items:approve + i18n workflow"`.

### Task 2: Status badge column renderer
**Files:** `src/components/crud/resource-table.tsx`; test `src/components/crud/__tests__/resource-table.test.tsx`.
**Consumes:** `def.workflow.statuses` (Task 1), `ui/badge.tsx`.
- [ ] Step 1 (RED): add a test — a resource with `workflow` + a column `{field:"status", render:"badge"}` renders a `<Badge>` with the status's i18n label (not the raw value).
- [ ] Step 2: In the cell factory (currently `cell: info => String(getValue())`), switch on `c.render`: for `"badge"`, look up the value in `def.workflow?.statuses` → render `<Badge variant={status.variant ?? "secondary"}>{resolveLabel(t, status.labelKey)}</Badge>`; fallback to `String(value)` if no workflow/status match. Keep other renders as `String` for now (only `badge` needed).
- [ ] Step 3: GREEN; tsc/lint clean. Commit `"ResourceTable: render kolom badge dari workflow.statuses"`.

### Task 3: `useTransition` + `useAudit` hooks
**Files:** `src/lib/crud/create-resource-api.ts`; test `src/lib/crud/__tests__/create-resource-api.test.ts`.
**Produces:** `keys.audit(id)`; `auditQueryOptions(id)`/`useAudit(id)` (GET `${base}/${id}/audit` → `AuditRow[]`); `useTransition()` (mutate `{id, action}` → POST `${base}/${id}/transition` body `{action}`; onSuccess invalidate `keys.all`, `keys.one(id)`, `keys.audit(id)`). `type AuditRow = { id: string; entityId: string; action: string; from: string; to: string; actor: string; at: string; reason?: string | null }` (export it).
- [ ] Step 1 (RED): add a test (MSW) — `useTransition` POSTs to `/{base}/{id}/transition` with `{action}` and invalidates; `useAudit` GETs `/{base}/{id}/audit`. (Mirror existing hook tests.)
- [ ] Step 2: Implement both, mirroring `useUpdate`/`getOneQueryOptions`; add `AuditRow` type; add to the returned API object.
- [ ] Step 3: GREEN; tsc/lint. Commit `"Tambah useTransition + useAudit (create-resource-api)"`.

### Task 4: Transition + audit endpoints + audit store + items status
**Files:** `src/app/api/_store/audit-store.ts` (new); `src/app/api/items/[id]/transition/route.ts` (new); `src/app/api/items/[id]/audit/route.ts` (new); `src/app/api/items/_data.ts` (add `status` to `ItemRow` + seed); `src/config/resources/items.ts` (`itemSchema` add `status` optional); `openapi.yaml`+regen (add `status` to Item); tests.
**Consumes:** `withErrorEnvelope`/`badRequest`/`notFound`; `itemsStore`; `WorkflowDef` (transition validity from `itemsResource.workflow`).
- [ ] Step 1: `audit-store.ts` — `createAuditStore()` (append-only array): `append(row)`, `listFor(entityId)` newest-first. TDD it.
- [ ] Step 2: Extend `ItemRow` with `status: string`, seed existing rows `"draft"`; `itemSchema` add `status: z.string().optional()`; add `status` to `Item`/`NewItem` in `openapi.yaml`; `npm run gen:api`.
- [ ] Step 3 (RED): route test (import-and-invoke) — `POST /items/{id}/transition {action:"submit"}` on a draft item → 200, status now `"submitted"`, and audit has a row; illegal `{action:"approve"}` on a draft → 422/400 envelope; missing id → 404. `GET /items/{id}/audit` → the appended row.
- [ ] Step 4: Implement both routes (`withErrorEnvelope`): transition loads `itemsResource.workflow`, finds transition by `action` where `from` includes current status (else `throw badRequest(...)`), updates status, appends audit (`actor` from role cookie best-effort, else `"system"`); audit route returns `listFor(id)`.
- [ ] Step 5: `npm test`, `tsc`, `lint`, curl the endpoints via `npm run dev`. Commit `"Tambah endpoint transition+audit + status pada items"`.

### Task 5: Row transition actions
**Files:** `src/components/crud/resource-table.tsx`; test.
**Consumes:** `def.workflow.transitions`, `useTransition` (Task 3), `<Can>`, sonner.
- [ ] Step 1 (RED): test — for a row with status `submitted` and a role with `items:approve`, the actions cell shows Approve+Reject buttons; clicking Approve calls the transition endpoint (MSW) and toasts; a row with status `approved` shows no transition (none allowed from `approved`).
- [ ] Step 2: In the actions `<TableCell>`, compute `def.workflow?.transitions.filter(tr => tr.from.includes(row[def.workflow.field]))`; render each as a `<Can permission={tr.permission}>`-gated `<Button variant={tr.variant}>` (label `resolveLabel(t, tr.labelKey)`) → `useTransition().mutate({id, action: tr.action}, { onSuccess: toast.success, onError: toast.error })`. Keep the existing Edit link.
- [ ] Step 3: GREEN; tsc/lint. Commit `"ResourceTable: aksi transisi per-baris (gated <Can> + toast)"`.

### Task 6: Stepper + audit timeline + edit-page panel
**Files:** `src/components/crud/workflow-stepper.tsx` (new); `src/components/crud/audit-timeline.tsx` (new); `src/components/crud/resource-form.tsx` (edit-mode panel); tests.
**Consumes:** `def.workflow`, `useAudit` (Task 3), `resolveLabel`.
- [ ] Step 1 (RED): component tests — `WorkflowStepper` given `statuses` + `current` marks the current step active; `AuditTimeline` given rows renders one entry per row (action + from→to + actor).
- [ ] Step 2: Build `WorkflowStepper` (ordered `statuses`, current highlighted; Base UI/CVA + Badge; no external primitive) and `AuditTimeline` (dot-row markup like `dashboard/page.tsx` recent-activity; i18n action labels).
- [ ] Step 3: In `resource-form.tsx`, when `def.workflow` and editing (`id` present), render above the form: `<WorkflowStepper statuses={def.workflow.statuses} current={currentStatus}/>` + the allowed transition buttons (reuse Task 5's logic or a shared helper) + `<AuditTimeline rows={useAudit(id).data ?? []}/>`. (currentStatus from `useGetOne`.)
- [ ] Step 4: GREEN; tsc/lint/build. Commit `"Tambah WorkflowStepper + AuditTimeline + panel workflow di edit"`.

### Task 7: Wire items demo workflow + full verification
**Files:** `src/config/resources/items.ts` (add `workflow` + status column); verification.
- [ ] Step 1: Add to `itemsResource`: `workflow: { field:"status", initial:"draft", statuses:[draft(secondary),submitted(default),approved(default),rejected(destructive)], transitions:[submit(draft→submitted, items:update), approve(submitted→approved, items:approve), reject(submitted→rejected, items:approve)] }` (label keys → the Task 1 i18n block); add a `{field:"status", labelKey:"workflow.statusLabel", render:"badge"}` column. Ensure create stamps `initial` (via the workflow field default — reuse scoped-create-style default or set in the create path).
- [ ] Step 2: Full sweep — `npm run gen:api` (idempotent), `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx playwright test` (add/extend an e2e: create item → submit → approve, assert badge + timeline). All green.
- [ ] Step 3: Manual (dev): Editor role sees Submit (not Approve); Admin sees Approve/Reject on submitted; edit page shows stepper + timeline; illegal transition rejected. Commit `"Aktifkan workflow demo items (draft→submitted→approved/rejected) + verifikasi"`.

---

## Self-Review
**Spec coverage:** workflow types+perm+i18n (T1); badge column (T2); useTransition/useAudit (T3); endpoint+audit+status (T4); row actions (T5); stepper+timeline+panel (T6); demo+verify (T7). One-click + client-gate honored; server-authz note in T4/spec. ✓
**Placeholder scan:** each task has RED test + concrete edits against known files (from exploration); handler/hook patterns cite the mirror (`useUpdate`, bulk-delete route). No TBD. ✓
**Type consistency:** `WorkflowDef.field/initial/statuses/transitions`, `WorkflowTransition.{action,from,to,permission,labelKey}`, `AuditRow`, `keys.audit`, `useTransition({id,action})`, `render:"badge"` — consistent across T1–T7 and match current `ResourceDef`/`create-resource-api` shapes. `items:approve` added to the closed union in T1 before use in T5/T7. ✓
