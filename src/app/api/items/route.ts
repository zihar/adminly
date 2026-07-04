import { NextRequest, NextResponse } from "next/server";

import { itemsStore } from "@/app/api/items/_data";
import { withErrorEnvelope } from "@/lib/api/handler";
import { itemSchema } from "@/config/resources/items";

export const GET = withErrorEnvelope(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const perPage = Number(sp.get("per_page") ?? "10");
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? undefined;
  const order = sp.get("order") === "desc" ? "desc" : "asc";
  return NextResponse.json(itemsStore.list({ page, perPage, q, sort, order }));
});

export const POST = withErrorEnvelope(async (req: NextRequest) => {
  // Validasi body dgn Zod — invalid → ZodError → 422 lewat withErrorEnvelope.
  const body = itemSchema.parse(await req.json());
  const created = itemsStore.create({ id: `itm-${Date.now()}`, ...body });
  return NextResponse.json(created, { status: 201 });
});
