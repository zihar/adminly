import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useForm, FormProvider, useFormState, useWatch } from "react-hook-form";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { AsyncSelectField } from "@/components/crud/fields/async-select-field";
import { TextField } from "@/components/crud/fields/text-field";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { getResource } from "@/config/resources/index";
import { fetchOptionsByPath } from "@/lib/crud/create-resource-api";

// `I18nProvider` memanggil `useRouter()` (untuk `router.refresh()` saat ganti
// locale) — di luar App Router (mis. di test) itu butuh mock manual.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Stub `optionsFrom` yang opsi-nya datang LEWAT EFEK (async), bukan sinkron di
// render pertama — meniru `source.api.useOptions()` sungguhan (query terpisah
// dari `useGetOne`). Hanya dipakai oleh test BUG B di bawah; test lain di file
// ini tak mengisi `meta.optionsFrom` jadi `getResource` tak pernah terpanggil
// (lihat guard `meta.optionsFrom ? getResource(...) : undefined` di komponen).
let resolveDelayedOptions: (data: { value: number; label: string }[]) => void = () => {};
const delayedOptionsPromise = new Promise<{ value: number; label: string }[]>((resolve) => {
  resolveDelayedOptions = resolve;
});
function useDelayedOptions() {
  const [data, setData] = React.useState<{ value: number; label: string }[] | undefined>(undefined);
  React.useEffect(() => {
    delayedOptionsPromise.then(setData);
  }, []);
  return { data };
}
vi.mock("@/config/resources/index", () => ({
  getResource: vi.fn(() => ({ api: { useOptions: () => useDelayedOptions() } })),
}));

// `fetchOptionsByPath` satu-satunya fungsi baru dari `create-resource-api.ts`
// yang dipanggil `AsyncSelectField` — mock PARSIAL (`importActual`) menjaga
// `createResourceApi`/`req` tetap asli, kalau ada modul lain yang di-import
// tak langsung oleh file test ini butuh export tsb (pola sama dgn
// `@/lib/crud/export` di `resource-table.test.tsx`).
vi.mock("@/lib/crud/create-resource-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/crud/create-resource-api")>();
  return {
    ...actual,
    fetchOptionsByPath: vi.fn(async () => [{ value: 9, label: "Opsi Path" }]),
  };
});

/**
 * Menampilkan nilai RHF `child` sebagai teks. Dipakai alih-alih membaca
 * `<select>` DOM secara langsung karena elemen `<select>` native tidak bisa
 * merefleksikan sebuah value tanpa `<option>` yang cocok (di sini tidak ada
 * `optionsFrom`, jadi daftar option kosong) — sumber kebenaran yang diuji
 * adalah state RHF, bukan tampilan DOM select-nya.
 */
function ChildValueProbe() {
  const value = useWatch({ name: "child" });
  return <span data-testid="child-value">{String(value ?? "")}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { parent: "a", child: "existing" } });
  // `AsyncSelectField` memakai `useI18n()` untuk placeholder select, jadi wajib
  // dibungkus `I18nProvider`.
  return (
    <I18nProvider initialLocale="en">
      <FormProvider {...form}>
        <TextField name="parent" meta={{ type: "text" }} />
        <AsyncSelectField name="child" meta={{ type: "async-select", dependsOn: ["parent"] }} />
        <ChildValueProbe />
      </FormProvider>
    </I18nProvider>
  );
}

/**
 * Meniru alur EDIT nyata: `useForm()` TANPA `defaultValues`, lalu `reset(data)`
 * dijalankan lewat tombol SETELAH mount (meniru `useGetOne` async di
 * `ResourceForm`). Parent berpindah `undefined → "a"` saat `mounted.current ===
 * true` — jalur yang sebelumnya diam-diam menghapus value anak yang sudah
 * terisi.
 */
function AsyncEditHarness() {
  const form = useForm();
  return (
    <I18nProvider initialLocale="en">
      <FormProvider {...form}>
        <button type="button" onClick={() => form.reset({ parent: "a", child: "existing" })}>load</button>
        <TextField name="parent" meta={{ type: "text" }} />
        <AsyncSelectField name="child" meta={{ type: "async-select", dependsOn: ["parent"] }} />
        <ChildValueProbe />
      </FormProvider>
    </I18nProvider>
  );
}

describe("AsyncSelectField - reset cascade", () => {
  it("tidak menghapus value yang sudah terisi saat mount pertama", () => {
    render(<Harness />);
    expect(screen.getByTestId("child-value")).toHaveTextContent("existing");
  });

  it("mereset value ke string kosong saat field induk (dependsOn) berubah", () => {
    render(<Harness />);
    expect(screen.getByTestId("child-value")).toHaveTextContent("existing");

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "b" } });

    expect(screen.getByTestId("child-value")).toHaveTextContent("");
  });

  it("tidak menghapus value anak saat `reset()` mengisi form SETELAH mount (alur edit nyata)", () => {
    render(<AsyncEditHarness />);
    // `reset()` dijalankan SETELAH mount (mounted.current sudah true) → parent
    // berpindah undefined → "a". `fireEvent` membungkus efek lanjutan dalam
    // `act`, jadi assertion deterministik.
    fireEvent.click(screen.getByText("load"));
    expect(screen.getByDisplayValue("a")).toBeInTheDocument();
    // Value anak TIDAK boleh terhapus: perubahan parent berasal dari reset()
    // (non-dirty), bukan aksi user.
    expect(screen.getByTestId("child-value")).toHaveTextContent("existing");
  });
});

/**
 * BUG B (reload jadwal_1..7 kosong di form staff): `GET /staff/:id` (yang
 * memicu `reset(one.data)` di `ResourceForm`) dan query opsi `optionsFrom`
 * (`source.api.useOptions()`) adalah DUA fetch terpisah — tak ada jaminan
 * urutan resolve. Harness di bawah menahan opsi lewat Promise yang baru
 * di-resolve SETELAH `reset()` sudah mengisi value numerik, meniru race yang
 * terverifikasi via `curl` (task 8): `GET /staff/297` balik `jadwal_1: 42`
 * dengan benar tapi dropdown tetap "-- select --" karena opsi `waktukerja`
 * datang belakangan.
 */
/**
 * Membaca `dirtyFields[name]` sebagai teks. Dipakai utk membuktikan Temuan 1
 * review: sebelum `useController`, `setValue(name, e.target.value)` di
 * `onChange` tangan-sendiri TIDAK mendaftarkan field ke RHF sama sekali —
 * `dirtyFields` bisa saja tak pernah terisi lewat jalur itu tanpa terlihat
 * di test lama (yang cuma membaca `useWatch`, bukan status dirty).
 */
function DirtyProbe({ name }: { name: string }) {
  const { dirtyFields, touchedFields } = useFormState({ name });
  const isDirty = Boolean((dirtyFields as Record<string, unknown>)[name]);
  const isTouched = Boolean((touchedFields as Record<string, unknown>)[name]);
  return (
    <>
      <span data-testid="dirty">{String(isDirty)}</span>
      <span data-testid="touched">{String(isTouched)}</span>
    </>
  );
}

function EditWithOptionsHarness() {
  const form = useForm();
  return (
    <I18nProvider initialLocale="en">
      <FormProvider {...form}>
        <button type="button" onClick={() => form.reset({ jadwal_1: 42 })}>load</button>
        <AsyncSelectField name="jadwal_1" meta={{ type: "async-select", optionsFrom: "waktukerja" }} />
        <DirtyProbe name="jadwal_1" />
      </FormProvider>
    </I18nProvider>
  );
}

describe("AsyncSelectField - reload nilai FK numerik (BUG B)", () => {
  it("select menampilkan value tersimpan sebagai opsi terpilih walau opsi datang SETELAH reset()", async () => {
    render(<EditWithOptionsHarness />);
    fireEvent.click(screen.getByText("load"));
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    // Sebelum opsi tiba: belum ada <option value="42"> di DOM sama sekali.
    expect(select.value).toBe("");

    await act(async () => {
      resolveDelayedOptions([{ value: 42, label: "Shift Pagi" }, { value: 43, label: "Shift Siang" }]);
      await delayedOptionsPromise;
    });
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(1));

    // Sebelum fix: select TAK-TERKENDALI (`{...register(name)}`) hanya
    // menerapkan `.value` sekali saat `reset()` — opsi yang muncul belakangan
    // tak pernah disinkronkan ulang, jadi dropdown tetap kosong meski RHF
    // menyimpan `42` dengan benar. Sesudah fix (`value=`/`onChange=`
    // terkendali via `useWatch`), setiap render menyinkronkan ulang.
    expect(select.value).toBe("42");
  });
});

/**
 * Temuan 1 review (kritis): `register()` menyediakan EMPAT hal —
 * `name`/`ref`/`onBlur`/`onChange` internal RHF. Perbaikan BUG B pertama
 * (`setValue` tangan-sendiri di `onChange`, dgn `{ shouldDirty: true }`)
 * MASIH mengisi `dirtyFields` dengan benar — itu SENGAJA di-set eksplisit
 * di panggilan `setValue`-nya, jadi memeriksa `dirtyFields` SAJA tak cukup
 * membedakan versi lama vs `useController`. Yang benar-benar hilang di versi
 * lama: (a) atribut DOM `name` (tak pernah dipasang sama sekali — bukan
 * lewat `register()`, bukan manual), dan (b) `onBlur` (tak pernah disambung
 * — `touchedFields` tak mungkin terisi lewat blur). Test ini menegaskan
 * KEDUANYA, plus value+dirtyFields, lewat interaksi DOM sungguhan —
 * dibuktikan RED thd versi `setValue` tangan-sendiri (lihat commit ini).
 */
describe("AsyncSelectField - onChange/blur DOM sungguhan (registrasi RHF)", () => {
  it("memilih opsi via event change memperbarui value + dirtyFields, DAN select punya atribut name + onBlur menandai touchedFields", async () => {
    render(<EditWithOptionsHarness />);
    fireEvent.click(screen.getByText("load"));
    await act(async () => {
      resolveDelayedOptions([{ value: 42, label: "Shift Pagi" }, { value: 43, label: "Shift Siang" }]);
      await delayedOptionsPromise;
    });
    await waitFor(() => expect(screen.getAllByRole("option").length).toBeGreaterThan(1));

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    // Atribut DOM `name` HARUS terpasang (bukti field terdaftar via
    // `useController`/`register`, bukan setValue tangan-sendiri yang tak
    // pernah memasang atribut ini sama sekali).
    expect(select.name).toBe("jadwal_1");

    // Sebelum interaksi user: belum dirty, belum touched.
    expect(screen.getByTestId("dirty")).toHaveTextContent("false");
    expect(screen.getByTestId("touched")).toHaveTextContent("false");

    fireEvent.change(select, { target: { value: "43" } });
    // (1) Nilai RHF berubah.
    expect(select.value).toBe("43");
    // (2) dirtyFields terisi.
    expect(screen.getByTestId("dirty")).toHaveTextContent("true");

    fireEvent.blur(select);
    // (3) touchedFields terisi — HANYA mungkin lewat `onBlur` yang
    // terpasang (`field.onBlur`). Versi `setValue` tangan-sendiri tak
    // pernah menyambung `onBlur` apa pun, jadi ini tetap "false" di sana.
    expect(screen.getByTestId("touched")).toHaveTextContent("true");
  });
});

/**
 * Task 3 (`optionsPath`): field yang endpoint resource masternya digerbangi
 * permission yang tak dimiliki peran pemakai form (mis. guru mapel ajar tak
 * punya `tahunajaran:view`) memanggil rute `opsi/*` milik layar sendiri
 * lewat `fetchOptionsByPath`, MEMANJAT-LEWATI resolusi `optionsFrom`/
 * `getResource` — tanpa menulis komponen form kustom (`AsyncSelectField`
 * generik tetap dipakai).
 */
function OptionsPathHarness() {
  const form = useForm({ defaultValues: { parent: "p1" } });
  const [qc] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={qc}>
      <I18nProvider initialLocale="en">
        <FormProvider {...form}>
          <TextField name="parent" meta={{ type: "text" }} />
          <AsyncSelectField
            name="child"
            meta={{ type: "async-select", optionsPath: "/modulajar/opsi/tahun-ajaran", dependsOn: ["parent"] }}
          />
        </FormProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function BothOptionsHarness() {
  const form = useForm();
  const [qc] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={qc}>
      <I18nProvider initialLocale="en">
        <FormProvider {...form}>
          <AsyncSelectField
            name="child"
            meta={{ type: "async-select", optionsFrom: "waktukerja", optionsPath: "/modulajar/opsi/tahun-ajaran" }}
          />
        </FormProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

describe("AsyncSelectField - optionsPath (mekanisme baru, Task 3)", () => {
  it("optionsPath diisi -> fetchOptionsByPath dipanggil dgn path itu + parent dari dependsOn, opsi hasilnya dirender", async () => {
    render(<OptionsPathHarness />);
    await waitFor(() => expect(screen.getByText("Opsi Path")).toBeInTheDocument());
    // `parent` (dari `dependsOn: ["parent"]`) WAJIB ikut terkirim — cascade
    // parent tetap didukung utk jalur `optionsPath`, sama seperti `optionsFrom`.
    expect(fetchOptionsByPath).toHaveBeenCalledWith("/modulajar/opsi/tahun-ajaran", {
      parent: { parent: "p1" },
    });
  });

  it("optionsPath mengalahkan optionsFrom kalau keduanya diisi -- getResource/optionsFrom TIDAK terpanggil", async () => {
    const getResourceMock = vi.mocked(getResource);
    getResourceMock.mockClear();
    render(<BothOptionsHarness />);
    await waitFor(() => expect(screen.getByText("Opsi Path")).toBeInTheDocument());
    expect(getResourceMock).not.toHaveBeenCalled();
  });

  it("parent (dependsOn) berubah -> fetchOptionsByPath dipanggil ULANG dgn parent BARU (queryKey ikut parent, bukan cache basi)", async () => {
    render(<OptionsPathHarness />);
    await waitFor(() => expect(screen.getByText("Opsi Path")).toBeInTheDocument());
    const mockFn = vi.mocked(fetchOptionsByPath);
    const panggilanAwal = mockFn.mock.calls.length;
    fireEvent.change(screen.getByDisplayValue("p1"), { target: { value: "p2" } });
    // Kalau `parent` dicabut dari `queryKey`, react-query menganggap query-nya
    // SAMA sesudah parent berubah dan tak pernah refetch — cache basi senyap
    // (utang yang ditemukan mutasi karangan Task 3, ditutup di sini).
    await waitFor(() =>
      expect(mockFn).toHaveBeenCalledWith("/modulajar/opsi/tahun-ajaran", {
        parent: { parent: "p2" },
      }),
    );
    expect(mockFn.mock.calls.length).toBeGreaterThan(panggilanAwal);
  });

  it("optionsPath KOSONG (field lama, hanya optionsFrom) -> jalur getResource lama tetap terpanggil, tak berubah", async () => {
    const getResourceMock = vi.mocked(getResource);
    getResourceMock.mockClear();
    render(<EditWithOptionsHarness />);
    fireEvent.click(screen.getByText("load"));
    // Regresi jalur lama (§ "Sesudah menutup satu sumbu... enumerasi ULANG"
    // CLAUDE.md): field yang hanya punya `optionsFrom` masih memanggil
    // `getResource` persis seperti sebelum `optionsPath` ditambahkan.
    // `waitFor` (bukan assertion sinkron): `delayedOptionsPromise` modul-level
    // dipakai bersama test lain di file ini dan bisa sudah RESOLVED lebih
    // dulu, membuat efek `useDelayedOptions` men-setState di luar `act()`.
    await waitFor(() => expect(getResourceMock).toHaveBeenCalledWith("waktukerja"));
  });
});
