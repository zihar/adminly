import { NextRequest, NextResponse } from "next/server";
import { regionsData } from "@/app/api/regions/_data";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const parentId = sp.get("parent[parentId]") ?? "";
  const q = (sp.get("q") ?? "").toLowerCase();
  const rows = regionsData
    .filter((r) => r.parentId === parentId)
    .filter((r) => (q ? r.name.toLowerCase().includes(q) : true));
  return NextResponse.json(rows.map((r) => ({ value: r.id, label: r.name })));
}
