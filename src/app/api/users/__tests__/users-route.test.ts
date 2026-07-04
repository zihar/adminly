import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/users/route";
import { DELETE } from "@/app/api/users/[id]/route";

describe("users route", () => {
  it("GET mengembalikan daftar user", async () => {
    const res = await GET(new NextRequest("http://localhost/api/users"));
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it("POST body valid membuat user baru (201)", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Budi",
          email: "budi@example.com",
          role: "member",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.name).toBe("Budi");
  });

  it("POST body invalid mengembalikan envelope 422 dgn field errors", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({ name: "", email: "", role: "" }),
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json).toMatchObject({ code: 422, status: "error" });
    expect(json.data).toBeTruthy();
  });

  it("DELETE id yang tidak ada mengembalikan envelope 404", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/users/tidak-ada", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "tidak-ada" }) },
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toMatchObject({ code: 404, status: "error", data: null });
  });
});
