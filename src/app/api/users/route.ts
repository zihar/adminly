import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createUser, listUsers } from "@/lib/api/users-store";
import { withErrorEnvelope } from "@/lib/api/handler";

// Skema payload user — invalid → ZodError → 422 lewat withErrorEnvelope.
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  role: z.string().min(1),
});

export const GET = withErrorEnvelope(async () => {
  return NextResponse.json(listUsers());
});

export const POST = withErrorEnvelope(async (req: NextRequest) => {
  const body = userSchema.parse(await req.json());
  const user = createUser(body);
  return NextResponse.json(user, { status: 201 });
});
