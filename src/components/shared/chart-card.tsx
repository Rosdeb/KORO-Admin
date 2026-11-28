import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  className?: string;
  legend?: ReactNode;
  description?: string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ChartCard({
  title,
  className,
  legend,
  description,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyMessage = "No data available for this period.",
  actions,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn("border-0 shadow-sm bg-card hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <CardTitle>{title}</CardTitle>
            {legend}
          </div>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex aspect-[560/260] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <span className="size-6 animate-spin rounded-full border-2 border-border border-t-emerald-500 motion-reduce:animate-none" aria-hidden="true" />
            <span className="text-xs">Loading chart data…</span>
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} className="py-10" />
        ) : isEmpty ? (
          <EmptyState icon={BarChart3} title="Nothing to chart yet" description={emptyMessage} className="py-10" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
