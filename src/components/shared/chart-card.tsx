import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { BarChart3 } from "lucide-react";

interface ChartCardProps {
  title: string;
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
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
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
