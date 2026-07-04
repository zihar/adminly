# Design: Generic Approval/Workflow (P3, minimal declarative)

**Date:** 2026-07-05
**Status:** Approved (scope decisions confirmed with user)
**Scope:** Add a generic, config-driven **status workflow** to the adminly CRUD layer — a declarative per-resource flow (statuses + transitions), a status badge column, per-row transition actions (verify/approve/reject), a status **stepper** + **audit-trail timeline**, and a transition API endpoint. Closes blueprint pain-point **P3**. v1 is **minimal declarative** (linear-ish flow from a definition), NOT a general state-machine engine.

## Context

adminly is a fork-per-project CRUD starter. Fork Edelweiss needs approval flows (Cuti/Izin/Dinas/Modul Ajar) — all "submit → approve/reject" shaped. This ships that as a reusable primitive: a resource declares a `workflow`, and the layer renders the status, the allowed actions (permission-gated), a stepper, and an audit timeline — no bespoke code per module. The reserved `def.actions`/`def.components` slots are currently dead; this introduces a purpose-built `workflow` slot instead (the `actions` shape lacks status/permission metadata).

## Decisions (confirmed)

1. **Declarative `workflow` on `ResourceDef`** — statuses + transitions drive everything (badge, actions, stepper, endpoint validation).
2. **One-click actions** — approve/reject/submit fire immediately (+toast). No reason dialog in v1 (no Dialog component exists; audit `reason` field reserved but unused). 
3. **Client-gate authz** — transition buttons gated by `<Can permission>`; the transition endpoint validates transition **legality** (from→to) via `ApiError`. It does NOT enforce role server-side (consistent with all current route handlers, which have no server RBAC; the mock role is a demo cookie). **A real backend MUST enforce authorization** — documented prominently.
4. **Demo on `items`** — add a `status` field + a `draft → submitted → approved / rejected` flow. Generic; mirrors the fork's approval modules.
5. **Audit-trail** — an in-memory audit store records each transition (`entityId, action, from, to, actor, at`); a timeline UI lists it on the edit page.

## `ResourceDef.workflow` (new slot)

`src/lib/crud/define-resource.ts`:
```ts
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";
export type WorkflowStatus = { value: string; labelKey: string; variant?: BadgeVariant };
export type WorkflowTransition = {
  action: string;          // e.g. "approve" — also the endpoint action + i18n/audit key
  from: string[];          // statuses this action is allowed from
  to: string;              // resulting status
  permission: Permission;  // gates the button (client) — must exist in the union
  labelKey: string;        // i18n button label
  variant?: "default" | "outline" | "destructive";
};
export type WorkflowDef = {
  field: string;                    // status field name on the row (e.g. "status")
  initial: string;                  // status stamped on create
  statuses: WorkflowStatus[];       // ordered → drives the stepper + badge variant/label lookup
  transitions: WorkflowTransition[];
};
// ResourceDef.workflow?: WorkflowDef
```

## Units

| Unit | Responsibility |
|---|---|
| `define-resource.ts` | Add `WorkflowDef`/`WorkflowStatus`/`WorkflowTransition` types + `workflow?` on `ResourceDef`. |
| `src/config/rbac.ts` | Extend `Permission` union with workflow verbs (`items:approve`) + `ROLE_PERMISSIONS` (Admin: yes; Editor: submit-only). |
| `resource-table.tsx` | (a) Honor `ColumnDef.render === "badge"` → `<Badge variant>` with variant+label from `def.workflow.statuses`. (b) In the per-row actions cell, render transitions whose `from` includes the row's current status, each gated by `<Can permission>`, → `useTransition` + toast. |
| `create-resource-api.ts` | Add `useTransition({id, action})` (mirror `useUpdate`: POST `${base}/${id}/transition`, invalidate `keys.all`+`keys.one(id)`+audit key) and `useAudit(id)` / `auditQueryOptions(id)` (GET `${base}/${id}/audit`). |
| `src/components/crud/workflow-stepper.tsx` | New: ordered statuses, current highlighted (build on `Badge`/CVA + divs; no stepper primitive exists). |
| `src/components/crud/audit-timeline.tsx` | New: timeline list of audit rows (reuse dashboard recent-activity dot-row markup as visual base). |
| `resource-form.tsx` (edit mode) | When `def.workflow` present + editing: render a workflow panel above the form — `<WorkflowStepper>` + transition buttons + `<AuditTimeline>` (via `useAudit`). |
| `src/app/api/items/[id]/transition/route.ts` | New: `POST` — Zod-parse `{action}`, load row (`throw notFound()`), find transition by `action` where `from` includes current status (else `throw badRequest`/422 invalid-transition), `itemsStore.update(id,{status:to})`, append audit. Wrapped in `withErrorEnvelope`. |
| `src/app/api/items/[id]/audit/route.ts` | New: `GET` — return audit rows for the entity, newest first. |
| `src/app/api/_store/audit-store.ts` | New: generic append-only audit store (`{id, entityId, action, from, to, actor, at}`), or a `createCollectionStore<AuditRow>`. |
| `items` demo (`config/resources/items.ts`, `app/api/items/_data.ts`, `openapi.yaml`) | Add `status` to `ItemRow` (seed `"draft"`), `itemSchema` (optional/defaulted), a `status` column (`render:"badge"`), and the `workflow` config. Regen types. |
| `src/locales/en.ts` + `id.ts` | Add a `workflow` block (status labels + action labels) mirrored both locales. |

## Transition endpoint contract

`POST /api/items/{id}/transition` body `{ action: string }` → 200 updated item. Errors via envelope: 404 (missing), 422/400 (illegal transition from current status). On success, appends an audit row with `actor` = current role (from the demo role cookie, best-effort) + `at` timestamp. `GET /api/items/{id}/audit` → `AuditRow[]` newest-first.

## Reuse (don't rebuild)
`withErrorEnvelope`/`ApiError`/`badRequest`/`notFound` (`@/lib/api/handler`); `req`/`keys`/invalidation (`create-resource-api.ts`, mirror `useUpdate`); `<Badge>` + `statusVariant` pattern (`ui/badge.tsx`, `dashboard/users-table.tsx`); `<Can>`/`useRbac`/`can` + `Permission`; `useI18n`/`resolveLabel`/`format` + sonner `toast`; `createCollectionStore` + `_data` seed pattern; RSC prefetch/hydrate for the list.

## Out of scope (v1)
Reason dialog (needs a Dialog component); server-side RBAC in handlers (fork's job — noted); branching/parallel/multi-approver flows; notifications; workflow on resources other than the `items` demo.

## Verification
- Unit (Vitest): `useTransition`/audit store/transition route (legal transition updates status + writes audit; illegal → 422/400; missing → 404); badge cell renderer; workflow-stepper + audit-timeline components.
- `npm run gen:api` (items status), `tsc`/`lint`/`build` clean; `npx playwright test` (drive submit→approve on items, assert badge + timeline).
- Manual: list shows status badge + allowed action buttons per role (Editor sees submit, not approve); edit page shows stepper + audit timeline; illegal transition rejected.
