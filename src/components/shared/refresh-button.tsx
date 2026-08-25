import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

/** Refetches this page's own query/queries only — never a full browser reload. */
export function RefreshButton({ onRefresh, isRefreshing }: RefreshButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
      <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
      Refresh
    </Button>
  );
}
