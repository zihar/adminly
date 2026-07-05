import type { Metadata } from "next";
import { CalendarCheck, GraduationCap, UserPlus, Users } from "lucide-react";

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
        <StatCard title={s.totalPendaftar.title} value={s.totalPendaftar.value} delta={12.5} hint={s.totalPendaftar.hint} icon={UserPlus} tone="blue" />
        <StatCard title={s.totalSiswa.title} value={s.totalSiswa.value} delta={5.1} hint={s.totalSiswa.hint} icon={GraduationCap} tone="green" />
        <StatCard title={s.totalStaff.title} value={s.totalStaff.value} delta={2.4} hint={s.totalStaff.hint} icon={Users} tone="purple" />
        <StatCard title={s.kehadiran.title} value={s.kehadiran.value} delta={0.3} hint={s.kehadiran.hint} icon={CalendarCheck} tone="amber" />
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
