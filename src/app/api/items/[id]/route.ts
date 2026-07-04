import { NextRequest, NextResponse } from "next/server";

import { itemsStore } from "@/app/api/items/_data";
import { withErrorEnvelope, notFound } from "@/lib/api/handler";
import { itemSchema } from "@/config/resources/items";

export const GET = withErrorEnvelope(
  async (_req: NextRequest, ctx?: RouteContext<"/api/items/[id]">) => {
    const { id } = await ctx!.params;
    const row = itemsStore.get(id);
    if (!row) throw notFound();
    return NextResponse.json(row);
  },
);

export const PUT = withErrorEnvelope(
  async (req: NextRequest, ctx?: RouteContext<"/api/items/[id]">) => {
    const { id } = await ctx!.params;
    // Validasi body dgn Zod — invalid → ZodError → 422 lewat withErrorEnvelope.
    const body = itemSchema.parse(await req.json());
    const row = itemsStore.update(id, body);
    if (!row) throw notFound();
    return NextResponse.json(row);
  },
);

export const DELETE = withErrorEnvelope(
  async (_req: NextRequest, ctx?: RouteContext<"/api/items/[id]">) => {
    const { id } = await ctx!.params;
    itemsStore.remove(id);
    return new NextResponse(null, { status: 204 });
  },
);
