# Reject-Reason Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Transisi workflow yang ditandai `requiresReason` (mis. `reject`) membuka **dialog alasan** (bukan satu-klik); alasan **wajib** (Konfirmasi nonaktif sampai diisi + server tolak 400 bila kosong), tersimpan di audit, dan tampil di timeline. Menambah primitive **Dialog** yang sebelumnya belum ada.

**Architecture:** `WorkflowTransition` dapat flag `requiresReason?: boolean`. Sebuah komponen bersama `WorkflowTransitionButton` (gated `<Can>`) menggantikan logika mutate+toast yang kini terduplikasi di baris tabel (`resource-table.tsx`) dan panel edit (`resource-form.tsx`): bila `tr.requiresReason` → buka `<Dialog>` dg `<textarea>` alasan (wajib), Konfirmasi memanggil `useTransition().mutate({id, action, reason})`; selain itu tetap satu-klik. Route transition menerima `reason?`, memvalidasi wajib-alasan, dan menyimpannya ke baris audit (`AuditRow.reason` sudah ada). `AuditTimeline` menampilkan alasan.

**Tech Stack:** React 19, shadcn Base UI (`@base-ui/react/dialog` — sama seperti `sheet.tsx`), TanStack Query, Next.js 16 route handler (`withErrorEnvelope`, `z`), Vitest + @testing-library/react + MSW, Playwright.

## Context / Decisions
- **Alasan wajib** (keputusan user): tombol Konfirmasi `disabled` sampai `reason.trim()` tak kosong; route lempar `badRequest` bila `requiresReason` tapi alasan kosong.
- **Generik:** `requiresReason` flag berlaku transisi apa pun; demo `items` menandai `reject`. Approve/submit tetap satu-klik.
- **DRY:** ekstrak `WorkflowTransitionButton` dipakai kedua call-site (tabel + panel edit) yang sekarang menduplikasi `transition.mutate(... onSuccess/onError toast ...)`.
- **Dialog primitive** dimodelkan dari `src/components/ui/sheet.tsx` (primitive Base UI Dialog yang sama) tapi varian **modal tengah** (bukan sisi).
- Generic; i18n mirror en/id; Base UI `render={<C/>}`; no `any`; `@/` alias; komentar Indonesia; dua spasi.

## Global Constraints
- Reuse: `@base-ui/react/dialog` (pola `sheet.tsx`), `Button`/`Input`/`cn`, `useTransition`/`req`/`keys` (`create-resource-api.ts`), `<Can>`, `resolveLabel`/`useI18n`, sonner `toast`, `withErrorEnvelope`/`badRequest`/`notFound`, `auditStore`, `AuditRow.reason`. `npx tsc --noEmit`+`npm run lint` bersih; test verifikasi perilaku nyata (dialog buka/tutup, request bawa `reason`, route tolak kosong, timeline tampil alasan). Route pola `withErrorEnvelope`+`RouteContext<...>`.
- Rules-of-hooks: `WorkflowTransitionButton` komponen module-level; hook (`useTransition` sudah dipanggil di parent, dialog `useState` di komponen) stabil.

---

### Task 1: Primitive `Dialog` + tipe `requiresReason` + i18n
**Files:** `src/components/ui/dialog.tsx` (baru); `src/lib/crud/define-resource.ts`; `src/locales/en.ts`+`id.ts`; test `src/components/ui/__tests__/dialog.test.tsx` (baru).
**Produces:** `Dialog, DialogTrigger, DialogClose, DialogPortal, DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription` (modal tengah). `WorkflowTransition.requiresReason?: boolean`. i18n: `workflow.reasonLabel`, `workflow.reasonPlaceholder`, `workflow.reasonRequired`, `common.confirm`.
- [ ] Step 1 (RED): test `dialog.test.tsx` — render `<Dialog><DialogTrigger>Open</DialogTrigger><DialogContent><DialogTitle>Judul</DialogTitle></DialogContent></Dialog>`; klik trigger → judul tampil; `DialogClose`/Esc → tertutup. (Pakai `@testing-library/user-event`.)
- [ ] Step 2: implement `dialog.tsx` (`"use client"`, `import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"`), model dari `sheet.tsx` TAPI `DialogContent` posisi tengah:
  - `DialogOverlay`: `fixed inset-0 z-50 bg-black/50 transition-opacity ... data-ending-style:opacity-0 data-starting-style:opacity-0`.
  - `DialogContent` (`DialogPrimitive.Popup`): `fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-popover p-6 shadow-lg ... data-ending-style:opacity-0 data-starting-style:opacity-0` + tombol Close (opsi `showCloseButton`) seperti sheet.
  - `DialogHeader`/`DialogFooter`/`DialogTitle`/`DialogDescription` seperti sheet (footer: `flex justify-end gap-2`).
  - Tambah `requiresReason?: boolean;` ke `WorkflowTransition` di `define-resource.ts` (setelah `variant?`).
  - i18n en: `workflow.reasonLabel:"Reason"`, `reasonPlaceholder:"Enter a reason…"`, `reasonRequired:"Reason is required"`, `common.confirm:"Confirm"`; id: "Alasan"/"Masukkan alasan…"/"Alasan wajib diisi"/"Konfirmasi". Mirror kedua file.
- [ ] Step 3: `npm test -- dialog`, `npx tsc --noEmit && npm run lint`. Commit `"Tambah primitive Dialog + WorkflowTransition.requiresReason + i18n alasan"`.

### Task 2: Backend — reason di useTransition, route, audit + tampil di timeline
**Files:** `src/lib/crud/create-resource-api.ts` (`useTransition`); `src/app/api/items/[id]/transition/route.ts`; `src/components/crud/audit-timeline.tsx`; tests (`create-resource-api.test.ts`, `items` transition route test, `audit-timeline.test.tsx` bila ada).
**Consumes:** `AuditRow.reason`, `itemsResource.workflow` (utk `requiresReason`).
**Produces:** `useTransition().mutate({ id, action, reason? })` → body `{ action, reason }`. Route: `bodySchema` `+ reason: z.string().optional()`; bila transition `requiresReason` & `!reason?.trim()` → `badRequest`; `auditStore.append({... reason: reason ?? null})`. `AuditTimeline` render alasan bila ada.
- [ ] Step 1 (RED):
  - `create-resource-api.test.ts`: `useTransition().mutate({id, action:"reject", reason:"alasan x"})` → MSW menerima body `{action:"reject", reason:"alasan x"}`.
  - transition route test: `POST /items/{id}/transition {action:"reject"}` (tanpa reason) pada status yang mengizinkan reject **dan** transisinya `requiresReason` → 400/envelope; dengan `{action:"reject", reason:"tak layak"}` → 200, `auditStore.listFor(id)[0].reason === "tak layak"`. (Transisi non-requiresReason tanpa reason tetap 200.)
  - `audit-timeline`: baris dg `reason:"tak layak"` → teks alasan tampil.
- [ ] Step 2: implement —
  - `useTransition`: ubah tipe mutate jadi `{ id: ID; action: string; reason?: string }`; body `{ action, reason }` (reason boleh undefined — JSON drop).
  - route: `bodySchema = z.object({ action: z.string(), reason: z.string().optional() })`; setelah menemukan `transition`, `if (transition.requiresReason && !bodyReason?.trim()) throw badRequest(...)`; `auditStore.append({ ..., reason: bodyReason ?? null })`.
  - `AuditTimeline`: setelah baris `from → to · actor · waktu`, bila `row.reason` → tampilkan (mis. baris kedua `“{row.reason}”` dg kelas `text-muted-foreground`).
- [ ] Step 3: `npm test -- create-resource-api items audit-timeline`, `npx tsc --noEmit && npm run lint`. Commit `"Transition: dukung reason (hook+route+validasi wajib) + tampil di AuditTimeline"`.

### Task 3: `WorkflowTransitionButton` bersama + wire ke tabel & panel edit
**Files:** `src/components/crud/workflow-transition-button.tsx` (baru); `src/components/crud/resource-table.tsx` (ganti aksi transisi baris); `src/components/crud/resource-form.tsx` (ganti tombol transisi panel); test `workflow-transition-button.test.tsx` (baru) + sesuaikan test tabel/form bila perlu.
**Consumes:** `Dialog*` (Task 1), `useTransition` (Task 2), `<Can>`, `resolveLabel`, sonner.
**Produces:** `WorkflowTransitionButton({ transition, id, mutation, }: { transition: WorkflowTransition; id: ID; mutation: ReturnType<...useTransition> })` — gated di luar oleh `<Can>` (pertahankan pola pemanggil) ATAU bungkus `<Can>` di dalam (pilih satu, konsisten). Bila `transition.requiresReason`: render `<Dialog>` (trigger = tombol) dg `<textarea>` alasan (state lokal), Konfirmasi `disabled` sampai `reason.trim()` ada → `mutation.mutate({id, action, reason}, {onSuccess: toast+close, onError: toast})`. Selain itu: tombol satu-klik `mutation.mutate({id, action}, {...})`.
- [ ] Step 1 (RED): `workflow-transition-button.test.tsx` —
  - transisi `requiresReason:true`: klik tombol → dialog muncul; Konfirmasi disabled; ketik alasan → enabled; klik Konfirmasi → `mutation.mutate` dipanggil dg `{id, action, reason:"..."}` (mock mutation) + dialog tertutup.
  - transisi tanpa `requiresReason`: klik tombol → `mutation.mutate` dipanggil dg `{id, action}` langsung (tanpa dialog).
- [ ] Step 2: implement komponen; ganti blok aksi transisi baris di `resource-table.tsx` (~L536-554) dan tombol transisi panel di `resource-form.tsx` (~L96-118) memakai `<Can permission={tr.permission}><WorkflowTransitionButton .../></Can>` (samakan gating). Hilangkan duplikasi mutate+toast.
- [ ] Step 3: `npm test -- workflow-transition-button resource-table resource-form`, `npx tsc --noEmit && npm run lint`. Commit `"WorkflowTransitionButton: dialog alasan wajib + DRY aksi transisi (tabel+panel)"`.

### Task 4: Demo items reject + verifikasi + e2e
**Files:** `src/config/resources/items.ts` (`reject` transition `requiresReason:true`); verifikasi; e2e.
- [ ] Step 1: pada `itemsResource.workflow.transitions`, set `requiresReason: true` pada transisi `reject`. (Approve/submit tetap satu-klik.)
- [ ] Step 2: sweep — `npm run gen:api` (idempoten), `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx playwright test --workers=1`. Semua hijau. (Port 3000 dipakai proses lain di sandbox = kuirk lingkungan; jangan commit perubahan `playwright.config.ts`.)
- [ ] Step 3: e2e — buat/edit item ke status `submitted` (atau seed satu), sebagai Admin klik Reject → dialog muncul, Konfirmasi disabled saat kosong, isi alasan → Konfirmasi → status jadi `rejected` (badge) & alasan tampil di timeline panel edit. Selektor robust. Commit `"Demo items: reject wajib alasan + verifikasi e2e"`.

---

## Self-Review
**Coverage:** Dialog primitive + `requiresReason` + i18n (T1); reason di hook/route/audit/timeline + validasi wajib (T2); `WorkflowTransitionButton` bersama + wire dua call-site (T3); demo+verify+e2e (T4). Alasan wajib (client disable + server 400). ✓
**Placeholder scan:** tiap task RED test + kode konkret vs file nyata (route/hook/panel baris dikutip); Dialog dimodelkan dari `sheet.tsx`. No TBD. ✓
**Type consistency:** `WorkflowTransition.requiresReason?: boolean`, `mutate({id,action,reason?})`, `bodySchema{action,reason?}`, `AuditRow.reason` (sudah ada), `common.confirm`+`workflow.reason*` mirror en/id. ✓
**Deferrals (documented):** server-side RBAC tetap client-gate (fork; lihat memory rbac-enforcement-in-fork); approve/submit tanpa catatan opsional (hanya reject wajib alasan di demo); dialog konfirmasi hapus/destruktif lain = follow-up.
