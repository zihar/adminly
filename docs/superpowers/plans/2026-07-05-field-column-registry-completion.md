# Field & Column Registry Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Complete the two rendering registries so real forms/tables work: implement the missing **field components** (every `FieldType` gets a real component — no more silent `TextField` fallback) and the missing **column cell renderers** (`date`, `relation`, `image`, `currency`, `boolean`; `badge`/text already done). Unblocks real UI (e.g. a fork needing `date`/`select`/`file`/`checkbox` fields).

**Architecture:** Each field type gets a small client component following the established `src/components/crud/fields/text-field.tsx` pattern (`useFormContext()` + `register(name)` / `Controller` where needed), registered via `registerField(type, component)` in `fields/index.tsx`. The generic table's cell factory (`resource-table.tsx`, currently `badge` + `String` fallback) gains a `switch (c.render)` covering the remaining `ColumnRender` members. All labels/formatting are i18n/locale-aware.

**Tech Stack:** React 19 + react-hook-form (`useFormContext`/`Controller`), shadcn Base UI (`@base-ui/react`; `render={<C/>}`), TS, Vitest + @testing-library/react. No new deps.

## Global Constraints
- **Generic** (no domain terms). i18n via `useI18n()`+`resolveLabel`; new keys mirrored `src/locales/en.ts` (type source)+`id.ts`. Base UI composition; reuse `ui/*` (`input`, `label`, `checkbox` if present, `badge`). `@/` alias; Indonesian comments; two-space indent; no `any`. `npx tsc --noEmit`+`npm run lint` clean; tests verify real behavior (drive RHF state/DOM).
- **Field component contract** (from `fields/index.tsx`): `FieldProps = { name: string; meta: FieldMeta }`; use `useFormContext()`; register via `register(name)` for native inputs or RHF `Controller` for controlled ones; set `id={name}` (a11y — `ResourceForm` renders `<Label htmlFor={name}>`). `FieldMeta` has `options?: {value,label}[]` (static select/radio), `accept?` (file). Watch `eslint-plugin-react-hooks` `static-components` (register plain components; no dynamic component lookup in JSX).
- **v1 decisions:** `file` = mock (native `<input type="file">`; on change, store a data-URL string as the field value — NO upload endpoint; real upload is the deferred file+export feature). `richtext` = a `<textarea>`-based stub (real WYSIWYG = follow-up). `relation` column = render the raw value, or `row[`${field}_label`]` if present (true id→label via options = follow-up; do NOT fetch per-cell).
- Reuse the mount/`register` patterns from `text-field.tsx`; for options-bearing fields mirror the static-options shape used by `FieldMeta.options`.

---

### Task 1: Text-like fields — textarea, number, hidden
**Files:** `src/components/crud/fields/textarea-field.tsx`, `number-field.tsx`, `hidden-field.tsx`; register in `fields/index.tsx`; tests `fields/__tests__/*`.
**Produces:** `TextareaField`, `NumberField`, `HiddenField`; `registerField("textarea"|"number"|"hidden", …)`.
- [ ] Step 1 (RED): test each — textarea renders a `<textarea id={name}>` bound to RHF; number renders `<input type="number">` and registers with `{ valueAsNumber: true }`; hidden renders `<input type="hidden">` (no visible label needed). Assert value flows into RHF (submit or `getByRole`).
- [ ] Step 2: implement the three (mirror `text-field.tsx`; `<Input>` from `@/components/ui/input` for number; plain `<textarea className=...>` or a ui/textarea if you add one — prefer reusing `Input` styling classes). `id={name}` on each.
- [ ] Step 3: `registerField` all three. GREEN; tsc/lint clean.
- [ ] Step 4: Commit `"Tambah field textarea/number/hidden ke registry"`.

### Task 2: Choice fields — select, radio, checkbox
**Files:** `select-field.tsx`, `radio-field.tsx`, `checkbox-field.tsx`; register; tests.
**Consumes:** `FieldMeta.options?: {value,label}[]` (static); a `ui/checkbox` if it exists (else native input).
**Produces:** `SelectField`, `RadioField`, `CheckboxField`.
- [ ] Step 1 (RED): tests — select renders `<select id={name}>` with an option per `meta.options` (label shown, value submitted); radio renders one radio per option (same `name`); checkbox renders a single boolean checkbox (`register(name)`), value is boolean. Assert selection updates RHF.
- [ ] Step 2: implement (native `<select>` like `async-select-field.tsx`; radios via `register(name)`; checkbox via `register(name)` with `type="checkbox"` or `ui/checkbox` + `Controller`). Labels via the option `label` (already resolved strings) — do NOT re-i18n option labels here (caller provides them).
- [ ] Step 3: register; GREEN; tsc/lint. Commit `"Tambah field select/radio/checkbox ke registry"`.

### Task 3: Date fields — date, datetime
**Files:** `date-field.tsx`, `datetime-field.tsx`; register; tests.
**Produces:** `DateField` (`<input type="date">`), `DateTimeField` (`<input type="datetime-local">`).
- [ ] Step 1 (RED): tests — date renders `<input type="date" id={name}>` bound to RHF (string value `YYYY-MM-DD`); datetime `type="datetime-local"`. Assert value round-trips through RHF.
- [ ] Step 2: implement (reuse `<Input>` with the right `type`; `register(name)`; `id={name}`).
- [ ] Step 3: register; GREEN; tsc/lint. Commit `"Tambah field date/datetime ke registry"`.

### Task 4: file (mock) + richtext (stub)
**Files:** `file-field.tsx`, `richtext-field.tsx`; register; tests.
**Produces:** `FileField` (native `<input type="file" accept={meta.accept}>`; on change read the file → set a data-URL string via `setValue(name, dataUrl)`; store filename too if trivial), `RichtextField` (a `<textarea>`-based component; comment noting it's a v1 stub for a real WYSIWYG).
- [ ] Step 1 (RED): tests — FileField renders `<input type="file" id={name}>` honoring `meta.accept`; simulate a file select (`fireEvent.change` with a `File`) and assert `setValue(name, ...)` is called / the RHF value becomes a non-empty string (mock `FileReader` or assert the handler wiring). RichtextField renders a `<textarea id={name}>` bound to RHF.
- [ ] Step 2: implement. FileField: `const { setValue } = useFormContext()`; on change, `FileReader.readAsDataURL` → `setValue(name, reader.result as string, { shouldDirty: true })`. Keep it simple/mock; add an Indonesian comment that real upload is a separate feature.
- [ ] Step 3: register both; GREEN; tsc/lint. Commit `"Tambah field file (mock data-URL) + richtext (stub) ke registry"`.

### Task 5: Column cell renderers — date, boolean, currency, image, relation
**Files:** `src/components/crud/resource-table.tsx` (cell factory); test `resource-table.test.tsx`.
**Consumes:** `ColumnDef.render` (`date|relation|image|currency|boolean` + existing `badge`), `ColumnDef.relation?`.
- [ ] Step 1 (RED): tests — a column `render:"date"` formats an ISO value to a locale date; `render:"boolean"` shows a check/"Yes"·"No" (i18n) for true/false; `render:"currency"` formats a number; `render:"image"` renders an `<img src=value>` (with `alt`); `render:"relation"` shows `row[`${field}_label`]` when present else the raw value. Use the existing table test harness.
- [ ] Step 2: extend the cell `switch (c.render)` (after the existing `badge` case): `date` → readable date (guard invalid); `boolean` → i18n Yes/No (add `common.yes`/`common.no` if missing, mirrored en/id); `currency` → `Intl.NumberFormat` (or a simple format; keep locale-agnostic/consistent); `image` → small `<img>` (max height, `alt`); `relation` → `row.original[`${c.field}_label`] ?? String(value)`. Keep `String(value)` as the final fallback. Avoid react-hooks `static-components` pitfalls (render elements directly).
- [ ] Step 3: GREEN; tsc/lint. Commit `"ResourceTable: renderer kolom date/boolean/currency/image/relation"`.

### Task 6: Demo wiring + full verification
**Files:** `src/config/resources/items.ts` (add a few example fields exercising new types) + `_data.ts`/`openapi.yaml` if needed; verification.
- [ ] Step 1: Add to the `items` form a small representative set that exercises the new registry (e.g. a `select` (a simple category enum), a `date` field, a `checkbox` (boolean flag), and optionally a `file`) + a column with `render:"date"` or `"boolean"`. Extend `ItemRow`/`itemSchema`/`openapi.yaml Item` accordingly (optional fields); `npm run gen:api`. Keep generic/minimal — just enough to demonstrate each new field/renderer renders. (If extending Item is heavy, add ONE representative field per new type minimally.)
- [ ] Step 2: Full sweep — `npm run gen:api` (idempotent), `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx playwright test --workers=1` (serial; note the known parallel flake). All green.
- [ ] Step 3: Manual (dev): open the items create/edit form — each new field type renders correctly (date picker, select, checkbox, file input); list shows the new column renderer. Commit `"Demo items: field baru + kolom renderer + verifikasi"`.

---

## Self-Review
**Spec coverage:** all 10 missing field types built + registered (T1 textarea/number/hidden, T2 select/radio/checkbox, T3 date/datetime, T4 file/richtext) → no silent TextField fallback; all 5 missing column renderers (T5); demo + verification (T6). ✓
**Placeholder scan:** each task = RED test + concrete component per the `text-field.tsx` pattern; file/richtext/relation v1 decisions stated explicitly (mock/stub/value). No TBD. ✓
**Type consistency:** every component uses `FieldProps` + `id={name}`; `registerField(<FieldType>, …)` for each declared type; cell switch covers each `ColumnRender` member; new i18n keys (`common.yes/no`) mirrored en/id. ✓
**Notes:** `file` real upload + `richtext` real WYSIWYG + `relation` true id→label are explicit v1 deferrals (documented), not gaps. Storybook stories for new fields = optional follow-up (only `text-field.stories.tsx` exists).
