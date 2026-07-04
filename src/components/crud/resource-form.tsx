"use client";
import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldRenderer } from "@/components/crud/fields";
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
  return (
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
              {tab.fields.map((f) => (
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
              ))}
            </TabsContent>
          ))}
        </Tabs>
        <Button type="submit" className="mt-4" disabled={create.isPending || update.isPending}>{t.common.save}</Button>
      </form>
    </FormProvider>
  );
}
