"use client";
import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Can } from "@/components/auth/can";
import { FieldRenderer } from "@/components/crud/fields";
import { WorkflowStepper } from "@/components/crud/workflow-stepper";
import { WorkflowTransitionButton } from "@/components/crud/workflow-transition-button";
import { AuditTimeline } from "@/components/crud/audit-timeline";
import { CrudError } from "@/lib/crud/errors";
import type { ResourceDef } from "@/lib/crud/define-resource";
import type { ID } from "@/lib/crud/types";
import { useI18n } from "@/components/providers/i18n-provider";
import { useScope } from "@/components/providers/scope-provider";
import { resolveLabel } from "@/locales";

// `FormDef.schema` disimpan type-erased (`ZodType<unknown>`) di registry resource
// (heterogen antar resource). Di sini di-cast ke bentuk yang cocok dengan generic
// `zodResolver`/`useForm` (`FieldValues` = `Record<string, unknown>`).
type FormValues = Record<string, unknown>;

export function ResourceForm({ def, id, onDone }: { def: ResourceDef; id?: ID; onDone?: () => void }) {
  const { t } = useI18n();
  const { scope } = useScope();
  const isEdit = id !== undefined;
  // Hook dipanggil TANPA syarat (aturan React Hooks); fetch di-gate lewat
  // `enabled: isEdit` — mode create tak menembak network sama sekali.
  const one = def.api.useGetOne(id as ID, { enabled: isEdit });
  const create = def.api.useCreate();
  const update = def.api.useUpdate();
  // Sama spt `one`: hook dipanggil TANPA syarat — query-nya sendiri sudah
  // ber-`enabled: !!id` (lihat `auditQueryOptions`), jadi mode create (tanpa
  // `id`) otomatis tak menembak network. `useTransition` tak butuh gating
  // (mutation, bukan query) — dipanggil sekali di top level spt `resource-table.tsx`.
  const audit = def.api.useAudit(id as ID);
  const transition = def.api.useTransition();

  const schema = def.form.schema as ZodType<FormValues, FormValues>;
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { reset } = form;
  React.useEffect(() => { if (one.data) reset(one.data as FormValues); }, [one.data, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await update.mutateAsync({ id: id!, values });
      } else {
        // Tempelkan scope global aktif (mis. workspace) sebagai default
        // tersembunyi di payload create — hanya create, edit tak disentuh.
        // Nilai undefined/"" dianggap "tak ada scope" dan di-drop.
        const scoped = (def.scope ?? []).reduce<Record<string, unknown>>((acc, k) => {
          if (scope[k] !== undefined && scope[k] !== "") acc[k] = scope[k];
          return acc;
        }, {});
        await create.mutateAsync({ ...values, ...scoped });
      }
      // Toast i18n dipasang di caller (factory toast-free); default locale English.
      toast.success(t.common.saved);
      onDone?.();
    } catch (e) {
      // 422 → petakan ke error per-field (jangan double-toast validasi field).
      if (e instanceof CrudError && e.fieldErrors) {
        for (const [field, msgs] of Object.entries(e.fieldErrors)) {
          form.setError(field, { message: msgs.join(", ") });
        }
        return;
      }
      // Error non-422 → tampilkan toast gagal generik (bukan pesan mentah).
      toast.error(t.common.saveFailed);
    }
  }

  const tabs = def.form.layout;
  const wf = def.workflow;
  // Status terkini row (di field `wf.field`, mis. "status") — hanya berarti di
  // mode edit (mode create belum punya row/`one.data`). Transisi yang
  // diizinkan dihitung dari status ini, sama seperti filter per-baris di
  // `resource-table.tsx`.
  const currentStatus = wf ? String((one.data as Record<string, unknown> | undefined)?.[wf.field] ?? "") : "";
  const allowedTransitions = wf ? wf.transitions.filter((tr) => tr.from.includes(currentStatus)) : [];

  // Satu field = satu sel. Diekstrak supaya jalur `fields` (lama) dan jalur
  // `sections` (baru) merender field dengan cara yang PERSIS sama — kalau
  // keduanya menyalin blok ini, perbaikan di satu jalur diam-diam melewatkan
  // yang lain.
  const renderField = (f: string) => (
    <div key={f} className="space-y-1">
      {/* Field `cascade` render label per-levelnya sendiri (tiap
          `<select>` punya `id`/`htmlFor` sendiri) — outer `<Label
          htmlFor={f}>` di sini akan menggantung (tak ada elemen
          dengan `id={f}`), jadi dilewati khusus untuk tipe ini. */}
      {def.form.fields[f]?.type !== "cascade" && (
        <Label htmlFor={f}>{resolveLabel(t, def.form.fields[f]?.labelKey ?? f)}</Label>
      )}
      <FieldRenderer name={f} meta={def.form.fields[f] ?? { type: "text" }} />
      <p className="text-sm text-destructive">
        {form.formState.errors[f]?.message as string | undefined}
      </p>
    </div>
  );

  return (
    <>
      {/* Panel workflow: HANYA di mode edit + resource yang mendeklarasikan
          `def.workflow` — stepper status, tombol transisi (gated `<Can>`, pola
          sama dgn aksi transisi baris di ResourceTable), lalu jejak audit. */}
      {wf && isEdit && (
        <div className="mb-6 space-y-4 rounded-lg border p-4">
          <WorkflowStepper statuses={wf.statuses} current={currentStatus} />
          {allowedTransitions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {allowedTransitions.map((tr) => (
                <Can key={tr.action} permission={tr.permission}>
                  <WorkflowTransitionButton transition={tr} id={id!} mutation={transition} />
                </Can>
              ))}
            </div>
          )}
          <AuditTimeline rows={audit.data ?? []} />
        </div>
      )}
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue={tabs[0]?.tabKey}>
            {tabs.length > 1 && (
              <TabsList>
                {tabs.map((tab) => <TabsTrigger key={tab.tabKey} value={tab.tabKey}>{resolveLabel(t, tab.tabKey)}</TabsTrigger>)}
              </TabsList>
            )}
            {tabs.map((tab) => (
              <TabsContent key={tab.tabKey} value={tab.tabKey} className="space-y-4">
                {/* Jalur lama: field langsung di tab, tanpa judul section.
                    `?? []` bukan defensif berlebihan — sejak `sections` ada,
                    `fields` boleh absen. */}
                {(tab.fields ?? []).map(renderField)}
                {/* Jalur baru: field dikelompokkan di bawah judul section,
                    URUTAN section = urutan array (bukan urutan `form.fields`). */}
                {(tab.sections ?? []).map((sec) => (
                  <section key={sec.key} className="space-y-4">
                    <h3 className="border-b pb-1 text-sm font-semibold">
                      {resolveLabel(t, sec.key)}
                    </h3>
                    {sec.fields.map(renderField)}
                  </section>
                ))}
              </TabsContent>
            ))}
          </Tabs>
          <Button type="submit" className="mt-4" disabled={create.isPending || update.isPending}>{t.common.save}</Button>
        </form>
      </FormProvider>
    </>
  );
}
