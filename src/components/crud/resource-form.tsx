"use client";
import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodType } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldRenderer } from "@/components/crud/fields";
import { CrudError } from "@/lib/crud/errors";
import type { ResourceDef } from "@/lib/crud/define-resource";
import type { ID } from "@/lib/crud/types";

// `FormDef.schema` disimpan type-erased (`ZodType<unknown>`) di registry resource
// (heterogen antar resource). Di sini di-cast ke bentuk yang cocok dengan generic
// `zodResolver`/`useForm` (`FieldValues` = `Record<string, unknown>`).
type FormValues = Record<string, unknown>;

export function ResourceForm({ def, id, onDone }: { def: ResourceDef; id?: ID; onDone?: () => void }) {
  const isEdit = id !== undefined;
  const one = isEdit ? def.api.useGetOne(id!) : undefined;
  const create = def.api.useCreate();
  const update = def.api.useUpdate();

  const schema = def.form.schema as ZodType<FormValues, FormValues>;
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { reset } = form;
  React.useEffect(() => { if (one?.data) reset(one.data as FormValues); }, [one?.data, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) await update.mutateAsync({ id: id!, values });
      else await create.mutateAsync(values);
      onDone?.();
    } catch (e) {
      if (e instanceof CrudError && e.fieldErrors) {
        for (const [field, msgs] of Object.entries(e.fieldErrors)) {
          form.setError(field, { message: msgs.join(", ") });
        }
      }
    }
  }

  const tabs = def.form.layout;
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue={tabs[0]?.tabKey}>
          {tabs.length > 1 && (
            <TabsList>
              {tabs.map((t) => <TabsTrigger key={t.tabKey} value={t.tabKey}>{t.tabKey}</TabsTrigger>)}
            </TabsList>
          )}
          {tabs.map((t) => (
            <TabsContent key={t.tabKey} value={t.tabKey} className="space-y-4">
              {t.fields.map((f) => (
                <div key={f} className="space-y-1">
                  <Label htmlFor={f}>{def.form.fields[f]?.labelKey ?? f}</Label>
                  <FieldRenderer name={f} meta={def.form.fields[f] ?? { type: "text" }} />
                  <p className="text-sm text-destructive">
                    {form.formState.errors[f]?.message as string | undefined}
                  </p>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
        <Button type="submit" className="mt-4" disabled={create.isPending || update.isPending}>Simpan</Button>
      </form>
    </FormProvider>
  );
}
