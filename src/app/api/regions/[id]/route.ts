import { NextRequest, NextResponse } from "next/server";

import { regionsStore } from "@/app/api/regions/_data";
import { withErrorEnvelope, notFound } from "@/lib/api/handler";
import { regionSchema } from "@/config/resources/regions";

export const GET = withErrorEnvelope(
  async (_req: NextRequest, ctx?: RouteContext<"/api/regions/[id]">) => {
    const { id } = await ctx!.params;
    const row = regionsStore.get(id);
    if (!row) throw notFound();
    return NextResponse.json(row);
  },
);

export const PUT = withErrorEnvelope(
  async (req: NextRequest, ctx?: RouteContext<"/api/regions/[id]">) => {
    const { id } = await ctx!.params;
    // Validasi body dgn Zod — invalid → ZodError → 422 lewat withErrorEnvelope.
    const body = regionSchema.parse(await req.json());
    const row = regionsStore.update(id, body);
    if (!row) throw notFound();
    return NextResponse.json(row);
  },
);

export const DELETE = withErrorEnvelope(
  async (_req: NextRequest, ctx?: RouteContext<"/api/regions/[id]">) => {
    const { id } = await ctx!.params;
    regionsStore.remove(id);
    return new NextResponse(null, { status: 204 });
  },
);
