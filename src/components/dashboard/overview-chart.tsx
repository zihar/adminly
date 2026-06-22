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

const data = [
  { month: "Jan", visits: 1860, signups: 800 },
  { month: "Feb", visits: 3050, signups: 1200 },
  { month: "Mar", visits: 2370, signups: 1100 },
  { month: "Apr", visits: 1730, signups: 900 },
  { month: "Mei", visits: 2090, signups: 1300 },
  { month: "Jun", visits: 3140, signups: 1700 },
];

const chartConfig = {
  visits: { label: "Kunjungan", color: "var(--chart-1)" },
  signups: { label: "Pendaftaran", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function OverviewChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan</CardTitle>
        <CardDescription>Kunjungan & pendaftaran 6 bulan terakhir</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
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
