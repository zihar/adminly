import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { z } from "zod";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ResourceTable } from "@/components/crud/resource-table";
import { defineResource } from "@/lib/crud/define-resource";
import type { createResourceApi as CreateResourceApiType } from "@/lib/crud/create-resource-api";
import type { ResourceDef } from "@/lib/crud/define-resource";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { RbacProvider } from "@/components/providers/rbac-provider";
import type { Role } from "@/config/rbac";

// `I18nProvider`/`RbacProvider` memanggil `useRouter()` (untuk `router.refresh()`
// saat ganti locale/role) — di luar App Router (mis. di test) itu butuh mock manual.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

let bulkDeleteBody: { ids: string[] } | undefined;

const server = setupServer(
  http.get("http://localhost:3000/api/items", ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const sort = url.searchParams.get("sort");
    const order = url.searchParams.get("order");
    if (q === "beta") {
      return HttpResponse.json({
        data: [{ id: "2", nama: "Beta" }],
        meta: { total: 1, page: 1, per_page: 10 },
      });
    }
    const rows = [
      { id: "1", nama: "Alpha" },
      { id: "2", nama: "Beta" },
    ];
    if (sort === "nama" && order === "desc") rows.reverse();
    return HttpResponse.json({
      data: rows,
      meta: { total: rows.length, page: 1, per_page: 10 },
    });
  }),
  http.post("http://localhost:3000/api/items/bulk-delete", async ({ request }) => {
    bulkDeleteBody = (await request.json()) as { ids: string[] };
    return HttpResponse.json(undefined, { status: 200 });
  }),
);

// `apiClient` menangkap `globalThis.fetch` & base URL saat modulnya pertama kali
// dievaluasi, jadi `createResourceApi` wajib di-import dinamis SETELAH
// `server.listen()`/env var di-set (lihat catatan sama di resource-form.test.tsx).
let def: ResourceDef;
// Def khusus test pagination: `perPage` kecil (2) supaya dataset 4 baris
// benar-benar terbagi 2 halaman (fixture default 2 baris/perPage 10 di atas
// membuat tombol Next selalu disabled).
let defPaged: ResourceDef;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:3000/api");
  server.listen();
  const { createResourceApi } = (await import("@/lib/crud/create-resource-api")) as {
    createResourceApi: typeof CreateResourceApiType;
  };
  def = defineResource({
    name: "items",
    path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
    list: { perPage: 10 },
    form: {
      schema: z.object({ nama: z.string() }),
      layout: [{ tabKey: "umum", fields: ["nama"] }],
      fields: { nama: { type: "text" } },
    },
  });
  defPaged = defineResource({
    name: "items",
    path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
    list: { perPage: 2 },
    form: {
      schema: z.object({ nama: z.string() }),
      layout: [{ tabKey: "umum", fields: ["nama"] }],
      fields: { nama: { type: "text" } },
    },
  });
});
afterEach(() => {
  server.resetHandlers();
  bulkDeleteBody = undefined;
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function wrap(ui: React.ReactNode, opts?: { role?: Role; onUrlUpdate?: (e: { queryString: string }) => void }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider initialLocale="en">
        <RbacProvider initialRole={opts?.role ?? "Admin"}>
          {/* `hasMemory`: tanpa ini, NuqsTestingAdapter "membekukan" search params ke
              nilai awal — `setState` di komponen ter-reconcile balik ke default pada
              render berikutnya. `hasMemory: true` mensimulasikan adapter sungguhan
              (browser `history`) yang benar-benar menyimpan update URL. */}
          <NuqsTestingAdapter hasMemory onUrlUpdate={opts?.onUrlUpdate}>
            {ui}
          </NuqsTestingAdapter>
        </RbacProvider>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("ResourceTable", () => {
  it("merender baris dari server", async () => {
    wrap(<ResourceTable def={def} />);
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("me-resolve labelKey kolom lewat kamus i18n (bukan raw key)", async () => {
    wrap(<ResourceTable def={def} />);
    await screen.findByText("Alpha");
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.queryByText("items.nama")).not.toBeInTheDocument();
  });

  it("menyembunyikan tombol Tambah & Edit untuk role tanpa permission, menampilkan untuk Admin", async () => {
    const { unmount } = wrap(<ResourceTable def={def} />, { role: "Viewer" });
    await screen.findByText("Alpha");
    expect(screen.queryByRole("link", { name: "Create" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    unmount();

    wrap(<ResourceTable def={def} />, { role: "Admin" });
    await screen.findByText("Alpha");
    expect(screen.getByRole("link", { name: "Create" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Edit" }).length).toBeGreaterThan(0);
  });

  it("pilih baris lalu hapus massal memanggil bulk-delete dan mengosongkan seleksi", async () => {
    const user = userEvent.setup();
    wrap(<ResourceTable def={def} />);
    await screen.findByText("Alpha");

    const checkbox = screen.getByRole("checkbox", { name: "Select row 1" });
    await user.click(checkbox);
    const deleteButton = await screen.findByRole("button", { name: "Delete (1)" });
    await user.click(deleteButton);

    await waitFor(() => expect(bulkDeleteBody).toEqual({ ids: ["1"] }));
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it("mengetik lalu Enter pada pencarian meng-update state URL (nuqs) dan hasil", async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    wrap(<ResourceTable def={def} />, { onUrlUpdate });
    await screen.findByText("Alpha");

    const search = screen.getByPlaceholderText("Search...");
    await user.type(search, "beta{enter}");

    await waitFor(() => expect(screen.queryByText("Alpha")).not.toBeInTheDocument());
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(onUrlUpdate).toHaveBeenCalled();
    const lastCall = onUrlUpdate.mock.calls.at(-1)?.[0] as { queryString: string };
    expect(lastCall.queryString).toContain("q=beta");
  });

  it("klik header kolom sortable meng-update sort/order di URL DAN mengubah urutan baris di DOM", async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    wrap(<ResourceTable def={def} />, { onUrlUpdate });
    await screen.findByText("Alpha");

    const header = screen.getByRole("button", { name: "Name" });

    // Klik pertama: unsorted -> asc. `order=asc` adalah nilai default nuqs
    // sehingga TIDAK dicetak di querystring (nuqs membuang param yang sama
    // dengan default) — order dikonfirmasi lewat indikator visual (▲) &
    // absennya `order=desc`. Mock server hanya membalik baris untuk
    // `order=desc`, jadi urutan baris (Alpha, Beta) belum berubah di sini.
    await user.click(header);
    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)?.[0] as { queryString: string };
      expect(last.queryString).toContain("sort=nama");
      expect(last.queryString).not.toContain("order=desc");
    });
    expect(header).toHaveTextContent("▲");
    let dataRows = screen.getAllByRole("row").slice(1);
    expect(dataRows[0]).toHaveTextContent("Alpha");
    expect(dataRows[1]).toHaveTextContent("Beta");

    // Klik kedua: asc -> desc. Server membalik baris untuk `order=desc`, jadi
    // urutan tampilan di DOM harus benar-benar berbalik (Beta lalu Alpha).
    await user.click(header);
    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)?.[0] as { queryString: string };
      expect(last.queryString).toContain("sort=nama");
      expect(last.queryString).toContain("order=desc");
    });
    expect(header).toHaveTextContent("▼");
    await waitFor(() => {
      dataRows = screen.getAllByRole("row").slice(1);
      expect(dataRows[0]).toHaveTextContent("Beta");
      expect(dataRows[1]).toHaveTextContent("Alpha");
    });
  });

  it("navigasi Next/Previous mengubah page di URL, memicu refetch, dan mengganti baris yang tampil", async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    // Override handler khusus test ini: dataset 4 baris, dipaginasi sungguhan
    // lewat `page`/`per_page` supaya Next benar-benar aktif (beda dari fixture
    // 2 baris default yang membuat Next selalu disabled).
    server.use(
      http.get("http://localhost:3000/api/items", ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? "1");
        const perPage = Number(url.searchParams.get("per_page") ?? "10");
        const all = [
          { id: "1", nama: "Alpha" },
          { id: "2", nama: "Beta" },
          { id: "3", nama: "Gamma" },
          { id: "4", nama: "Delta" },
        ];
        const start = (page - 1) * perPage;
        return HttpResponse.json({
          data: all.slice(start, start + perPage),
          meta: { total: all.length, page, per_page: perPage },
        });
      }),
    );
    wrap(<ResourceTable def={defPaged} />, { onUrlUpdate });

    await screen.findByText("Alpha");
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();

    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(previous).toBeDisabled();
    expect(next).not.toBeDisabled();

    await user.click(next);

    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)?.[0] as { queryString: string };
      expect(last.queryString).toContain("page=2");
    });
    await screen.findByText("Gamma");
    expect(screen.getByText("Delta")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    expect(previous).not.toBeDisabled();
    expect(next).toBeDisabled();

    const urlUpdatesBeforePrevious = onUrlUpdate.mock.calls.length;
    await user.click(previous);

    // `page=1` adalah default nuqs sehingga dibuang dari querystring (bukan
    // dicetak eksplisit) — cukup pastikan nuqs benar-benar mencatat update
    // (bukan diam saja) dan bahwa param `page=2` sudah tidak ada lagi.
    await waitFor(() => expect(onUrlUpdate.mock.calls.length).toBeGreaterThan(urlUpdatesBeforePrevious));
    const afterPrevious = onUrlUpdate.mock.calls.at(-1)?.[0] as { queryString: string };
    expect(afterPrevious.queryString).not.toContain("page=2");
    await screen.findByText("Alpha");
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(previous).toBeDisabled();
    expect(next).not.toBeDisabled();
  });
});
