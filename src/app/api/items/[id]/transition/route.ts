import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { itemsStore } from "@/app/api/items/_data";
import { auditStore } from "@/app/api/_store/audit-store";
import { withErrorEnvelope, badRequest, notFound } from "@/lib/api/handler";
import { itemsResource } from "@/config/resources/items";
import { ROLE_COOKIE, parseRole } from "@/config/rbac";

const bodySchema = z.object({ action: z.string(), reason: z.string().optional() });

// Aktor terbaik-usaha dari cookie role demo. `cookies()` butuh konteks
// request Next.js sungguhan — saat route ini dipanggil langsung (unit test
// import-and-invoke), konteks itu tidak ada dan `cookies()` bisa melempar;
// fallback "system" menjaga endpoint tetap berfungsi di kedua kasus.
async function resolveActor(): Promise<string> {
  try {
    const store = await cookies();
    return parseRole(store.get(ROLE_COOKIE)?.value);
  } catch {
    return "system";
  }
}

// POST /api/items/{id}/transition — jalankan satu transisi workflow (mis.
// "submit"/"approve"/"reject") lalu catat baris audit. Otorisasi permission
// tombol digerbangi di client (`<Can>`) — endpoint ini HANYA memvalidasi
// legalitas transisi (from -> to), bukan role (lihat spec §Decisions #3;
// backend produksi sungguhan WAJIB menegakkan otorisasi di server).
export const POST = withErrorEnvelope(
  async (req: NextRequest, ctx?: RouteContext<"/api/items/[id]/transition">) => {
    const { id } = await ctx!.params;
    const { action, reason } = bodySchema.parse(await req.json());

    const row = itemsStore.get(id);
    if (!row) throw notFound();

    const transition = itemsResource.workflow?.transitions.find(
      (tr) => tr.action === action && tr.from.includes(row.status),
    );
    if (!transition) {
      throw badRequest(`Transisi "${action}" tidak valid dari status "${row.status}"`);
    }
    // Transisi ber-`requiresReason` (mis. reject) WAJIB menyertakan alasan
    // non-kosong — dicek server-side, bukan cuma di client (dialog Task 3).
    if (transition.requiresReason && !reason?.trim()) {
      throw badRequest("Alasan wajib diisi untuk transisi ini");
    }

    const updated = itemsStore.update(id, { status: transition.to });
    if (!updated) throw notFound();

    auditStore.append({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entityId: id,
      action,
      from: row.status,
      to: transition.to,
      actor: await resolveActor(),
      at: new Date().toISOString(),
      reason: reason ?? null,
    });

    return NextResponse.json(updated);
  },
);
