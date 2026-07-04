import { NextRequest, NextResponse } from "next/server";

import { regionsStore } from "@/app/api/regions/_data";
import { withErrorEnvelope } from "@/lib/api/handler";
import { regionSchema } from "@/config/resources/regions";

export const GET = withErrorEnvelope(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const perPage = Number(sp.get("per_page") ?? "10");
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? undefined;
  const order = sp.get("order") === "desc" ? "desc" : "asc";
  return NextResponse.json(regionsStore.list({ page, perPage, q, sort, order }));
});

export const POST = withErrorEnvelope(async (req: NextRequest) => {
  // Validasi body dgn Zod — invalid → ZodError → 422 lewat withErrorEnvelope.
  const body = regionSchema.parse(await req.json());
  // `parentId` opsional di schema (form top-level tak selalu mengisinya),
  // tapi wajib string di tipe `Region` — default "" (root) bila kosong.
  const created = regionsStore.create({
    id: `rgn-${Date.now()}`,
    name: body.name,
    parentId: body.parentId ?? "",
  });
  return NextResponse.json(created, { status: 201 });
});
