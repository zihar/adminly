import { NextRequest, NextResponse } from "next/server";

import { itemsStore } from "@/app/api/items/_data";
import { withErrorEnvelope } from "@/lib/api/handler";

export const GET = withErrorEnvelope(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const { data } = itemsStore.list({ page: 1, perPage: 1000, q });
  return NextResponse.json(data.map((r) => ({ value: r.id, label: r.nama })));
});
