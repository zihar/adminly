# Skin Ceria Pendidikan + Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti skin grayscale default menjadi palet biru-langit ceria bertema pendidikan dan ubah konten Dashboard jadi metrik sekolah, tanpa merombak arsitektur.

**Architecture:** Perubahan terpusat di token warna (`globals.css`) sehingga seluruh app ikut berubah, ditambah poles komponen bersama (StatCard, sidebar, chart) dan konten Dashboard + i18n. Tidak ada perubahan routing/API/CRUD engine.

**Tech Stack:** Next.js (App Router), Tailwind v4 (`@theme inline` + token `oklch`), shadcn/ui, recharts, i18n TS dictionaries, Vitest + Testing Library.

## Global Constraints

- Palet memakai variabel `oklch` di `src/app/globals.css`; setiap perubahan `:root` (light) punya padanan di `.dark`.
- Primary = biru langit `oklch(0.62 0.15 240)` (light), `oklch(0.70 0.14 240)` (dark).
- Aksen oranye/amber dipakai hemat lewat token chart, **jangan** menimpa makna token `--accent` (surface hover low-emphasis).
- Default tema light sudah di-set (`layout.tsx`); dark mode wajib tetap kontras.
- Kontras teks/ikon ≥ WCAG AA; makna jangan mengandalkan warna saja.
- Test runner: `vitest run`. Typecheck: `npx tsc --noEmit`. Lint: `npm run lint`. Build: `npm run build`.
- Branch kerja: `feat/frontend-skin-ceria` (sudah aktif).

---

### Task 1: Token warna di `globals.css`

**Files:**
- Modify: `src/app/globals.css:52-83` (blok `:root`) dan `:85-114` (blok `.dark`)

**Interfaces:**
- Consumes: —
- Produces: token warna yang dipakai seluruh komponen (`--primary`, `--chart-1..5`, `--sidebar-*`, `--radius`). Tidak ada API kode.

Catatan: ini perubahan CSS murni (tanpa logika) → tak ada unit test; diverifikasi lewat build + tinjauan visual.

- [ ] **Step 1: Ganti blok `:root`**

Ganti isi blok `:root { ... }` yang ada menjadi:

```css
:root {
  --background: oklch(0.99 0.004 240);
  --foreground: oklch(0.21 0.02 250);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.21 0.02 250);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.21 0.02 250);
  --primary: oklch(0.62 0.15 240);
  --primary-foreground: oklch(0.99 0.01 240);
  --secondary: oklch(0.96 0.012 240);
  --secondary-foreground: oklch(0.30 0.03 250);
  --muted: oklch(0.96 0.008 240);
  --muted-foreground: oklch(0.52 0.02 250);
  --accent: oklch(0.95 0.02 240);
  --accent-foreground: oklch(0.30 0.05 250);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.90 0.01 240);
  --input: oklch(0.90 0.01 240);
  --ring: oklch(0.62 0.15 240);
  --chart-1: oklch(0.70 0.13 240);
  --chart-2: oklch(0.72 0.14 155);
  --chart-3: oklch(0.80 0.13 85);
  --chart-4: oklch(0.72 0.14 350);
  --chart-5: oklch(0.65 0.15 300);
  --radius: 0.75rem;
  --sidebar: oklch(0.99 0.004 240);
  --sidebar-foreground: oklch(0.21 0.02 250);
  --sidebar-primary: oklch(0.62 0.15 240);
  --sidebar-primary-foreground: oklch(0.99 0.01 240);
  --sidebar-accent: oklch(0.95 0.02 240);
  --sidebar-accent-foreground: oklch(0.30 0.05 250);
  --sidebar-border: oklch(0.90 0.01 240);
  --sidebar-ring: oklch(0.62 0.15 240);
}
```

- [ ] **Step 2: Ganti blok `.dark`**

Ganti isi blok `.dark { ... }` yang ada menjadi:

```css
.dark {
  --background: oklch(0.16 0.01 250);
  --foreground: oklch(0.98 0.005 240);
  --card: oklch(0.21 0.015 250);
  --card-foreground: oklch(0.98 0.005 240);
  --popover: oklch(0.21 0.015 250);
  --popover-foreground: oklch(0.98 0.005 240);
  --primary: oklch(0.70 0.14 240);
  --primary-foreground: oklch(0.20 0.03 250);
  --secondary: oklch(0.27 0.02 250);
  --secondary-foreground: oklch(0.98 0.005 240);
  --muted: oklch(0.27 0.02 250);
  --muted-foreground: oklch(0.72 0.02 250);
  --accent: oklch(0.30 0.03 250);
  --accent-foreground: oklch(0.98 0.005 240);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.70 0.14 240);
  --chart-1: oklch(0.72 0.13 240);
  --chart-2: oklch(0.74 0.14 155);
  --chart-3: oklch(0.82 0.13 85);
  --chart-4: oklch(0.74 0.14 350);
  --chart-5: oklch(0.68 0.15 300);
  --sidebar: oklch(0.21 0.015 250);
  --sidebar-foreground: oklch(0.98 0.005 240);
  --sidebar-primary: oklch(0.70 0.14 240);
  --sidebar-primary-foreground: oklch(0.20 0.03 250);
  --sidebar-accent: oklch(0.30 0.03 250);
  --sidebar-accent-foreground: oklch(0.98 0.005 240);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.70 0.14 240);
}
```

- [ ] **Step 3: Verifikasi build & visual**

Run: `npm run build`
Expected: build sukses tanpa error.

Lalu buka `http://localhost:3100/dashboard` (dev server sudah jalan) — pastikan primary biru langit muncul di menu aktif/tombol, latar tak lagi abu polos, tak ada teks kontras rendah. Cek juga toggle dark mode masih kontras.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): palet biru langit + chart pastel, radius lebih membulat"
```

---

### Task 2: Prop `tone` + chip ikon berwarna di `StatCard`

**Files:**
- Modify: `src/components/dashboard/stat-card.tsx`
- Test: `src/components/dashboard/__tests__/stat-card.test.tsx` (create)

**Interfaces:**
- Consumes: token `--chart-1..5` dari Task 1 (kelas `bg-chart-*` / `text-chart-*`).
- Produces: `StatCard` menerima prop opsional `tone?: "blue" | "green" | "amber" | "pink" | "purple"`. Bila `tone` diisi, ikon dibungkus chip bulat dengan kelas `bg-chart-N/10 text-chart-N`. Peta: blue→1, green→2, amber→3, pink→4, purple→5. Dipakai oleh Task 4.

- [ ] **Step 1: Tulis test yang gagal**

Buat `src/components/dashboard/__tests__/stat-card.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { GraduationCap } from "lucide-react";
import { describe, expect, test } from "vitest";

import { StatCard } from "../stat-card";

describe("StatCard", () => {
  test("prop tone membungkus ikon dengan chip warna chart yang sesuai", () => {
    const { container } = render(
      <StatCard title="Total Siswa" value="274" tone="green" icon={GraduationCap} />,
    );
    // Tanpa prop `delta`, satu-satunya <svg> adalah ikon (bukan panah delta).
    const svg = container.querySelector("svg");
    const chip = svg?.parentElement;
    expect(chip?.className).toContain("bg-chart-2/10");
    expect(chip?.className).toContain("text-chart-2");
  });

  test("tanpa tone, ikon tetap tampil netral", () => {
    const { container } = render(
      <StatCard title="X" value="1" icon={GraduationCap} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.parentElement?.className).toContain("text-muted-foreground");
  });
});
```

- [ ] **Step 2: Jalankan test — pastikan gagal**

Run: `npx vitest run src/components/dashboard/__tests__/stat-card.test.tsx`
Expected: FAIL (prop `tone` belum ada / chip belum dirender).

- [ ] **Step 3: Implementasi minimal di `stat-card.tsx`**

Ganti isi `src/components/dashboard/stat-card.tsx` menjadi:

```tsx
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "pink" | "purple";

const toneChip: Record<Tone, string> = {
  blue: "bg-chart-1/10 text-chart-1",
  green: "bg-chart-2/10 text-chart-2",
  amber: "bg-chart-3/10 text-chart-3",
  pink: "bg-chart-4/10 text-chart-4",
  purple: "bg-chart-5/10 text-chart-5",
};

type StatCardProps = {
  title: string;
  value: string;
  delta?: number;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
};

export function StatCard({ title, value, delta, hint, icon: Icon, tone }: StatCardProps) {
  const isUp = (delta ?? 0) >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{title}</CardDescription>
        {Icon ? (
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-full",
              tone ? toneChip[tone] : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1">
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        {delta !== undefined ? (
          <p className="flex items-center gap-1 text-xs">
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                isUp ? "text-emerald-600" : "text-red-600",
              )}
            >
              {isUp ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(delta)}%
            </span>
            {hint ? <span className="text-muted-foreground">{hint}</span> : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Jalankan test — pastikan lulus**

Run: `npx vitest run src/components/dashboard/__tests__/stat-card.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/stat-card.tsx src/components/dashboard/__tests__/stat-card.test.tsx
git commit -m "feat(ui): StatCard prop tone dengan chip ikon berwarna"
```

---

### Task 3: Pil biru untuk item sidebar aktif

**Files:**
- Modify: `src/components/ui/sidebar.tsx:478` (kelas `data-active:*` pada `menuButtonVariants` base)

**Interfaces:**
- Consumes: token `--sidebar-primary` / `--sidebar-primary-foreground` dari Task 1.
- Produces: item nav aktif tampil sebagai pil biru langit (bukan abu). Tak ada API kode.

Catatan: perubahan kelas Tailwind murni → diverifikasi visual + test yang ada tetap hijau.

- [ ] **Step 1: Ubah kelas state aktif**

Di string kelas base `menuButtonVariants` (baris ~478), ganti bagian state aktif dari:

```
data-active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground
```

menjadi:

```
data-active:bg-sidebar-primary data-active:font-medium data-active:text-sidebar-primary-foreground
```

Biarkan sisa string kelas (hover, focus, dsb.) apa adanya.

- [ ] **Step 2: Verifikasi tak ada regresi test & visual**

Run: `npx vitest run`
Expected: PASS (semua test yang ada tetap hijau).

Lalu di `http://localhost:3100/dashboard`, pastikan menu "Dashboard" yang aktif kini berlatar pil biru langit dengan teks kontras; item non-aktif hover memakai `sidebar-accent` biru tipis.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sidebar.tsx
git commit -m "feat(ui): item sidebar aktif jadi pil biru langit"
```

---

### Task 4: Konten Dashboard bertema pendidikan + i18n

**Files:**
- Modify: `src/locales/en.ts` (blok `dashboard.stats` & `chart`)
- Modify: `src/locales/id.ts` (blok `dashboard.stats` & `chart`)
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/dashboard/overview-chart.tsx`

**Interfaces:**
- Consumes: prop `tone` dari Task 2; token chart dari Task 1.
- Produces: dashboard menampilkan 4 metrik pendidikan + chart tren pendaftar/siswa. Kunci i18n baru: `dashboard.stats.{totalPendaftar,totalSiswa,totalStaff,kehadiran}` (tiap objek `{ title, value, hint }`) dan `chart.{pendaftar, siswaAktif}` (menggantikan `visits`/`signups`).

Catatan: tipe `Dictionary` diturunkan dari `en.ts`, jadi `id.ts` dan seluruh pemakai `t.*` wajib selaras — `tsc --noEmit` menjadi gerbang utama.

- [ ] **Step 1: Perbarui `en.ts`**

Ganti blok `stats: { ... }` di dalam `dashboard` menjadi:

```ts
    stats: {
      totalPendaftar: { title: "Total applicants", value: "222", hint: "vs last month" },
      totalSiswa: { title: "Total students", value: "274", hint: "active" },
      totalStaff: { title: "Total staff", value: "88", hint: "active" },
      kehadiran: { title: "Attendance today", value: "96.4%", hint: "present" },
    },
```

Dan ganti blok `chart: { ... }` menjadi:

```ts
  chart: {
    title: "Overview",
    description: "Applicants & active students, last 6 months",
    pendaftar: "Applicants",
    siswaAktif: "Active students",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  },
```

- [ ] **Step 2: Perbarui `id.ts` (shape identik)**

Ganti blok `stats: { ... }` menjadi:

```ts
    stats: {
      totalPendaftar: { title: "Total Pendaftar", value: "222", hint: "vs bulan lalu" },
      totalSiswa: { title: "Total Siswa", value: "274", hint: "aktif" },
      totalStaff: { title: "Total Staff", value: "88", hint: "aktif" },
      kehadiran: { title: "Kehadiran Hari Ini", value: "96,4%", hint: "hadir" },
    },
```

Dan ganti blok `chart: { ... }` menjadi:

```ts
  chart: {
    title: "Ringkasan",
    description: "Pendaftar & siswa aktif, 6 bulan terakhir",
    pendaftar: "Pendaftar",
    siswaAktif: "Siswa Aktif",
    months: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"],
  },
```

- [ ] **Step 3: Perbarui `dashboard/page.tsx`**

Ganti baris import ikon dan keempat `StatCard` menjadi metrik pendidikan + tone. Import:

```tsx
import { CalendarCheck, GraduationCap, UserPlus, Users } from "lucide-react";
```

Blok grid StatCard:

```tsx
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={s.totalPendaftar.title} value={s.totalPendaftar.value} delta={12.5} hint={s.totalPendaftar.hint} icon={UserPlus} tone="blue" />
        <StatCard title={s.totalSiswa.title} value={s.totalSiswa.value} delta={5.1} hint={s.totalSiswa.hint} icon={GraduationCap} tone="green" />
        <StatCard title={s.totalStaff.title} value={s.totalStaff.value} delta={2.4} hint={s.totalStaff.hint} icon={Users} tone="purple" />
        <StatCard title={s.kehadiran.title} value={s.kehadiran.value} delta={0.3} hint={s.kehadiran.hint} icon={CalendarCheck} tone="amber" />
      </div>
```

(`s` = `t.dashboard.stats`, sudah ada di file.)

- [ ] **Step 4: Perbarui `overview-chart.tsx`**

Ganti array `data`, `chartConfig`, dan dua `<Area>` agar memakai seri pendaftar/siswaAktif berwarna biru & hijau. Ganti bagian terkait menjadi:

```tsx
const data = [
  { m: 0, pendaftar: 32, siswaAktif: 250 },
  { m: 1, pendaftar: 48, siswaAktif: 258 },
  { m: 2, pendaftar: 40, siswaAktif: 262 },
  { m: 3, pendaftar: 55, siswaAktif: 266 },
  { m: 4, pendaftar: 60, siswaAktif: 270 },
  { m: 5, pendaftar: 45, siswaAktif: 274 },
];

export function OverviewChart() {
  const { t } = useI18n();

  const chartConfig = {
    pendaftar: { label: t.chart.pendaftar, color: "var(--chart-1)" },
    siswaAktif: { label: t.chart.siswaAktif, color: "var(--chart-2)" },
  } satisfies ChartConfig;
```

Dan di JSX, ganti kedua `<linearGradient>` id + kedua `<Area>` agar merujuk `pendaftar`/`siswaAktif`:

```tsx
            <defs>
              <linearGradient id="fillPendaftar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-pendaftar)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-pendaftar)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillSiswaAktif" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-siswaAktif)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-siswaAktif)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area dataKey="pendaftar" type="natural" fill="url(#fillPendaftar)" stroke="var(--color-pendaftar)" stackId="a" />
            <Area dataKey="siswaAktif" type="natural" fill="url(#fillSiswaAktif)" stroke="var(--color-siswaAktif)" stackId="a" />
```

- [ ] **Step 5: Typecheck & test**

Run: `npx tsc --noEmit`
Expected: tidak ada error (semua kunci i18n & pemakainya selaras).

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Verifikasi visual**

Buka `http://localhost:3100/dashboard`: empat kartu = Total Pendaftar (biru), Total Siswa (hijau), Total Staff (ungu), Kehadiran (amber) dengan chip ikon berwarna; chart menampilkan Pendaftar (biru) vs Siswa Aktif (hijau). Ganti bahasa (toggle i18n) memastikan label id & en benar.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.ts src/locales/id.ts "src/app/(app)/dashboard/page.tsx" src/components/dashboard/overview-chart.tsx
git commit -m "feat(dashboard): metrik pendidikan (pendaftar/siswa/staff/kehadiran) + i18n"
```

---

### Task 5: Verifikasi integrasi menyeluruh

**Files:**
- (tak ada perubahan kode kecuali ada temuan; perbaiki di task terkait bila perlu)

**Interfaces:**
- Consumes: hasil Task 1–4.
- Produces: bukti visual & lulus gate mutu.

- [ ] **Step 1: Gate mutu penuh**

Run: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
Expected: semua sukses.

- [ ] **Step 2: Tinjau visual light & dark**

Di `http://localhost:3100/dashboard`, screenshot mode light lalu dark (via tombol toggle). Bandingkan "rasa" ceria dengan `../edelweiss/dashboard-general.png`. Pastikan tak ada teks/ikon kontras rendah di kedua mode.

- [ ] **Step 3: Spot-check halaman CRUD**

Buka satu resource generik (mis. `http://localhost:3100/users` atau resource lain di sidebar). Pastikan tabel, tombol, badge, dan input mewarisi skin baru dengan wajar (primary biru, sudut membulat) tanpa regresi keterbacaan.

- [ ] **Step 4: Perbaiki temuan (bila ada) lalu commit**

Bila ada penyetelan kontras/warna, perbaiki di file token/komponen terkait dan commit:

```bash
git add -A
git commit -m "fix(ui): setel kontras/warna hasil tinjauan skin"
```

---

## Self-Review

**Spec coverage:**
- Token warna light+dark → Task 1 ✅
- Aksen oranye lewat token chart (bukan `--accent`) → chart-3 amber dipakai untuk kartu Kehadiran (Task 4), `--accent` tetap netral-sejuk (Task 1) ✅
- StatCard chip ikon berwarna → Task 2 ✅
- Chart pastut/pastel → token Task 1 + seri Task 4 ✅
- Sidebar pil aktif → Task 3 ✅
- Radius lebih membulat → Task 1 ✅
- Konten dashboard pendidikan + i18n (id & en) → Task 4 ✅
- Default light + dark tetap didukung → sudah di-commit sebelumnya; diverifikasi Task 5 ✅
- Aksesibilitas/kontras → diverifikasi Task 1, 3, 5 ✅
- CRUD ikut otomatis → diverifikasi Task 5 ✅
- Non-goal (tanpa wiring API) → data representatif di Task 4, seam dicatat di spec ✅

**Placeholder scan:** tidak ada TBD/TODO; semua step berisi kode/perintah konkret. ✅

**Type consistency:** nama tone (`blue/green/amber/pink/purple`) & peta chart konsisten antara Task 2 dan Task 4; kunci i18n (`totalPendaftar/totalSiswa/totalStaff/kehadiran`, `pendaftar/siswaAktif`) konsisten antara Task 4 (en, id, page, chart). ✅
