import { NextRequest, NextResponse } from "next/server";

import { itemsStore } from "@/app/api/items/_data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = itemsStore.get(id);
  return row
    ? NextResponse.json(row)
    : NextResponse.json({ message: "Tidak ditemukan" }, { status: 404 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = itemsStore.update(id, await req.json());
  return row
    ? NextResponse.json(row)
    : NextResponse.json({ message: "Tidak ditemukan" }, { status: 404 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  itemsStore.remove(id);
  return new NextResponse(null, { status: 204 });
}
