import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string | null;
  icon?: LucideIcon;
  deltaPercent?: number | null;
  deltaLabel?: string;
  isLoading?: boolean;
  unavailableReason?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  deltaPercent,
  deltaLabel = "vs previous period",
  isLoading,
  unavailableReason,
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : unavailableReason ? (
        <div className="mt-2">
          <p className="text-2xl font-semibold text-muted-foreground">—</p>
          <p className="mt-1 text-xs text-muted-foreground">{unavailableReason}</p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {deltaPercent !== undefined && deltaPercent !== null && (
            <div className="mt-1.5 flex items-center gap-1 text-xs">
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  deltaPercent > 0 && "text-success",
                  deltaPercent < 0 && "text-destructive",
                  deltaPercent === 0 && "text-muted-foreground",
                )}
              >
                {deltaPercent > 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : deltaPercent < 0 ? (
                  <TrendingDown className="size-3.5" />
                ) : (
                  <Minus className="size-3.5" />
                )}
                {formatPercent(deltaPercent)}
              </span>
              <span className="text-muted-foreground">{deltaLabel}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
