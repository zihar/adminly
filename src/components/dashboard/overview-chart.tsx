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
  { m: 0, visits: 1860, signups: 800 },
  { m: 1, visits: 3050, signups: 1200 },
  { m: 2, visits: 2370, signups: 1100 },
  { m: 3, visits: 1730, signups: 900 },
  { m: 4, visits: 2090, signups: 1300 },
  { m: 5, visits: 3140, signups: 1700 },
];

export function OverviewChart() {
  const { t } = useI18n();

  const chartConfig = {
    visits: { label: t.chart.visits, color: "var(--chart-1)" },
    signups: { label: t.chart.signups, color: "var(--chart-3)" },
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
              <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-signups)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-signups)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="visits"
              type="natural"
              fill="url(#fillVisits)"
              stroke="var(--color-visits)"
              stackId="a"
            />
            <Area
              dataKey="signups"
              type="natural"
              fill="url(#fillSignups)"
              stroke="var(--color-signups)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
