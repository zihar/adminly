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
import { I18nProvider } from "@/components/providers/i18n-provider";
import { ScopeProvider } from "@/components/providers/scope-provider";

// `I18nProvider` memanggil `useRouter()` (untuk `router.refresh()` saat ganti
// locale) — di luar App Router (mis. di test) itu butuh mock manual.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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
// Def kedua khusus uji scoped-create: sama seperti `def` tapi punya `scope`
// (`ResourceForm` harus menempelkan `useScope()` ke payload create-nya).
let scopedDef: ResourceDef;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000/api");
  server.listen();
  const { createResourceApi } = await import("@/lib/crud/create-resource-api") as { createResourceApi: typeof CreateResourceApiType };
  def = defineResource({
    name: "items", path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "nama", labelKey: "items.nama" }],
    form: {
      schema: z.object({ nama: z.string().min(1, "Nama wajib diisi") }),
      layout: [{ tabKey: "umum", fields: ["nama"] }],
      // `labelKey` dot-path → di-resolve ResourceForm lewat `resolveLabel(t, ...)`.
      fields: { nama: { type: "text", labelKey: "items.nama" } },
    },
  });
  scopedDef = defineResource({
    name: "items", path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "nama", labelKey: "items.nama" }],
    scope: ["workspace"],
    form: {
      schema: z.object({ nama: z.string().min(1, "Nama wajib diisi") }),
      layout: [{ tabKey: "umum", fields: ["nama"] }],
      fields: { nama: { type: "text", labelKey: "items.nama" } },
    },
  });
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  // `ResourceForm` memakai `useI18n()` untuk label field & tombol submit, jadi
  // wajib dibungkus `I18nProvider` (locale "en" — lihat resolveLabel/dictionary).
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider initialLocale="en">{ui}</I18nProvider>
    </QueryClientProvider>,
  );
}

// Sama seperti `wrap`, plus `ScopeProvider` berisi scope aktif — dipakai uji
// scoped-create (`ResourceForm` harus menempel `useScope()` ke payload create).
function wrapWithScope(ui: React.ReactNode, initial: Record<string, unknown>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider initialLocale="en">
        <ScopeProvider initial={initial}>{ui}</ScopeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("ResourceForm", () => {
  it("me-resolve labelKey field lewat kamus i18n (bukan raw key)", () => {
    wrap(<ResourceForm def={def} />);
    // labelKey "items.nama" → dict.items.nama ("Name"), bukan string "items.nama".
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.queryByText("items.nama")).not.toBeInTheDocument();
  });

  it("menampilkan error validasi Zod saat submit kosong", async () => {
    wrap(<ResourceForm def={def} />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(await screen.findByText(/Nama wajib diisi/)).toBeInTheDocument();
  });

  it("submit valid memanggil create & onDone", async () => {
    const onDone = vi.fn();
    wrap(<ResourceForm def={def} onDone={onDone} />);
    await userEvent.type(screen.getByLabelText("Name"), "Halo");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("menempelkan scope aktif (workspace) ke payload create, bukan hanya field form", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    server.use(
      http.post("http://localhost:3000/api/items", async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: "x", ...capturedBody }, { status: 201 });
      }),
    );
    const onDone = vi.fn();
    wrapWithScope(<ResourceForm def={scopedDef} onDone={onDone} />, { workspace: "w1" });
    await userEvent.type(screen.getByLabelText("Name"), "Halo");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(capturedBody).toMatchObject({ nama: "Halo", workspace: "w1" });
  });
});
