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

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan metrik utama aplikasimu."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pendapatan" value="Rp 45,2 jt" delta={12.5} hint="vs bulan lalu" icon={DollarSign} />
        <StatCard title="Pengguna Aktif" value="2.340" delta={5.1} hint="vs bulan lalu" icon={Users} />
        <StatCard title="Transaksi" value="1.205" delta={-2.4} hint="vs bulan lalu" icon={CreditCard} />
        <StatCard title="Uptime" value="99,98%" delta={0.1} hint="30 hari" icon={Activity} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
            <CardDescription>Beberapa kejadian terakhir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              { who: "Andi", what: "menambahkan pengguna baru", when: "5 mnt lalu" },
              { who: "Bunga", what: "memperbarui pengaturan", when: "1 jam lalu" },
              { who: "Citra", what: "mengekspor laporan", when: "3 jam lalu" },
              { who: "Dimas", what: "login dari perangkat baru", when: "kemarin" },
            ].map((item, i) => (
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
