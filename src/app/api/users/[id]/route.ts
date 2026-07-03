import { NextResponse, type NextRequest } from "next/server";

import { deleteUser } from "@/lib/api/users-store";

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/users/[id]">,
) {
  const { id } = await ctx.params;
  const removed = deleteUser(id);
  if (!removed) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
