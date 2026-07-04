import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorEnvelope, notFound } from "@/lib/api/handler";

const req = () => new NextRequest("http://localhost/api/x");

describe("withErrorEnvelope", () => {
  it("passes success through unchanged (not enveloped)", async () => {
    const h = withErrorEnvelope(async () => Response.json({ ok: true }));
    const res = await h(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
  it("maps ApiError notFound() to a 404 envelope", async () => {
    const h = withErrorEnvelope(async () => { throw notFound(); });
    const res = await h(req());
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 404, status: "error", data: null });
  });
  it("maps ZodError to a 422 envelope with field errors under data", async () => {
    const schema = z.object({ nama: z.string().min(1) });
    const h = withErrorEnvelope(async () => { schema.parse({ nama: "" }); return Response.json({}); });
    const res = await h(req());
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body).toMatchObject({ code: 422, status: "error" });
    expect(Array.isArray(body.data.nama)).toBe(true);
  });
  it("maps unknown errors to a 500 envelope without leaking details", async () => {
    const h = withErrorEnvelope(async () => { throw new Error("secret stack"); });
    const res = await h(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ code: 500, status: "error", data: null });
    expect(JSON.stringify(body)).not.toContain("secret stack");
  });
});
