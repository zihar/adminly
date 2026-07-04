"use client";

import * as React from "react";
import { cva } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import { resolveLabel } from "@/locales";
import { cn } from "@/lib/utils";
import type { WorkflowStatus } from "@/lib/crud/define-resource";

// Opasitas step: `done`/`active` penuh, `upcoming` diredupkan — pembeda visual
// tambahan di luar varian `<Badge>` itu sendiri (yang tetap sama utk done/upcoming).
const stepVariants = cva("flex items-center gap-2", {
  variants: {
    state: {
      done: "opacity-100",
      active: "opacity-100",
      upcoming: "opacity-50",
    },
  },
});

/**
 * Stepper status workflow: render `statuses` (berurutan sesuai `def.workflow`)
 * sebagai deretan `<Badge>` yang dihubungkan garis, dengan step `current`
 * ditandai aktif (`aria-current="step"` + varian menonjol) dan step
 * sebelumnya ditandai selesai. Dibangun murni dari `<Badge>` + CVA (tak ada
 * primitif stepper eksternal) sesuai keputusan desain.
 *
 * Bila `current` tak ditemukan di `statuses` (mis. data tak sinkron), semua
 * step diperlakukan sbg `upcoming` — tak ada step aktif, tapi tak crash.
 */
export function WorkflowStepper({ statuses, current }: { statuses: WorkflowStatus[]; current: string }) {
  const { t } = useI18n();
  const currentIndex = statuses.findIndex((s) => s.value === current);

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {statuses.map((s, i) => {
        const state: "done" | "active" | "upcoming" =
          currentIndex === -1 ? "upcoming" : i < currentIndex ? "done" : i === currentIndex ? "active" : "upcoming";
        const isLast = i === statuses.length - 1;
        return (
          <li key={s.value} className={cn(stepVariants({ state }), !isLast && "flex-1")}>
            <Badge
              variant={state === "active" ? (s.variant ?? "default") : state === "done" ? "secondary" : "outline"}
              aria-current={state === "active" ? "step" : undefined}
              className={state === "active" ? "ring-2 ring-primary/40 ring-offset-1" : undefined}
            >
              {resolveLabel(t, s.labelKey)}
            </Badge>
            {!isLast && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
