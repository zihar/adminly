import { NextResponse, type NextRequest } from "next/server";

import { deleteUser } from "@/lib/api/users-store";
import { withErrorEnvelope, notFound } from "@/lib/api/handler";

export const DELETE = withErrorEnvelope(
  async (_request: NextRequest, ctx?: RouteContext<"/api/users/[id]">) => {
    const { id } = await ctx!.params;
    const removed = deleteUser(id);
    if (!removed) throw notFound();
    return new NextResponse(null, { status: 204 });
  },
);
