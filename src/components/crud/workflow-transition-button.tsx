"use client";

import * as React from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ResourceApi } from "@/lib/crud/create-resource-api";
import type { WorkflowTransition } from "@/lib/crud/define-resource";
import type { ID } from "@/lib/crud/types";
import { resolveLabel } from "@/locales";

// Tipe mutation di-derive dari `useTransition()` factory (BUKAN `any`) — semua
// resource ber-`ResourceDef` tanpa parameter generik eksplisit (dipakai
// `resource-table.tsx`/`resource-form.tsx`) menurunkan `TItem`/`TNew`/`TUpdate`
// ke `unknown`, jadi bentuk mutasi (variabel `{id,action,reason?}`) SAMA persis
// dgn yang dipanggil di sini — cocok tanpa cast tambahan di call-site.
export type TransitionMutation = ReturnType<ResourceApi<unknown>["useTransition"]>;

/**
 * Tombol satu aksi transisi workflow, dipakai bersama oleh baris tabel
 * (`resource-table.tsx`) & panel edit (`resource-form.tsx`) — DRY-kan pola
 * mutate+toast yang sebelumnya diduplikasi di kedua tempat.
 *
 * Gating `<Can permission={transition.permission}>` sengaja TETAP di
 * pemanggil (bukan di dalam komponen ini) — komponen fokus ke perilaku
 * tombol/dialog saja, sama seperti pola existing di kedua call-site.
 *
 * `requiresReason:true` → tombol jadi trigger `<Dialog>` berisi textarea
 * alasan wajib. Selain itu → tombol satu-klik langsung memanggil `mutate`.
 */
export function WorkflowTransitionButton({
  transition,
  id,
  mutation,
}: {
  transition: WorkflowTransition;
  id: ID;
  mutation: TransitionMutation;
}) {
  const { t } = useI18n();
  // `useState` dipanggil TANPA syarat di top level komponen (rules-of-hooks) —
  // dipakai HANYA saat `requiresReason` true, tapi tetap harus dideklarasikan
  // sebelum percabangan render di bawah.
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const label = resolveLabel(t, transition.labelKey);

  if (!transition.requiresReason) {
    return (
      <Button
        size="sm"
        variant={transition.variant ?? "outline"}
        disabled={mutation.isPending}
        onClick={() =>
          mutation.mutate(
            { id, action: transition.action },
            {
              onSuccess: () => toast.success(t.workflow.done),
              onError: () => toast.error(t.workflow.failed),
            },
          )
        }
      >
        {label}
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        // Reset alasan setiap dialog TERTUTUP (Cancel/Escape/backdrop), bukan
        // hanya saat sukses — mencegah alasan lama "nempel" (dan Konfirmasi
        // pre-enabled) bila dialog dibuka ulang setelah dibatalkan.
        if (!v) setReason("");
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant={transition.variant ?? "outline"} disabled={mutation.isPending} />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{t.workflow.reasonLabel}</DialogDescription>
        </DialogHeader>
        <textarea
          id={`workflow-reason-${transition.action}-${id}`}
          aria-label={t.workflow.reasonLabel}
          placeholder={t.workflow.reasonPlaceholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-24 w-full rounded-md border bg-background p-2 text-sm"
        />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{t.common.cancel}</DialogClose>
          <Button
            variant={transition.variant ?? "default"}
            disabled={!reason.trim() || mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { id, action: transition.action, reason: reason.trim() },
                {
                  onSuccess: () => {
                    toast.success(t.workflow.done);
                    setOpen(false);
                    setReason("");
                  },
                  onError: () => toast.error(t.workflow.failed),
                },
              )
            }
          >
            {t.common.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
