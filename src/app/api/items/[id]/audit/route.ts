import { NextRequest, NextResponse } from "next/server";

import { auditStore } from "@/app/api/_store/audit-store";
import { withErrorEnvelope } from "@/lib/api/handler";

// GET /api/items/{id}/audit — jejak audit (riwayat transisi) satu item,
// newest-first. Tidak ada 404 tersendiri bila id tak dikenal — cukup array
// kosong (konsisten dgn `listFor` yang murni filter, tanpa validasi entity).
export const GET = withErrorEnvelope(
  async (_req: NextRequest, ctx?: RouteContext<"/api/items/[id]/audit">) => {
    const { id } = await ctx!.params;
    return NextResponse.json(auditStore.listFor(id));
  },
);
