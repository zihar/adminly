import type { Metadata } from "next";
import { Activity, DollarSign, Users, CreditCard } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDictionary } from "@/lib/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.dashboard.title };
}

export default async function DashboardPage() {
  const t = await getDictionary();
  const s = t.dashboard.stats;

  return (
    <>
      <PageHeader title={t.dashboard.title} description={t.dashboard.description} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={s.revenue.title} value={s.revenue.value} delta={12.5} hint={s.revenue.hint} icon={DollarSign} />
        <StatCard title={s.activeUsers.title} value={s.activeUsers.value} delta={5.1} hint={s.activeUsers.hint} icon={Users} />
        <StatCard title={s.transactions.title} value={s.transactions.value} delta={-2.4} hint={s.transactions.hint} icon={CreditCard} />
        <StatCard title={s.uptime.title} value={s.uptime.value} delta={0.1} hint={s.uptime.hint} icon={Activity} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t.dashboard.recentActivity}</CardTitle>
            <CardDescription>{t.dashboard.recentActivityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {t.dashboard.activities.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{item.who}</span>{" "}
                  {item.what} · {item.when}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
