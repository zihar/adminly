import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Eye, MousePointerClick, Timer } from "lucide-react";
import { getDictionary } from "@/lib/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.analytics.title };
}

export default async function AnalyticsPage() {
  const t = await getDictionary();
  const s = t.analytics.stats;

  return (
    <>
      <PageHeader title={t.analytics.title} description={t.analytics.description} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title={s.pageViews.title} value={s.pageViews.value} delta={8.3} icon={Eye} />
        <StatCard title={s.ctr.title} value={s.ctr.value} delta={1.2} icon={MousePointerClick} />
        <StatCard title={s.sessionDuration.title} value={s.sessionDuration.value} delta={-0.6} icon={Timer} />
      </div>
      <OverviewChart />
    </>
  );
}
