import { AlertTriangle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const isNetworkError = error instanceof ApiError && error.status === 0;
  const message =
    error instanceof ApiError
      ? error.message
      : "Something went wrong while loading this data.";

  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 px-6 py-16 text-center ${className ?? ""}`}>
      <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10">
        {isNetworkError ? (
          <WifiOff className="size-5 text-destructive" />
        ) : (
          <AlertTriangle className="size-5 text-destructive" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {isNetworkError ? "Unable to reach the server" : "Unable to load this data"}
        </p>
        <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
