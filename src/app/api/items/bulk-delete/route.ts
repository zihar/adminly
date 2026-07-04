import { NextRequest, NextResponse } from "next/server";

import { itemsStore } from "@/app/api/items/_data";

export async function POST(req: NextRequest) {
  const { ids } = await req.json();
  itemsStore.removeMany(ids ?? []);
  return new NextResponse(null, { status: 204 });
}
