import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { z } from "zod";
import { ResourceForm } from "@/components/crud/resource-form";
import { defineResource } from "@/lib/crud/define-resource";
import type { createResourceApi as CreateResourceApiType } from "@/lib/crud/create-resource-api";
import type { ResourceDef } from "@/lib/crud/define-resource";

const server = setupServer(
  http.post("http://localhost:3000/api/items", async ({ request }) => {
    const body = (await request.json()) as { nama: string };
    if (!body.nama) return HttpResponse.json({ message: "Validasi gagal", errors: { nama: ["wajib diisi"] } }, { status: 422 });
    return HttpResponse.json({ id: "x", nama: body.nama }, { status: 201 });
  }),
);

// `apiClient` (src/lib/api/client.ts) menangkap `globalThis.fetch` dan
// meng-resolve base URL saat modulnya pertama kali dievaluasi (lihat catatan
// yang sama di create-resource-api.test.ts). Karena itu `createResourceApi`
// harus di-import secara dinamis SETELAH `server.listen()` (MSW menambal
// fetch) dan env var di-set — bukan lewat static import di atas.
let def: ResourceDef;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000/api");
  server.listen();
  const { createResourceApi } = await import("@/lib/crud/create-resource-api") as { createResourceApi: typeof CreateResourceApiType };
  def = defineResource({
    name: "items", path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "nama", labelKey: "items.nama" }],
    form: { schema: z.object({ nama: z.string().min(1, "Nama wajib diisi") }), layout: [{ tabKey: "umum", fields: ["nama"] }], fields: { nama: { type: "text" } } },
  });
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ResourceForm", () => {
  it("menampilkan error validasi Zod saat submit kosong", async () => {
    wrap(<ResourceForm def={def} />);
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));
    expect(await screen.findByText(/Nama wajib diisi/)).toBeInTheDocument();
  });

  it("submit valid memanggil create & onDone", async () => {
    const onDone = vi.fn();
    wrap(<ResourceForm def={def} onDone={onDone} />);
    await userEvent.type(screen.getByRole("textbox"), "Halo");
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});
