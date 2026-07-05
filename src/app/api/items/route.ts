import { NextRequest, NextResponse } from "next/server";

import { itemsStore } from "@/app/api/items/_data";
import { withErrorEnvelope } from "@/lib/api/handler";
import { itemSchema, itemsResource } from "@/config/resources/items";

export const GET = withErrorEnvelope(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const perPage = Number(sp.get("per_page") ?? "10");
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? undefined;
  const order = sp.get("order") === "desc" ? "desc" : "asc";
  // Kumpulkan semua `filter[<field>]=value` jadi objek `filters` (mis.
  // `filter[prioritas]=high` -> { prioritas: "high" }) — lihat `buildListSearchParams`.
  const filters: Record<string, string> = {};
  for (const [k, v] of sp.entries()) {
    const m = k.match(/^filter\[(.+)\]$/);
    if (m) filters[m[1]] = v;
  }
  return NextResponse.json(itemsStore.list({ page, perPage, q, sort, order, filters }));
});

export const POST = withErrorEnvelope(async (req: NextRequest) => {
  // Validasi body dgn Zod — invalid → ZodError → 422 lewat withErrorEnvelope.
  const body = itemSchema.parse(await req.json());
  // Item baru selalu di-stamp status awal workflow ("draft") — abaikan
  // `status` dari body (transisi hanya lewat endpoint `/transition`).
  const created = itemsStore.create({
    id: `itm-${Date.now()}`,
    ...body,
    status: itemsResource.workflow?.initial ?? "draft",
  });
  return NextResponse.json(created, { status: 201 });
});
