import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  delta?: number;
  hint?: string;
  icon?: LucideIcon;
};

export function StatCard({ title, value, delta, hint, icon: Icon }: StatCardProps) {
  const isUp = (delta ?? 0) >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{title}</CardDescription>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
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
            {hint ? (
              <span className="text-muted-foreground">{hint}</span>
            ) : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
