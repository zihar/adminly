import { NextRequest, NextResponse } from "next/server";

import { regionsStore } from "@/app/api/regions/_data";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/regions/[id]">,
) {
  const { id } = await ctx.params;
  const row = regionsStore.get(id);
  return row
    ? NextResponse.json(row)
    : NextResponse.json({ message: "Tidak ditemukan" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<"/api/regions/[id]">,
) {
  const { id } = await ctx.params;
  const row = regionsStore.update(id, await req.json());
  return row
    ? NextResponse.json(row)
    : NextResponse.json({ message: "Tidak ditemukan" }, { status: 404 });
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/regions/[id]">,
) {
  const { id } = await ctx.params;
  regionsStore.remove(id);
  return new NextResponse(null, { status: 204 });
}
