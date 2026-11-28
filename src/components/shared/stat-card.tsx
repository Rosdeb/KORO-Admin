import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string | null;
  icon?: LucideIcon;
  iconColor?: string;
  deltaPercent?: number | null;
  deltaLabel?: string;
  isLoading?: boolean;
  unavailableReason?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  deltaPercent,
  deltaLabel = "vs previous period",
  isLoading,
  unavailableReason,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden p-5 border-0 shadow-sm bg-card transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon && (
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              iconColor ?? "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-4.5" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-1.5">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      ) : unavailableReason ? (
        <div className="mt-3">
          <p className="text-2xl font-bold text-muted-foreground">—</p>
          <p className="mt-1 text-xs text-muted-foreground">{unavailableReason}</p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[1.75rem] font-bold leading-none tracking-tight text-foreground">
            {typeof value === "number" ? formatNumber(value) : (value ?? "—")}
          </p>
          {deltaPercent !== undefined && deltaPercent !== null ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
                  deltaPercent > 0 && "bg-success/10 text-success",
                  deltaPercent < 0 && "bg-destructive/10 text-destructive",
                  deltaPercent === 0 && "bg-muted text-muted-foreground",
                )}
              >
                {deltaPercent > 0 ? (
                  <TrendingUp className="size-3" />
                ) : deltaPercent < 0 ? (
                  <TrendingDown className="size-3" />
                ) : (
                  <Minus className="size-3" />
                )}
                {formatPercent(deltaPercent)}
              </span>
              <span className="text-muted-foreground truncate">{deltaLabel}</span>
            </div>
          ) : (
            <div className="mt-2 h-5" />
          )}
        </>
      )}
    </Card>
  );
}
