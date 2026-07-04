"use client";

import * as React from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { resolveLabel } from "@/locales";
import type { AuditRow } from "@/lib/crud/types";

/**
 * Timeline jejak audit transisi status (dot-row) — visual sama dgn
 * "Recent activity" di `dashboard/page.tsx`. `rows` dirender apa adanya
 * (urutan terbaru-lebih-dulu sudah jadi kontrak `useAudit`/endpoint, bukan
 * diurutkan ulang di sini).
 *
 * Label aksi diambil dari `workflow.action.<action>` lewat `resolveLabel` —
 * bila key tak ada di kamus, `resolveLabel` sendiri sudah fallback ke segmen
 * terakhir (= nama aksi mentah), jadi tetap terbaca.
 */
export function AuditTimeline({ rows }: { rows: AuditRow[] }) {
  const { t } = useI18n();

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.common.empty}</p>;
  }

  return (
    <div className="space-y-4 text-sm">
      {rows.map((row) => (
        <div key={row.id} className="flex items-start gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{resolveLabel(t, `workflow.action.${row.action}`)}</span>{" "}
            {row.from} → {row.to} · {row.actor} · {new Date(row.at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
