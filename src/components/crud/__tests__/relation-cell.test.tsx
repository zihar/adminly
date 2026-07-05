import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { z } from "zod";
import { RelationCell } from "@/components/crud/relation-cell";
import { registerResources, _resetRegistry } from "@/config/resources/index";
import type { defineResource as DefineResourceType } from "@/lib/crud/define-resource";
import type { createResourceApi as CreateResourceApiType } from "@/lib/crud/create-resource-api";

// `apiClient` menangkap `globalThis.fetch`/base URL saat modulnya pertama kali
// dievaluasi, jadi `createResourceApi`/`defineResource` wajib di-import dinamis
// SETELAH `server.listen()`/env var di-set (pola sama dgn cascade-field.test.tsx
// & resource-table.test.tsx).
const server = setupServer(
  http.get("http://localhost:3000/api/regions/options", () =>
    HttpResponse.json([{ value: "r1", label: "Jawa Barat" }]),
  ),
);

function renderCell(props: { resource?: string; value: unknown; denormLabel?: unknown }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RelationCell {...props} />
    </QueryClientProvider>,
  );
}

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000/api");
  server.listen();
  const { createResourceApi } = (await import("@/lib/crud/create-resource-api")) as {
    createResourceApi: typeof CreateResourceApiType;
  };
  const { defineResource } = (await import("@/lib/crud/define-resource")) as {
    defineResource: typeof DefineResourceType;
  };
  registerResources([
    defineResource({
      name: "regions",
      path: "/regions",
      api: createResourceApi({ resource: "regions", path: "/regions" }),
      permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
      columns: [{ field: "name", labelKey: "regions.name" }],
      form: {
        schema: z.object({ name: z.string() }),
        layout: [{ tabKey: "umum", fields: ["name"] }],
        fields: { name: { type: "text" } },
      },
    }),
  ]);
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
  _resetRegistry();
});

describe("RelationCell", () => {
  it("resolve id->label lewat useOptions resource sumber saat tak ada `_label` denormalisasi", async () => {
    renderCell({ resource: "regions", value: "r1" });

    expect(await screen.findByText("Jawa Barat")).toBeInTheDocument();
    expect(screen.queryByText("r1")).not.toBeInTheDocument();
  });

  it("`denormLabel` menang tanpa perlu fetch, walau `resource` diset", async () => {
    renderCell({ resource: "regions", value: "r1", denormLabel: "Sudah" });

    expect(screen.getByText("Sudah")).toBeInTheDocument();
    // Fetch options tetap boleh terjadi di background pada implementasi lain,
    // tapi kontrak yang diuji di sini murni: label denormalisasi tampil SEGERA
    // (tanpa menunggu `findByText`/async) — bukti tak ada gating pada fetch.
    expect(screen.queryByText("r1")).not.toBeInTheDocument();
  });

  it("fallback ke nilai mentah saat id tak ditemukan di options (setelah load) meski `resource` diset", async () => {
    renderCell({ resource: "regions", value: "tak-ada" });

    // Tunggu fetch options selesai (label "Jawa Barat" utk resource lain akan
    // termuat), lalu pastikan nilai mentah tetap tampil krn tak ada match.
    await waitFor(() => expect(screen.queryByText("...")).not.toBeInTheDocument());
    expect(await screen.findByText("tak-ada")).toBeInTheDocument();
  });

  it("tampil nilai mentah tanpa fetch saat `resource` tak diset", () => {
    renderCell({ value: "r1" });

    expect(screen.getByText("r1")).toBeInTheDocument();
  });

  it("nilai null/undefined tanpa `resource` dirender sbg string kosong (bukan \"null\"/\"undefined\")", () => {
    const { container } = renderCell({ value: null });
    expect(container.textContent).toBe("");
  });
});
