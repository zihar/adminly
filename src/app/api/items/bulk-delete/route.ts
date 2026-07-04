import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { itemsStore } from "@/app/api/items/_data";
import { withErrorEnvelope } from "@/lib/api/handler";

export const POST = withErrorEnvelope(async (req: NextRequest) => {
  const { ids } = z.object({ ids: z.array(z.string()).default([]) }).parse(await req.json());
  itemsStore.removeMany(ids);
  return new NextResponse(null, { status: 204 });
});
