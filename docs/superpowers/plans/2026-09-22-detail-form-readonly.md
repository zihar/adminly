# Detail Form Read-only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detail generik memakai form edit yang sama dalam keadaan read-only sehingga perubahan form otomatis ikut pada detail.

**Architecture:** `ResourceForm` menerima mode eksplisit dan memberi context read-only ke seluruh renderer field. Rute `[resource]/[id]` memakai mode tersebut kecuali resource mendeklarasikan `components.detail` untuk visualisasi domain sendiri.

**Tech Stack:** Next.js App Router, React, React Hook Form, TypeScript, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-22-detail-form-readonly-design.md`

## Global Constraints

- `mode="detail"` wajib memiliki `id` dan tak boleh masuk jalur create.
- Semua kontrol field memakai context disabled, bukan conditional halaman.
- Detail boleh berpindah tab tetapi tak boleh submit atau menjalankan workflow transition.
- `components.detail` menang; `components.form` menerima `mode?: "edit" | "detail"`.
- Tidak ada perubahan API, schema, permission server, atau data.

## Review Focus

- Popover select authored harus benar-benar disabled, bukan hanya fieldset.
- Detail tanpa id tak boleh mengirim create request.
- Status/audit workflow terbaca tanpa tombol transition.
- Tab detail dapat dipilih walau field disabled.
- `components.detail` tidak boleh terganti form generik.

---

### Task 1: Context mode form dan kontrak resource

**Files:**
- Create: `src/components/crud/form-mode-context.tsx`
- Modify: `src/components/crud/fields/index.tsx`
- Modify: `src/lib/crud/define-resource.ts`
- Test: `src/components/crud/__tests__/form-mode-context.test.tsx`

**Interfaces:** Produces `FormMode = "edit" | "detail"`, `<FormModeProvider mode>`, `useFormMode(): FormMode`, `FieldProps.disabled?: boolean`, serta prop `mode?: FormMode` pada custom form dan `components.detail` pada resource.

## Verifikasi literal

- Literal: `export type FieldProps = { name: string; meta: FieldMeta };` dan `components?: {`.
- Perintah: `rg -n "FieldProps|components\?:" src/components/crud/fields/index.tsx src/lib/crud/define-resource.ts`.
- Temuan: `FieldProps` belum membawa `disabled`; registry belum punya `components.detail` dan custom form belum menerima `mode`.

**Assertion dan mutasi yang mematahkannya:** Provider detail membuat renderer menerima `disabled=true`; cabut `useFormMode()` dari `FieldRenderer` harus merah. Prop eksplisit `disabled={false}` menang atas context; ganti fallback `disabled ?? mode === "detail"` menjadi `mode === "detail"` harus merah.

- [ ] **Step 1: Write the failing test**

```tsx
it("meneruskan disabled dari mode detail", () => {
  render(<FormModeProvider mode="detail"><FieldRenderer name="nama" meta={{ type: "text" }} /></FormModeProvider>);
  expect(screen.getByRole("textbox")).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- src/components/crud/__tests__/form-mode-context.test.tsx`

Expected: FAIL karena context dan prop belum ada.

- [ ] **Step 3: Implement the smallest shared interface**

```tsx
export type FormMode = "edit" | "detail";
const FormModeContext = React.createContext<FormMode>("edit");
export const useFormMode = () => React.useContext(FormModeContext);
export function FieldRenderer({ name, meta, disabled }: FieldProps) {
  const mode = useFormMode();
  return <Comp name={name} meta={meta} disabled={disabled ?? mode === "detail"} />;
}
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm test -- src/components/crud/__tests__/form-mode-context.test.tsx`

Expected: PASS.

- [ ] **Step 5: Mutate and commit**

Mutate only fallback `FieldRenderer` menjadi `disabled={false}`, amati RED, pulihkan lalu GREEN.

```bash
git add src/components/crud/form-mode-context.tsx src/components/crud/fields/index.tsx src/lib/crud/define-resource.ts src/components/crud/__tests__/form-mode-context.test.tsx
git commit -m "feat: add shared read-only form mode"
```

### Task 2: Semua field renderer menghormati disabled

**Files:**
- Modify: `src/components/crud/fields/{text,textarea,number,select,async-select,cascade,date,datetime,checkbox,radio,file,richtext}-field.tsx`
- Test: `src/components/crud/fields/__tests__/read-only-fields.test.tsx`

**Interfaces:** Consumes `FieldProps.disabled`; produces kontrol native dan authored yang tidak dapat mengubah value atau membuka pilihan saat disabled.

## Verifikasi literal

- Literal: seluruh 12 `registerField(...)`.
- Perintah: `rg -n "registerField\(" src/components/crud/fields/index.tsx`.
- Temuan: ada 12 renderer interaktif; `hidden` dikecualikan karena tidak memiliki kontrol visual.

**Assertion dan mutasi yang mematahkannya:** Setiap dari 12 renderer harus meneruskan disabled; cabut prop dari satu lokasi per mutasi. Trigger `SelectField` tidak membuka popover; cabut disabled pada button trigger harus merah. Cascade level pertama dan input file diuji dengan mutasi lokasi masing-masing.

- [ ] **Step 1: Write failing parameterized tests**

```tsx
it.each(["text", "textarea", "number", "date", "datetime", "checkbox", "radio", "file", "richtext"])("%s disabled", async (type) => {
  renderDetailField(type);
  expect(await interactiveControl(type)).toBeDisabled();
});
it("select authored tidak membuka opsi", async () => {
  const user = userEvent.setup(); renderDetailField("select");
  await user.click(screen.getByRole("button"));
  expect(screen.queryByRole("option")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- src/components/crud/fields/__tests__/read-only-fields.test.tsx`

Expected: FAIL karena renderer belum meneruskan disabled ke seluruh kontrol.

- [ ] **Step 3: Implement disabled at every renderer call site**

```tsx
export function TextField({ name, disabled }: FieldProps) {
  const { register } = useFormContext();
  return <Input id={name} disabled={disabled} {...register(name)} />;
}
```

Teruskan prop ke setiap input/button; authored popover menolak `onOpenChange(true)` saat disabled dan cascade memakai `disabled || disabledByParent` pada setiap level.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- src/components/crud/fields/__tests__/read-only-fields.test.tsx`

Expected: PASS untuk 12 renderer.

- [ ] **Step 5: Mutate and commit**

Cabut disabled hanya dari trigger `SelectField`, amati RED; pulihkan. Cabut hanya dari `FileField`, amati RED; pulihkan dan jalankan GREEN.

```bash
git add src/components/crud/fields src/components/crud/fields/__tests__/read-only-fields.test.tsx
git commit -m "feat: disable fields in read-only form mode"
```

### Task 3: ResourceForm detail dan rute detail generik

**Files:**
- Create: `src/app/(app)/[resource]/[id]/page.tsx`
- Create: `src/app/(app)/[resource]/[id]/__tests__/page.test.tsx`
- Modify: `src/components/crud/resource-form.tsx`
- Modify: `src/components/crud/__tests__/resource-form.test.tsx`

**Interfaces:** Consumes Task 1–2. Produces `ResourceForm({ def, id, mode?: "edit" | "detail", onDone? })` dan rute detail yang mengutamakan `components.detail`.

## Verifikasi literal

- Literal: `const isEdit = id !== undefined;`, `<form onSubmit={form.handleSubmit(onSubmit)}>`, `<WorkflowTransitionButton`; rute detail belum ada.
- Perintah: `rg -n "isEdit|onSubmit=|WorkflowTransitionButton" src/components/crud/resource-form.tsx; test -f 'src/app/(app)/[resource]/[id]/page.tsx`.
- Temuan: form selalu menyediakan submit/transition pada record edit dan belum ada detail route upstream.

**Assertion dan mutasi yang mematahkannya:** Submit dan transition tidak ada di detail; hilangkan masing-masing guard harus merah. Tab dapat berpindah; disable Tabs harus merah. Custom detail menang; selalu render form di rute harus merah. Detail tanpa id gagal; hapus invariant harus merah.

- [ ] **Step 1: Write failing ResourceForm and route tests**

```tsx
it("detail memuat record disabled tanpa Save atau transition", async () => {
  wrap(<ResourceForm def={workflowDef} id="5" mode="detail" />);
  expect(await screen.findByDisplayValue("Record")).toBeDisabled();
  expect(screen.queryByRole("button", { name: /save|approve/i })).not.toBeInTheDocument();
});
it("rute mengutamakan components.detail", async () => {
  getResourceMock.mockReturnValue({ ...def, components: { detail: DetailProbe } });
  render(<Page params={Promise.resolve({ resource: "items", id: "5" })} />);
  expect(await screen.findByTestId("detail-probe")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- src/components/crud/__tests__/resource-form.test.tsx src/app/'(app)'/'[resource]'/'[id]'/__tests__/page.test.tsx`

Expected: FAIL karena mode dan route belum ada.

- [ ] **Step 3: Implement mode and route**

```tsx
if (mode === "detail" && id === undefined) throw new Error("ResourceForm detail requires id");
<FormModeProvider mode={mode}>
  {mode !== "detail" && <Button type="submit">{t.common.save}</Button>}
</FormModeProvider>
```

Rute mengambil resource seperti edit, lalu memakai `<CustomDetail def={def} id={id} />` bila tersedia atau `<ResourceForm def={def} id={id} mode="detail" />` bila tidak.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npm test -- src/components/crud/__tests__/resource-form.test.tsx src/app/'(app)'/'[resource]'/'[id]'/__tests__/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Mutate, verify affected suite, and commit**

Mutasi mandiri: fallback route menjadi `<ResourceForm def={def} id={id} />`; assertion input disabled wajib RED. Pulihkan lalu:

```bash
npm test -- src/components/crud/__tests__/form-mode-context.test.tsx src/components/crud/fields/__tests__/read-only-fields.test.tsx src/components/crud/__tests__/resource-form.test.tsx src/app/'(app)'/'[resource]'/'[id]'/__tests__/page.test.tsx
git add src/app/'(app)'/'[resource]'/'[id]'/page.tsx src/app/'(app)'/'[resource]'/'[id]'/__tests__/page.test.tsx src/components/crud/resource-form.tsx src/components/crud/__tests__/resource-form.test.tsx
git commit -m "feat: add generic read-only detail route"
```

## Handoff setelah Adminly

Sesudah tiga task upstream direview, tulis plan JIT Edelweiss yang menginventaris `components.detail`, memindahkan hanya detail generik ke `ResourceForm mode="detail"`, dan mempertahankan Cetak Profil PDF serta custom detail domain.
