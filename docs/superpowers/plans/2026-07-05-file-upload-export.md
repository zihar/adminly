# File Upload + Export (CSV/PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Real file-upload flow (dropzone → mock upload endpoint → stored URL) and data **export to CSV + PDF** (all matching rows) on the generic CRUD layer. Closes the last of the 4 Edelweiss primitives.

**Architecture:** A generic mock upload backend (`POST /api/uploads` formData → in-memory store → `{id,url}`; `GET /api/uploads/[id]` serves the bytes). `FileField` becomes a dropzone that uploads the file and stores the returned URL (replacing the data-URL stub). Export is client-side: fetch the full matching set via the resource list API (large perPage, honoring current q/sort/filter/scope), then generate CSV (hand-rolled) or PDF (`jspdf` + `jspdf-autotable`) and trigger a browser download, via an "Export" control in the `ResourceTable` toolbar.

**Tech Stack:** Next.js 16 route handlers (`withErrorEnvelope`, `req.formData()`), React 19 + RHF, TanStack Query, shadcn Base UI, Vitest + @testing-library/react, Playwright. New deps: `jspdf`, `jspdf-autotable` (PDF). CSV hand-rolled (no dep).

## Context / Decisions (confirmed)
- **Upload = real flow on mock backend**: dropzone POSTs to `/api/uploads`; server (mock, in-memory) returns `{id, url:"/api/uploads/{id}", name}`; `FileField` stores the **URL** (not data-URL) + preview; `GET /api/uploads/[id]` serves it. Swappable for real storage. (Real cloud storage/auth = fork's job — documented.)
- **Export = all matching rows**: fetch the full set via `def.api.listQueryOptions({...currentParams, perPage: LARGE})` (honors q/sort/filter/scope), generate client-side. CSV hand-rolled (escaping); PDF via `jspdf`+`jspdf-autotable`. Columns from `def.columns` (header via `resolveLabel`, raw value).
- Generic; i18n mirrored en/id; Base UI; no `any`; `@/` alias; Indonesian comments; two-space indent.

## Global Constraints
- Reuse `@/lib/api/handler` (`withErrorEnvelope`,`ApiError`,`badRequest`), `createCollectionStore`/`_data` mock pattern, `resolveLabel`/`useI18n`, sonner `toast`, `<Button>`/`<DropdownMenu>`. `npx tsc --noEmit`+`npm run lint` clean; tests verify real behavior; route handlers `withErrorEnvelope`+`RouteContext<...>`.
- Upload endpoint is client-only-invoked → `FileField`/`uploadFile` may use relative `fetch("/api/uploads")` (browser sets multipart boundary). Best-effort `Authorization` via `getAuthToken()` (real backend enforces).

---

### Task 1: Upload backend + `uploadFile` helper
**Files:** `src/app/api/_store/upload-store.ts`, `src/app/api/uploads/route.ts`, `src/app/api/uploads/[id]/route.ts` (new); `src/lib/api/upload.ts` (new); tests.
**Produces:** `createUploadStore()` (`save({name,type,base64})→{id}`, `get(id)→record|null`) + a shared `uploadStore`; `POST /api/uploads` (formData `file` → store → `{id,url:"/api/uploads/{id}",name}` 201; missing file → `badRequest`); `GET /api/uploads/{id}` (serves bytes with `content-type`, `notFound` if absent); `uploadFile(file: File): Promise<{id:string;url:string;name:string}>` (POST FormData to `/api/uploads`; adds `Authorization: Bearer` from `getAuthToken()` if present; throws on !ok).
- [ ] Step 1: `upload-store.ts` — in-memory Map keyed by id (`u_${Date.now()}_${n}`), stores `{name,type,base64}`; `save`→id, `get`→record. TDD (save/get roundtrip).
- [ ] Step 2 (RED): route test (import-and-invoke) — `POST /api/uploads` with a `FormData` carrying a `File` → 200/201, body `{id, url, name}` and `uploadStore.get(id)` exists; POST without file → `badRequest` envelope; `GET /api/uploads/{id}` → the bytes + correct content-type; missing → 404 envelope.
- [ ] Step 3: implement both routes (`withErrorEnvelope`; POST: `const form = await req.formData(); const file = form.get("file"); if(!(file instanceof File)) throw badRequest(...); const base64 = Buffer.from(await file.arrayBuffer()).toString("base64"); const {id}=uploadStore.save({name:file.name,type:file.type,base64}); return NextResponse.json({id,url:\`/api/uploads/${id}\`,name:file.name},{status:201})`. GET `[id]`: `const rec = uploadStore.get(id); if(!rec) throw notFound(); return new NextResponse(Buffer.from(rec.base64,"base64"), {headers:{"content-type":rec.type||"application/octet-stream"}})`.
- [ ] Step 4: `upload.ts` — `uploadFile`. Test its request shape (mock fetch). GREEN; tsc/lint. Commit `"Tambah backend upload mock (/api/uploads) + helper uploadFile"`.

### Task 2: `FileField` dropzone (real upload)
**Files:** `src/components/crud/fields/file-field.tsx` (rewrite); `fields/__tests__/file-field.test.tsx` (update); i18n en/id.
**Consumes:** `uploadFile` (Task 1), `useFormContext` (`setValue`), sonner `toast`, `meta.accept`.
**Behavior:** a dropzone (drag-drop + click-to-select) with `id={name}`; on file chosen → `uploadFile(file)` (pending state), on success `setValue(name, url, {shouldDirty:true})` + preview (image `<img>` if the url/type is an image, else filename + link), on error `toast.error`. Empty/replace supported. Add i18n `field.dropzone`/`field.uploading`/`field.uploadFailed` (or reuse `common.*`) mirrored en/id.
- [ ] Step 1 (RED): update test — simulate selecting a `File`; mock `uploadFile` to resolve `{url:"/api/uploads/x"}`; assert `uploadFile` called and RHF value becomes the returned URL (not a data-URL); a pending indicator shows during upload; preview shows after. Keep it behavior-focused.
- [ ] Step 2: implement the dropzone (native drag events on a div + a hidden `<input type="file" accept={meta.accept}>`; no external lib). Store URL via `setValue`. Indonesian comment: real cloud storage/auth = fork's job.
- [ ] Step 3: GREEN; tsc/lint. Commit `"FileField: dropzone + upload nyata (simpan URL) + preview"`.

### Task 3: Export utilities (CSV hand-rolled + PDF) + deps
**Files:** `src/lib/crud/export.ts` (new); test `src/lib/crud/__tests__/export.test.ts`; `package.json` (add `jspdf`,`jspdf-autotable`).
**Produces:** `type ExportColumn = { header: string; field: string }`; `toCsv(columns: ExportColumn[], rows: Record<string,unknown>[]): string` (RFC-ish: quote fields containing `,`/`"`/newline, escape `"`→`""`, header row first); `downloadBlob(filename: string, mime: string, content: BlobPart): void` (Blob + anchor click; guard non-browser); `exportPdf(columns, rows, title, filename)` (jspdf + autotable table → `doc.save(filename)`).
- [ ] Step 1: `npm i jspdf jspdf-autotable`.
- [ ] Step 2 (RED): unit-test `toCsv` — header + rows; a value with a comma/quote/newline is quoted+escaped; missing field → empty cell. (Pure function — fully testable.)
- [ ] Step 3: implement `toCsv` + `downloadBlob` + `exportPdf`. `exportPdf` maps columns→autotable `head`/`body`; keep it typed (import types from jspdf-autotable). PDF is browser-oriented — unit-test only `toCsv`; note `exportPdf`/`downloadBlob` are exercised via the toolbar (Task 4) + manual.
- [ ] Step 4: GREEN; tsc/lint. Commit `"Tambah util export CSV (hand-rolled) + PDF (jspdf) + downloadBlob"`.

### Task 4: Export control in ResourceTable
**Files:** `src/components/crud/resource-table.tsx`; test; i18n en/id.
**Consumes:** `toCsv`/`downloadBlob`/`exportPdf` (Task 3), `useQueryClient` + `def.api.listQueryOptions`, `def.columns`, `resolveLabel`.
**Behavior:** an "Export" `DropdownMenu` (items: CSV, PDF) in the toolbar (near Create). On select: build current params (`{q, sort, order, filters, scope}` as already computed for `useList`) with `perPage: 10000, page: 1`; `const { rows } = await qc.fetchQuery(def.api.listQueryOptions(exportParams))`; map to `ExportColumn[]` from `def.columns` (`header: resolveLabel(t, c.labelKey)`, `field: c.field`); CSV → `downloadBlob(\`${def.name}.csv\`, "text/csv", toCsv(cols, rows))`; PDF → `exportPdf(cols, rows, def.name, \`${def.name}.pdf\`)`. Toast on error. i18n `common.export`/`common.exportCsv`/`common.exportPdf` mirrored en/id.
- [ ] Step 1 (RED): test — click Export → CSV: MSW serves the list; assert `downloadBlob` (spy) called with CSV containing the column headers + a row value. (Mock `exportPdf`/`downloadBlob` via `vi.mock` of `@/lib/crud/export`, or spy.) Use the existing table harness.
- [ ] Step 2: implement the Export dropdown + handlers (`useQueryClient` at top level). Reuse the params object already assembled for `useList` (extract a shared `listParams` const if needed so export matches the visible filter/sort/scope).
- [ ] Step 3: GREEN; tsc/lint. Commit `"ResourceTable: tombol Export CSV/PDF (semua baris, hormati filter/scope)"`.

### Task 5: Demo wiring + full verification
**Files:** `src/config/resources/items.ts` (+ `_data.ts`/`openapi.yaml`) — add a `file` field to demo upload; verification.
- [ ] Step 1: Add a `lampiran` (attachment) `type:"file"` field to the `items` form (`itemSchema` `lampiran: z.string().optional()` = the stored URL; `ItemRow`/openapi `Item` optional `lampiran`; form layout + i18n label). `npm run gen:api`. (Export needs no demo config — it uses `def.columns`.)
- [ ] Step 2: Full sweep — `npm run gen:api` (idempotent), `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx playwright test --workers=1`. All green.
- [ ] Step 3: Add/extend e2e: on `/items`, click Export → CSV and assert a download is triggered (Playwright `page.waitForEvent("download")`), OR at minimum that the Export menu opens and the handler runs without error. (Upload e2e via a real file input is optional — note if skipped; the dropzone is unit-tested.)
- [ ] Step 4: Manual (dev): items create form shows the dropzone; dropping a file uploads + previews; list Export CSV/PDF downloads the full set. Commit `"Demo items lampiran (upload) + verifikasi export/upload"`.

---

## Self-Review
**Coverage:** upload backend+helper (T1); dropzone FileField storing URL (T2); CSV+PDF+download utils+deps (T3); Export toolbar all-rows honoring filter/scope (T4); demo+verify+e2e (T5). Confirmed decisions: real mock-upload flow + export all rows. ✓
**Placeholder scan:** each task RED test + concrete code/paths against known files; PDF unit-test limitation noted (browser-oriented). No TBD. ✓
**Type consistency:** `uploadFile→{id,url,name}` consumed by `FileField`; `ExportColumn{header,field}` used by `toCsv`/`exportPdf`/toolbar; upload store `{name,type,base64}`; routes `withErrorEnvelope`+`RouteContext<"/api/uploads/[id]">`. ✓
**Deferrals (documented):** real cloud storage + server-side upload authz (fork); export column value formatting (raw values v1); PDF unit coverage (manual/e2e). Missing UI primitives (progress bar) — dropzone uses a simple pending state, not a `progress` component.
