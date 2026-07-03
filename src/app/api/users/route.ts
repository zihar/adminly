import { NextResponse } from "next/server";

import { createUser, listUsers } from "@/lib/api/users-store";

export async function GET() {
  return NextResponse.json(listUsers());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.role !== "string"
  ) {
    return NextResponse.json(
      { message: "Invalid user payload" },
      { status: 400 },
    );
  }

  const user = createUser({
    name: body.name,
    email: body.email,
    role: body.role,
  });
  return NextResponse.json(user, { status: 201 });
}
