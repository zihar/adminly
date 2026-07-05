import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ResourceTable } from "@/components/crud/resource-table";
import { defineResource } from "@/lib/crud/define-resource";
import type { createResourceApi as CreateResourceApiType } from "@/lib/crud/create-resource-api";
import type { ResourceDef } from "@/lib/crud/define-resource";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { RbacProvider } from "@/components/providers/rbac-provider";
import { ScopeProvider } from "@/components/providers/scope-provider";
import type { Role } from "@/config/rbac";
import { downloadBlob, exportPdf } from "@/lib/crud/export";

// `I18nProvider`/`RbacProvider` memanggil `useRouter()` (untuk `router.refresh()`
// saat ganti locale/role) — di luar App Router (mis. di test) itu butuh mock manual.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// `downloadBlob`/`exportPdf` melakukan I/O browser (Blob/anchor/jsPDF) yang tak
// bermakna di jsdom — di-mock jadi spy supaya test cukup memverifikasi ResourceTable
// memanggilnya dgn kolom+baris yang benar. `toCsv` TETAP implementasi asli (lewat
// `importActual`) supaya isi CSV yang dihasilkan (header + nilai baris) bisa diuji.
vi.mock("@/lib/crud/export", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crud/export")>();
  return {
    ...actual,
    downloadBlob: vi.fn(),
    exportPdf: vi.fn(),
  };
});

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
// Def khusus test scope: mendeklarasikan `scope: ["workspaceId"]` supaya
// `ResourceTable` menyuntik nilai dari `ScopeProvider` ke `ListParams.scope`
// (lihat resource-table.tsx, variabel `scopedFilter`). Resource lain (`def`,
// `defPaged`) sengaja TIDAK punya `scope` — memverifikasi injeksi ini murni
// opt-in per resource.
let defScoped: ResourceDef;
// Def khusus test kolom badge & aksi transisi baris: punya `workflow.statuses`
// + `workflow.transitions` (identik dgn konfigurasi resource `items` asli) +
// kolom `{field:"status", render:"badge"}` — memverifikasi `ResourceTable`
// merender `<Badge>` berisi label i18n status (bukan nilai mentah) DAN tombol
// aksi transisi per-baris ter-gate `<Can>` sesuai `from`/`permission`.
let defWorkflow: ResourceDef;
// Def khusus test render kolom non-badge (Task 5): satu kolom per tipe render
// (`date`/`boolean`/`currency`/`image`/`relation`) — memverifikasi cell factory
// `ResourceTable` merender tiap tipe secara benar (bukan fallback `String`
// mentah), termasuk fallback relation ke nilai mentah saat `<field>_label`
// tak ada di baris.
let defRenderers: ResourceDef;
// Def khusus test kontrol filter (Task 2 Filter UI): mendeklarasikan
// `list.filters: ["prioritas"]` + field form `prioritas` bertipe `select`
// dgn `options` statis — memverifikasi `ResourceTable` merender dropdown
// filter (All + opsi), menyinkronnya ke URL (nuqs), dan mengirim
// `filter[prioritas]=<value>` pada request list sungguhan (lewat MSW).
let defFiltered: ResourceDef;

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
  defScoped = defineResource({
    name: "items",
    path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
    list: { perPage: 10 },
    scope: ["workspaceId"],
    form: {
      schema: z.object({ nama: z.string() }),
      layout: [{ tabKey: "umum", fields: ["nama"] }],
      fields: { nama: { type: "text" } },
    },
  });
  defWorkflow = defineResource({
    name: "items",
    path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "status", labelKey: "items.nama", render: "badge" }],
    list: { perPage: 10 },
    form: {
      schema: z.object({ nama: z.string() }),
      layout: [{ tabKey: "umum", fields: ["nama"] }],
      fields: { nama: { type: "text" } },
    },
    workflow: {
      field: "status",
      initial: "draft",
      statuses: [
        { value: "draft", labelKey: "workflow.status.draft" },
        { value: "submitted", labelKey: "workflow.status.submitted" },
        { value: "approved", labelKey: "workflow.status.approved" },
        { value: "rejected", labelKey: "workflow.status.rejected" },
      ],
      transitions: [
        { action: "submit", from: ["draft"], to: "submitted", permission: "items:update", labelKey: "workflow.action.submit" },
        { action: "approve", from: ["submitted"], to: "approved", permission: "items:approve", labelKey: "workflow.action.approve", variant: "default" },
        { action: "reject", from: ["submitted"], to: "rejected", permission: "items:approve", labelKey: "workflow.action.reject", variant: "destructive" },
      ],
    },
  });
  defRenderers = defineResource({
    name: "items",
    path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [
      { field: "tanggal", labelKey: "items.nama", render: "date" },
      { field: "aktif", labelKey: "items.nama", render: "boolean" },
      { field: "harga", labelKey: "items.nama", render: "currency" },
      { field: "foto", labelKey: "items.nama", render: "image" },
      { field: "pemilikId", labelKey: "items.nama", render: "relation" },
    ],
    list: { perPage: 10 },
    form: {
      schema: z.object({ nama: z.string() }),
      layout: [{ tabKey: "umum", fields: ["nama"] }],
      fields: { nama: { type: "text" } },
    },
  });
  defFiltered = defineResource({
    name: "items",
    path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
    list: { perPage: 10, filters: ["prioritas"] },
    form: {
      schema: z.object({ nama: z.string(), prioritas: z.string().optional() }),
      layout: [{ tabKey: "umum", fields: ["nama", "prioritas"] }],
      fields: {
        nama: { type: "text" },
        prioritas: {
          type: "select",
          labelKey: "items.prioritas",
          options: [
            { value: "low", label: "Low" },
            { value: "high", label: "High" },
          ],
        },
      },
    },
  });
});
afterEach(() => {
  server.resetHandlers();
  bulkDeleteBody = undefined;
  vi.mocked(downloadBlob).mockClear();
  vi.mocked(exportPdf).mockClear();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function wrap(
  ui: React.ReactNode,
  opts?: {
    role?: Role;
    onUrlUpdate?: (e: { queryString: string }) => void;
    // Nilai awal `ScopeProvider` — hanya dipasang bila diisi, supaya test
    // tanpa opsi ini tetap memverifikasi fallback `useScope()` tanpa provider
    // (lihat `scope-provider.tsx`: `ctx ?? { scope: {}, ... }`).
    scope?: Record<string, unknown>;
  },
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const content = opts?.scope ? <ScopeProvider initial={opts.scope}>{ui}</ScopeProvider> : ui;
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider initialLocale="en">
        <RbacProvider initialRole={opts?.role ?? "Admin"}>
          {/* `hasMemory`: tanpa ini, NuqsTestingAdapter "membekukan" search params ke
              nilai awal — `setState` di komponen ter-reconcile balik ke default pada
              render berikutnya. `hasMemory: true` mensimulasikan adapter sungguhan
              (browser `history`) yang benar-benar menyimpan update URL. */}
          <NuqsTestingAdapter hasMemory onUrlUpdate={opts?.onUrlUpdate}>
            {content}
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

  it("menyuntik nilai ScopeProvider ke query list sebagai scope[...] di request sungguhan (hanya untuk resource ber-`scope`)", async () => {
    // Tangkap querystring request `/api/items` yang SUNGGUHAN dikirim
    // (lewat MSW), bukan mock fungsi — ini membuktikan rantai
    // ScopeProvider -> useScope -> ResourceTable -> useList -> apiClient
    // -> buildListSearchParams benar-benar nyambung ujung ke ujung.
    let capturedSearch: URLSearchParams | undefined;
    server.use(
      http.get("http://localhost:3000/api/items", ({ request }) => {
        capturedSearch = new URL(request.url).searchParams;
        return HttpResponse.json({
          data: [{ id: "1", nama: "Alpha" }],
          meta: { total: 1, page: 1, per_page: 10 },
        });
      }),
    );

    wrap(<ResourceTable def={defScoped} />, { scope: { workspaceId: 7 } });
    await screen.findByText("Alpha");

    expect(capturedSearch?.get("scope[workspaceId]")).toBe("7");
  });

  it("TIDAK menyuntik scope untuk resource yang tak mendeklarasikan `def.scope`", async () => {
    // Kontrol negatif: `def` (tanpa `scope`) dipakai di dalam ScopeProvider
    // yang sama — pastikan `scope[...]` tidak ikut terkirim walau context-nya
    // tersedia, membuktikan injeksi murni opt-in per resource (bukan global).
    let capturedSearch: URLSearchParams | undefined;
    server.use(
      http.get("http://localhost:3000/api/items", ({ request }) => {
        capturedSearch = new URL(request.url).searchParams;
        return HttpResponse.json({
          data: [{ id: "1", nama: "Alpha" }],
          meta: { total: 1, page: 1, per_page: 10 },
        });
      }),
    );

    wrap(<ResourceTable def={def} />, { scope: { workspaceId: 7 } });
    await screen.findByText("Alpha");

    expect(capturedSearch?.has("scope[workspaceId]")).toBe(false);
  });

  it("TIDAK mengirim `scope[...]` sama sekali saat def.scope dideklarasikan tapi belum ada nilai scope aktif (default state)", async () => {
    // Regresi query-key alignment: sebelum fix, `scopedFilter` selalu berupa
    // objek (`Object.fromEntries([])` == `{}`) walau kosong, sehingga
    // `useList({ scope: {} })` menghasilkan query key BEDA dari prefetch RSC
    // (`initialListParams` yang men-drop `scope` seluruhnya bila kosong) —
    // cache prefetch terbuang & skeleton berkedip. Tes ini membuktikan pada
    // request SUNGGUHAN (lewat MSW) bahwa default no-scope state (baik tanpa
    // `<ScopeProvider>` sama sekali maupun dgn scope objek kosong) tak pernah
    // mengirim param `scope[...]` — sama seperti resource tanpa `def.scope`.
    let capturedSearch: URLSearchParams | undefined;
    server.use(
      http.get("http://localhost:3000/api/items", ({ request }) => {
        capturedSearch = new URL(request.url).searchParams;
        return HttpResponse.json({
          data: [{ id: "1", nama: "Alpha" }],
          meta: { total: 1, page: 1, per_page: 10 },
        });
      }),
    );

    // Tanpa `scope` opt di `wrap` → tanpa `<ScopeProvider>` sama sekali,
    // `useScope()` fallback ke `{ scope: {}, setScope: () => {} }`.
    wrap(<ResourceTable def={defScoped} />);
    await screen.findByText("Alpha");

    expect(capturedSearch?.has("scope[workspaceId]")).toBe(false);
    expect([...(capturedSearch?.keys() ?? [])].some((k) => k.startsWith("scope["))).toBe(false);
  });

  it("merender kolom `render: \"badge\"` sebagai <Badge> berisi label i18n status (bukan nilai mentah)", async () => {
    server.use(
      http.get("http://localhost:3000/api/items", () =>
        HttpResponse.json({
          data: [{ id: "1", status: "submitted" }],
          meta: { total: 1, page: 1, per_page: 10 },
        }),
      ),
    );

    wrap(<ResourceTable def={defWorkflow} />);

    expect(await screen.findByText("Submitted")).toBeInTheDocument();
    expect(screen.queryByText("submitted")).not.toBeInTheDocument();
  });

  it("menampilkan tombol aksi transisi yang diizinkan dari status baris (gated <Can>), TIDAK menampilkan yang tak diizinkan", async () => {
    // Baris "submitted" -> transisi diizinkan: approve+reject (butuh
    // `items:approve`, dipunyai Admin). Baris "approved" -> tak ada transisi
    // (`from` tak ada yg memuat "approved") sehingga TIDAK ada tombol aksi.
    server.use(
      http.get("http://localhost:3000/api/items", () =>
        HttpResponse.json({
          data: [
            { id: "1", status: "submitted" },
            { id: "2", status: "approved" },
          ],
          meta: { total: 2, page: 1, per_page: 10 },
        }),
      ),
    );

    wrap(<ResourceTable def={defWorkflow} />, { role: "Admin" });

    // Tunggu data sungguhan (bukan skeleton loading) sebelum memetik baris —
    // `findAllByRole("row")` tanpa ini bisa resolve ke baris skeleton tunggal.
    await screen.findByText("Submitted");
    const rows = screen.getAllByRole("row");
    // rows[0] = header; rows[1] = baris "submitted"; rows[2] = baris "approved".
    const submittedRow = rows[1];
    const approvedRow = rows[2];

    expect(within(submittedRow).getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(within(submittedRow).getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(within(approvedRow).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(within(approvedRow).queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("klik tombol transisi memanggil endpoint transisi (MSW) dan menampilkan toast sukses", async () => {
    server.use(
      http.get("http://localhost:3000/api/items", () =>
        HttpResponse.json({
          data: [{ id: "1", status: "submitted" }],
          meta: { total: 1, page: 1, per_page: 10 },
        }),
      ),
    );
    let transitionBody: { action: string } | undefined;
    server.use(
      http.post("http://localhost:3000/api/items/:id/transition", async ({ request, params }) => {
        transitionBody = (await request.json()) as { action: string };
        return HttpResponse.json({ id: params.id, status: "approved" });
      }),
    );

    // Harness tak memasang `<Toaster/>` (lihat `wrap()` di atas) — panggilan
    // `sonner` tak pernah muncul di DOM tanpa itu, jadi verifikasi toast
    // lewat spy pada modul `sonner`, bukan query teks.
    const successSpy = vi.spyOn(toast, "success");
    const user = userEvent.setup();
    wrap(<ResourceTable def={defWorkflow} />, { role: "Admin" });

    const approveButton = await screen.findByRole("button", { name: "Approve" });
    await user.click(approveButton);

    await waitFor(() => expect(transitionBody).toEqual({ action: "approve" }));
    await waitFor(() => expect(successSpy).toHaveBeenCalledWith("Done"));
    successSpy.mockRestore();
  });

  it("merender kolom date/boolean/currency/image/relation sesuai `render` masing-masing (bukan `String` mentah)", async () => {
    server.use(
      http.get("http://localhost:3000/api/items", () =>
        HttpResponse.json({
          data: [
            {
              id: "1",
              tanggal: "2024-01-15T00:00:00.000Z",
              aktif: true,
              harga: 1234.5,
              foto: "https://example.com/img.png",
              pemilikId: "5",
              pemilikId_label: "Alice",
            },
          ],
          meta: { total: 1, page: 1, per_page: 10 },
        }),
      ),
    );

    wrap(<ResourceTable def={defRenderers} />);
    await screen.findByText("Alice");

    // `date`: diformat lewat `Date#toLocaleDateString()` yang sama dgn
    // implementasi — deterministik di proses test yang sama, terlepas locale
    // OS/CI (bukan mengasumsikan format string tertentu).
    const expectedDate = new Date("2024-01-15T00:00:00.000Z").toLocaleDateString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();

    // `boolean`: label i18n (bukan "true"/"false" mentah).
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.queryByText("true")).not.toBeInTheDocument();

    // `currency`: format `Intl.NumberFormat` (USD, generik/demo).
    const expectedCurrency = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(1234.5);
    expect(screen.getByText(expectedCurrency)).toBeInTheDocument();

    // `image`: elemen `<img>` sungguhan dgn `src` dari nilai sel.
    // `alt=""` (dekoratif) → dicari lewat `getByAltText("")`, BUKAN
    // `getByRole("img")` (img ber-`alt=""` di-map ke role "presentation").
    const img = screen.getByAltText("");
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "https://example.com/img.png");

    // `relation`: pakai `<field>_label` yang didenormalisasi di baris, BUKAN
    // nilai id mentah.
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
  });

  it("merender boolean `false` sbg \"No\" dan `relation` fallback ke nilai mentah saat `<field>_label` tak ada di baris", async () => {
    server.use(
      http.get("http://localhost:3000/api/items", () =>
        HttpResponse.json({
          data: [
            {
              id: "1",
              tanggal: "",
              aktif: false,
              harga: 0,
              foto: "",
              pemilikId: "7",
            },
          ],
          meta: { total: 1, page: 1, per_page: 10 },
        }),
      ),
    );

    wrap(<ResourceTable def={defRenderers} />);

    expect(await screen.findByText("No")).toBeInTheDocument();
    // Tanpa `pemilikId_label` → fallback ke nilai id mentah.
    expect(screen.getByText("7")).toBeInTheDocument();
    // `foto` kosong → tak ada `<img>` yang dirender.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("klik Export -> CSV mengambil SEMUA baris (perPage besar) lalu memanggil downloadBlob dgn CSV berisi header+nilai baris", async () => {
    // Tangkap querystring request `/api/items` yang dipicu ekspor — harus
    // membawa `per_page` besar & `page=1` (fetch semua baris cocok filter),
    // TERPISAH dari request awal daftar (perPage 10 punya `def`).
    const capturedSearches: URLSearchParams[] = [];
    server.use(
      http.get("http://localhost:3000/api/items", ({ request }) => {
        capturedSearches.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          data: [
            { id: "1", nama: "Alpha" },
            { id: "2", nama: "Beta" },
          ],
          meta: { total: 2, page: 1, per_page: 10 },
        });
      }),
    );

    const user = userEvent.setup();
    wrap(<ResourceTable def={def} />);
    await screen.findByText("Alpha");

    const exportTrigger = screen.getByRole("button", { name: "Export" });
    await user.click(exportTrigger);
    const csvItem = await screen.findByRole("menuitem", { name: "Export as CSV" });
    await user.click(csvItem);

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    const [filename, mime, content] = vi.mocked(downloadBlob).mock.calls[0];
    expect(filename).toBe("items.csv");
    expect(mime).toContain("text/csv");
    expect(String(content)).toContain("Name");
    expect(String(content)).toContain("Alpha");
    expect(String(content)).toContain("Beta");

    // Request ekspor (panggilan terakhir) membawa perPage besar & page=1 —
    // membuktikan ekspor mengambil semua baris cocok filter, bukan halaman aktif.
    const exportSearch = capturedSearches.at(-1);
    expect(exportSearch?.get("per_page")).toBe("10000");
    expect(exportSearch?.get("page")).toBe("1");
  });

  it("klik Export -> PDF memanggil exportPdf dgn kolom+baris hasil fetch", async () => {
    server.use(
      http.get("http://localhost:3000/api/items", () =>
        HttpResponse.json({
          data: [{ id: "1", nama: "Alpha" }],
          meta: { total: 1, page: 1, per_page: 10 },
        }),
      ),
    );

    const user = userEvent.setup();
    wrap(<ResourceTable def={def} />);
    await screen.findByText("Alpha");

    await user.click(screen.getByRole("button", { name: "Export" }));
    const pdfItem = await screen.findByRole("menuitem", { name: "Export as PDF" });
    await user.click(pdfItem);

    await waitFor(() => expect(exportPdf).toHaveBeenCalledTimes(1));
    const [cols, rows, title, filename] = vi.mocked(exportPdf).mock.calls[0];
    expect(cols).toEqual([{ header: "Name", field: "nama" }]);
    expect(rows).toEqual([{ id: "1", nama: "Alpha" }]);
    expect(title).toBe("items");
    expect(filename).toBe("items.pdf");
  });

  it("menampilkan toast error saat fetch ekspor gagal (tak melempar/crash)", async () => {
    server.use(
      http.get("http://localhost:3000/api/items", ({ request }) => {
        const url = new URL(request.url);
        // Request awal daftar (perPage kecil) tetap sukses; request ekspor
        // (perPage besar) sengaja gagal utk menguji jalur error.
        if (url.searchParams.get("per_page") === "10000") {
          return HttpResponse.json({ message: "boom" }, { status: 500 });
        }
        return HttpResponse.json({
          data: [{ id: "1", nama: "Alpha" }],
          meta: { total: 1, page: 1, per_page: 10 },
        });
      }),
    );
    const errorSpy = vi.spyOn(toast, "error");
    const user = userEvent.setup();
    wrap(<ResourceTable def={def} />);
    await screen.findByText("Alpha");

    await user.click(screen.getByRole("button", { name: "Export" }));
    const csvItem = await screen.findByRole("menuitem", { name: "Export as CSV" });
    await user.click(csvItem);

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith("Failed to export data"));
    expect(downloadBlob).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("merender dropdown filter (All + opsi statis field) utk tiap `def.list.filters`, memilih opsi mengirim `filter[prioritas]=<value>` (URL+request sungguhan) dan menyempitkan hasil, memilih All menghapusnya lagi", async () => {
    const capturedSearches: URLSearchParams[] = [];
    server.use(
      http.get("http://localhost:3000/api/items", ({ request }) => {
        const url = new URL(request.url);
        capturedSearches.push(url.searchParams);
        const filterPrioritas = url.searchParams.get("filter[prioritas]");
        const all = [
          { id: "1", nama: "Alpha", prioritas: "low" },
          { id: "2", nama: "Beta", prioritas: "high" },
        ];
        const rows = filterPrioritas ? all.filter((r) => r.prioritas === filterPrioritas) : all;
        return HttpResponse.json({
          data: rows,
          meta: { total: rows.length, page: 1, per_page: 10 },
        });
      }),
    );

    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    wrap(<ResourceTable def={defFiltered} />, { onUrlUpdate });
    await screen.findByText("Alpha");
    expect(screen.getByText("Beta")).toBeInTheDocument();

    // Dropdown filter di-label via `resolveLabel(t, meta.labelKey)` ("items.prioritas" -> "Priority").
    const filterSelect = screen.getByLabelText("Priority") as HTMLSelectElement;
    // Opsi "All" (t.common.all) + opsi statis field (Low/High).
    expect(within(filterSelect).getByRole("option", { name: "All" })).toBeInTheDocument();
    expect(within(filterSelect).getByRole("option", { name: "Low" })).toBeInTheDocument();
    expect(within(filterSelect).getByRole("option", { name: "High" })).toBeInTheDocument();

    await user.selectOptions(filterSelect, "high");

    await waitFor(() => expect(screen.queryByText("Alpha")).not.toBeInTheDocument());
    expect(screen.getByText("Beta")).toBeInTheDocument();
    const filteredSearch = capturedSearches.at(-1);
    expect(filteredSearch?.get("filter[prioritas]")).toBe("high");
    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)?.[0] as { queryString: string };
      expect(last.queryString).toContain("filter_prioritas=high");
    });

    // Pilih "All" lagi -> filter dihapus dari URL & request, kedua baris kembali.
    await user.selectOptions(filterSelect, "");

    await waitFor(() => expect(screen.getByText("Alpha")).toBeInTheDocument());
    expect(screen.getByText("Beta")).toBeInTheDocument();
    const clearedSearch = capturedSearches.at(-1);
    expect(clearedSearch?.has("filter[prioritas]")).toBe(false);
    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)?.[0] as { queryString: string };
      expect(last.queryString).not.toContain("filter_prioritas");
    });
  });

  it("resource tanpa `def.list.filters` TIDAK merender dropdown filter apa pun", async () => {
    wrap(<ResourceTable def={def} />);
    await screen.findByText("Alpha");
    expect(screen.queryByLabelText("Priority")).not.toBeInTheDocument();
  });
});
