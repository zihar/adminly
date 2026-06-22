import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Eye, MousePointerClick, Timer } from "lucide-react";

export const metadata: Metadata = { title: "Analitik" };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Analitik"
        description="Tren dan metrik penggunaan aplikasi."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Tayangan Halaman" value="84.120" delta={8.3} icon={Eye} />
        <StatCard title="Rasio Klik" value="3,7%" delta={1.2} icon={MousePointerClick} />
        <StatCard title="Durasi Sesi" value="4m 12d" delta={-0.6} icon={Timer} />
      </div>
      <OverviewChart />
    </>
  );
}
