import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { z } from "zod";
import * as React from "react";
import { CascadeField } from "@/components/crud/fields/cascade-field";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { registerResources, _resetRegistry } from "@/config/resources/index";
import type { FieldMeta, defineResource as DefineResourceType } from "@/lib/crud/define-resource";
import type { createResourceApi as CreateResourceApiType } from "@/lib/crud/create-resource-api";

// `I18nProvider` memanggil `useRouter()` (untuk `router.refresh()` saat ganti
// locale) — di luar App Router (mis. di test) itu butuh mock manual.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Fixture hierarki generik 3 level (country → state → city), mirip
// `src/app/api/regions/_data.ts` tapi disalin lokal supaya test ini tak
// bergantung pada data mock resource `regions` yang nyata.
type RegionRow = { id: string; name: string; parentId: string };
const regionsFixture: RegionRow[] = [
  { id: "c1", name: "Country A", parentId: "" },
  { id: "c2", name: "Country B", parentId: "" },
  { id: "s1", name: "State A1", parentId: "c1" },
  { id: "s2", name: "State A2", parentId: "c1" },
  { id: "s3", name: "State B1", parentId: "c2" },
  { id: "t1", name: "City A1a", parentId: "s1" },
];

const server = setupServer(
  http.get("http://localhost:3000/api/regions/options", ({ request }) => {
    const url = new URL(request.url);
    const parentId = url.searchParams.get("parent[parentId]") ?? "";
    const rows = regionsFixture.filter((r) => r.parentId === parentId);
    return HttpResponse.json(rows.map((r) => ({ value: r.id, label: r.name })));
  }),
);

// Meta `cascade` 3 level, semua bersumber dari resource "regions" — dipakai
// tiap test lewat `renderHarness()`.
const cascadeMeta: FieldMeta = {
  type: "cascade",
  cascade: [
    { key: "country", labelKey: "regions.country", optionsFrom: "regions" },
    { key: "state", labelKey: "regions.state", optionsFrom: "regions" },
    { key: "city", labelKey: "regions.city", optionsFrom: "regions" },
  ],
};

function RegionProbe() {
  const country = useWatch({ name: "country" });
  const state = useWatch({ name: "state" });
  const city = useWatch({ name: "city" });
  return (
    <div>
      <span data-testid="country-value">{String(country ?? "")}</span>
      <span data-testid="state-value">{String(state ?? "")}</span>
      <span data-testid="city-value">{String(city ?? "")}</span>
    </div>
  );
}

function Harness({ defaultValues }: { defaultValues: Record<string, string> }) {
  const form = useForm({ defaultValues });
  return (
    <FormProvider {...form}>
      <CascadeField name="region" meta={cascadeMeta} />
      <RegionProbe />
    </FormProvider>
  );
}

function renderHarness(defaultValues: Record<string, string> = { country: "", state: "", city: "" }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider initialLocale="en">
        <Harness defaultValues={defaultValues} />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

// `apiClient` (src/lib/api/client.ts) menangkap `globalThis.fetch` dan
// meng-resolve base URL saat modulnya pertama kali dievaluasi — jadi
// `createResourceApi`/`defineResource` wajib di-import dinamis SETELAH
// `server.listen()` + env var di-set (lihat catatan sama di
// create-resource-api.test.ts / resource-form.test.tsx).
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
      form: { schema: z.object({ name: z.string() }), layout: [{ tabKey: "umum", fields: ["name"] }], fields: { name: { type: "text" } } },
    }),
  ]);
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
  _resetRegistry();
});

describe("CascadeField", () => {
  it("level lebih dalam (state) kosong & disabled sebelum level induknya (country) dipilih", () => {
    renderHarness();
    const stateSelect = screen.getByLabelText(/state/i) as HTMLSelectElement;
    expect(stateSelect).toBeDisabled();
    // Hanya opsi placeholder ("-- select --"), belum ada anak.
    expect(within(stateSelect).getAllByRole("option")).toHaveLength(1);
  });

  it("menampilkan opsi anak (state) setelah country c1 dipilih", async () => {
    renderHarness();
    const countrySelect = screen.getByLabelText(/country/i) as HTMLSelectElement;
    // Opsi root (country) sendiri datang dari fetch async — tunggu itu resolve
    // dulu supaya `<option value="c1">` benar-benar ada sebelum dipilih
    // (native `<select>.value = ...` diam-diam no-op jika opsi belum ada).
    await waitFor(() => expect(within(countrySelect).getAllByRole("option")).toHaveLength(3));
    fireEvent.change(countrySelect, { target: { value: "c1" } });

    const stateSelect = screen.getByLabelText(/state/i) as HTMLSelectElement;
    await waitFor(() => {
      expect(within(stateSelect).getAllByRole("option")).toHaveLength(3); // placeholder + s1 + s2
    });
    expect(within(stateSelect).getByText("State A1")).toBeInTheDocument();
    expect(within(stateSelect).getByText("State A2")).toBeInTheDocument();
  });

  it("mereset state & city ke string kosong saat country diganti", async () => {
    renderHarness();
    const countrySelect = screen.getByLabelText(/country/i) as HTMLSelectElement;
    await waitFor(() => expect(within(countrySelect).getAllByRole("option")).toHaveLength(3));
    fireEvent.change(countrySelect, { target: { value: "c1" } });

    const stateSelect = screen.getByLabelText(/state/i) as HTMLSelectElement;
    await waitFor(() => expect(within(stateSelect).getAllByRole("option")).toHaveLength(3));
    fireEvent.change(stateSelect, { target: { value: "s1" } });
    expect(screen.getByTestId("state-value")).toHaveTextContent("s1");

    fireEvent.change(countrySelect, { target: { value: "c2" } });
    expect(screen.getByTestId("state-value")).toHaveTextContent("");
    expect(screen.getByTestId("city-value")).toHaveTextContent("");
  });

  it("tidak menghapus prefill edit-mode (semua level terisi) saat mount pertama", () => {
    renderHarness({ country: "c1", state: "s1", city: "t1" });
    expect(screen.getByTestId("country-value")).toHaveTextContent("c1");
    expect(screen.getByTestId("state-value")).toHaveTextContent("s1");
    expect(screen.getByTestId("city-value")).toHaveTextContent("t1");
  });
});
