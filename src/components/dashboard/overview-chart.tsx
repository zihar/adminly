"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useI18n } from "@/components/providers/i18n-provider";

// `m` = indeks bulan (0..5) → label diambil dari kamus i18n agar bisa berganti bahasa.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.chart.title}</CardTitle>
        <CardDescription>{t.chart.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="m"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: number) => t.chart.months[value]}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
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
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
