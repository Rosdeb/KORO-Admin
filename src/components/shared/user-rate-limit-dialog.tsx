import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Gauge,
  RotateCcw,
  Clock,
  Save,
  Calendar,
  Layers,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { platformConfigApi } from "@/api/platform-config";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";
import type { UserRateLimitUpdateRequest } from "@/types/api";

interface UserRateLimitDialogProps {
  user: { id: string; name: string; email: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRateLimitDialog({
  user,
  open,
  onOpenChange,
}: UserRateLimitDialogProps) {
  const queryClient = useQueryClient();

  const {
    data: rateLimit,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.userRateLimits(user?.id ?? ""),
    queryFn: () => platformConfigApi.getUserRateLimits(user!.id),
    enabled: !!user && open,
  });

  const [editedDailyInput, setEditedDailyInput] = useState<string | null>(null);
  const [editedMonthlyInput, setEditedMonthlyInput] = useState<string | null>(null);
  const [resetDaily, setResetDaily] = useState(false);
  const [resetMonthly, setResetMonthly] = useState(false);

  const customDailyInput =
    editedDailyInput ??
    (rateLimit?.customDailyLimit !== null && rateLimit?.customDailyLimit !== undefined
      ? String(rateLimit.customDailyLimit)
      : "");

  const customMonthlyInput =
    editedMonthlyInput ??
    (rateLimit?.customMonthlyLimit !== null && rateLimit?.customMonthlyLimit !== undefined
      ? String(rateLimit.customMonthlyLimit)
      : "");

  const updateMutation = useMutation({
    mutationFn: (payload: UserRateLimitUpdateRequest) =>
      platformConfigApi.updateUserRateLimits(user!.id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.userRateLimits(user!.id), updated);
      toast.success("Rate limits updated for " + user?.name, {
        description: "Limits and quota counters have been refreshed.",
      });
      setResetDaily(false);
      setResetMonthly(false);
      setEditedDailyInput(null);
      setEditedMonthlyInput(null);
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update rate limits");
    },
  });

  const handleSave = () => {
    if (!user) return;

    const payload: UserRateLimitUpdateRequest = {
      resetDailyCount: resetDaily,
      resetMonthlyCount: resetMonthly,
    };

    // If user provided custom daily input
    if (customDailyInput.trim() !== "") {
      const parsedDaily = parseInt(customDailyInput.trim(), 10);
      payload.customDailyLimit = isNaN(parsedDaily) ? null : parsedDaily;
    } else {
      payload.customDailyLimit = 0; // 0 reverts to system default
    }

    // If user provided custom monthly input
    if (customMonthlyInput.trim() !== "") {
      const parsedMonthly = parseInt(customMonthlyInput.trim(), 10);
      payload.customMonthlyLimit = isNaN(parsedMonthly) ? null : parsedMonthly;
    } else {
      payload.customMonthlyLimit = 0; // 0 reverts to system default
    }

    updateMutation.mutate(payload);
  };

  const handleRevertDefaults = () => {
    setEditedDailyInput("0");
    setEditedMonthlyInput("0");
  };

  const hasCustomLimits =
    rateLimit?.customDailyLimit !== null && rateLimit?.customDailyLimit !== undefined;

  const dailyPercent = rateLimit
    ? Math.min(100, Math.round((rateLimit.dailyCount / Math.max(1, rateLimit.dailyLimit)) * 100))
    : 0;

  const monthlyPercent = rateLimit
    ? Math.min(
        100,
        Math.round((rateLimit.monthlyCount / Math.max(1, rateLimit.monthlyLimit)) * 100),
      )
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Gauge className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg">
                  User Search Quotas &amp; Rate Limits
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {user?.name} · <span className="font-mono text-muted-foreground">{user?.email}</span>
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {rateLimit && (
                <Badge variant={hasCustomLimits ? "default" : "secondary"} className="text-[10px]">
                  {hasCustomLimits ? "Custom Override" : "System Defaults"}
                </Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                aria-label="Refresh rate limits"
                title="Refresh rate limits"
                disabled={isFetching}
                onClick={async () => {
                  await refetch();
                  toast.success("Rate limits rechecked", {
                    description: "Fetched fresh quota counters from the server.",
                  });
                }}
              >
                <RefreshCw className={cn("size-3.5", isFetching && "animate-spin motion-reduce:animate-none")} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="size-4" />
              <span>Failed to load rate limits for this user</span>
            </div>
            <p className="text-muted-foreground">
              {error instanceof ApiError ? error.message : "Please verify connection to the server."}
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetch()} className="h-7 text-xs">
              Retry
            </Button>
          </div>
        ) : rateLimit ? (
          <div className="space-y-5 py-2">
            {/* Live Quota Meters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Daily Quota Card */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" /> Daily Searches
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {resetDaily ? (
                      <span className="text-emerald-600 font-semibold">Will reset to 0</span>
                    ) : (
                      <>
                        <strong className="text-foreground">{rateLimit.dailyCount}</strong> / {rateLimit.dailyLimit}
                      </>
                    )}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      resetDaily
                        ? "bg-muted-foreground/30"
                        : dailyPercent >= 90
                          ? "bg-destructive"
                          : dailyPercent >= 75
                            ? "bg-warning"
                            : "bg-primary"
                    }`}
                    style={{ width: `${resetDaily ? 0 : dailyPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {resetDaily ? rateLimit.dailyLimit : rateLimit.dailyRemaining} remaining today
                  </span>
                  <Button
                    type="button"
                    variant={resetDaily ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2 gap-1"
                    onClick={() => setResetDaily(!resetDaily)}
                  >
                    <RotateCcw className="size-3" />
                    {resetDaily ? "Undo Reset" : "Reset Usage"}
                  </Button>
                </div>
              </div>

              {/* Monthly Quota Card */}
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-violet-500" /> Monthly Searches
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {resetMonthly ? (
                      <span className="text-emerald-600 font-semibold">Will reset to 0</span>
                    ) : (
                      <>
                        <strong className="text-foreground">{rateLimit.monthlyCount}</strong> / {rateLimit.monthlyLimit}
                      </>
                    )}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      resetMonthly
                        ? "bg-muted-foreground/30"
                        : monthlyPercent >= 90
                          ? "bg-destructive"
                          : monthlyPercent >= 75
                            ? "bg-warning"
                            : "bg-violet-500"
                    }`}
                    style={{ width: `${resetMonthly ? 0 : monthlyPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {resetMonthly ? rateLimit.monthlyLimit : rateLimit.monthlyRemaining} remaining this month
                  </span>
                  <Button
                    type="button"
                    variant={resetMonthly ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[11px] px-2 gap-1"
                    onClick={() => setResetMonthly(!resetMonthly)}
                  >
                    <RotateCcw className="size-3" />
                    {resetMonthly ? "Undo Reset" : "Reset Usage"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Last Search At */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> Last Search:
              </span>
              <span>
                {rateLimit.lastSearchAt
                  ? `${formatDistanceToNow(new Date(rateLimit.lastSearchAt), { addSuffix: true })} (${new Date(rateLimit.lastSearchAt).toLocaleDateString()})`
                  : "No searches recorded yet"}
              </span>
            </div>

            {/* Custom Limits Configuration Form */}
            <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Custom Limits Override</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Set specific search limits for this user or enter 0 to use system defaults.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleRevertDefaults}
                >
                  Clear to Defaults
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="custom-daily" className="text-xs">
                    Custom Daily Limit
                  </Label>
                  <Input
                    id="custom-daily"
                    type="number"
                    min="0"
                    placeholder={`e.g. ${rateLimit.dailyLimit} (or 0 for default)`}
                    value={customDailyInput}
                    onChange={(e) => setEditedDailyInput(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Current effective: {rateLimit.dailyLimit}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custom-monthly" className="text-xs">
                    Custom Monthly Limit
                  </Label>
                  <Input
                    id="custom-monthly"
                    type="number"
                    min="0"
                    placeholder={`e.g. ${rateLimit.monthlyLimit} (or 0 for default)`}
                    value={customMonthlyInput}
                    onChange={(e) => setEditedMonthlyInput(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Current effective: {rateLimit.monthlyLimit}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="gap-1.5"
          >
            <Save className="size-4" />
            {updateMutation.isPending ? "Updating…" : "Save Limits & Resets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
