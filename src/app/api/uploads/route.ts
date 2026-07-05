import { NextRequest, NextResponse } from "next/server";

import { uploadStore } from "@/app/api/_store/upload-store";
import { withErrorEnvelope, badRequest } from "@/lib/api/handler";

export const POST = withErrorEnvelope(async (req: NextRequest) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw badRequest("File wajib diunggah");

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const { id } = uploadStore.save({ name: file.name, type: file.type, base64 });
  return NextResponse.json({ id, url: `/api/uploads/${id}`, name: file.name }, { status: 201 });
});
