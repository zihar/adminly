import { NextRequest, NextResponse } from "next/server";

import { itemsStore } from "@/app/api/items/_data";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const perPage = Number(sp.get("per_page") ?? "10");
  const q = sp.get("q") ?? "";
  const sort = sp.get("sort") ?? undefined;
  const order = sp.get("order") === "desc" ? "desc" : "asc";
  return NextResponse.json(itemsStore.list({ page, perPage, q, sort, order }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const created = itemsStore.create({ id: `itm-${Date.now()}`, ...body });
  return NextResponse.json(created, { status: 201 });
}
