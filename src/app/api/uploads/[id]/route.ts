import { NextRequest, NextResponse } from "next/server";

import { uploadStore } from "@/app/api/_store/upload-store";
import { withErrorEnvelope, notFound } from "@/lib/api/handler";

export const GET = withErrorEnvelope(
  async (_req: NextRequest, ctx?: RouteContext<"/api/uploads/[id]">) => {
    const { id } = await ctx!.params;
    const rec = uploadStore.get(id);
    if (!rec) throw notFound();
    return new NextResponse(Buffer.from(rec.base64, "base64"), {
      headers: { "content-type": rec.type || "application/octet-stream" },
    });
  },
);
