import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Gauge,
  RotateCcw,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertCircle,
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

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditedDailyInput(null);
      setEditedMonthlyInput(null);
      setResetDaily(false);
      setResetMonthly(false);
    }
    onOpenChange(nextOpen);
  };

  const updateMutation = useMutation({
    mutationFn: (payload: UserRateLimitUpdateRequest) =>
      platformConfigApi.updateUserRateLimits(user!.id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.userRateLimits(user!.id), updated);
      toast.success("Rate limits updated", {
        description: `Quotas and settings refreshed for ${user?.name}.`,
      });
      handleOpenChange(false);
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

    if (customDailyInput.trim() !== "") {
      const parsedDaily = parseInt(customDailyInput.trim(), 10);
      payload.customDailyLimit = isNaN(parsedDaily) ? null : parsedDaily;
    } else {
      payload.customDailyLimit = 0;
    }

    if (customMonthlyInput.trim() !== "") {
      const parsedMonthly = parseInt(customMonthlyInput.trim(), 10);
      payload.customMonthlyLimit = isNaN(parsedMonthly) ? null : parsedMonthly;
    } else {
      payload.customMonthlyLimit = 0;
    }

    updateMutation.mutate(payload);
  };

  const handleRevertDefaults = () => {
    setEditedDailyInput("0");
    setEditedMonthlyInput("0");
  };

  const hasCustomDaily =
    rateLimit?.customDailyLimit !== null && rateLimit?.customDailyLimit !== undefined;
  const hasCustomMonthly =
    rateLimit?.customMonthlyLimit !== null && rateLimit?.customMonthlyLimit !== undefined;

  const dailyPercent = rateLimit
    ? Math.min(100, Math.round((rateLimit.dailyCount / Math.max(1, rateLimit.dailyLimit)) * 100))
    : 0;

  const monthlyPercent = rateLimit
    ? Math.min(
        100,
        Math.round((rateLimit.monthlyCount / Math.max(1, rateLimit.monthlyLimit)) * 100),
      )
    : 0;

  const hasDraftChanges =
    editedDailyInput !== null ||
    editedMonthlyInput !== null ||
    resetDaily ||
    resetMonthly;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 overflow-hidden border-border/80 shadow-xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Gauge className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold tracking-tight truncate">
                  Search Quotas & Limits
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  {user?.name} &bull; {user?.email}
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              title="Refresh quota status"
            >
              <RefreshCw
                className={cn("size-3.5", isFetching && "animate-spin text-primary")}
              />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="size-5 animate-spin text-primary" />
              <p className="text-xs font-medium">Checking search quotas…</p>
            </div>
          ) : error ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-destructive">
              <AlertCircle className="size-6" />
              <p className="text-xs font-medium">
                {error instanceof ApiError ? error.message : "Failed to load rate limits."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : rateLimit ? (
            <>
              {/* Daily Quota Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <span>Daily Searches</span>
                    {hasCustomDaily && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700/50">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {resetDaily ? 0 : rateLimit.dailyCount}
                    </span>{" "}
                    / {rateLimit.dailyLimit}{" "}
                    <span className="text-[10px] text-muted-foreground/80">
                      ({resetDaily ? rateLimit.dailyLimit : rateLimit.dailyRemaining} left)
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      dailyPercent >= 90
                        ? "bg-destructive"
                        : dailyPercent >= 70
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    style={{ width: `${resetDaily ? 0 : dailyPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-muted-foreground text-[10px]">
                    {resetDaily ? "Will reset count to 0" : `${dailyPercent}% consumed`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResetDaily((prev) => !prev)}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium transition-colors",
                      resetDaily
                        ? "text-amber-600 dark:text-amber-400 hover:underline"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <RotateCcw className="size-2.5" />
                    {resetDaily ? "Cancel reset" : "Reset count"}
                  </button>
                </div>
              </div>

              {/* Monthly Quota Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <span>Monthly Searches</span>
                    {hasCustomMonthly && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700/50">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {resetMonthly ? 0 : rateLimit.monthlyCount}
                    </span>{" "}
                    / {rateLimit.monthlyLimit}{" "}
                    <span className="text-[10px] text-muted-foreground/80">
                      ({resetMonthly ? rateLimit.monthlyLimit : rateLimit.monthlyRemaining} left)
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      monthlyPercent >= 90
                        ? "bg-destructive"
                        : monthlyPercent >= 70
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    style={{ width: `${resetMonthly ? 0 : monthlyPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-muted-foreground text-[10px]">
                    {resetMonthly ? "Will reset count to 0" : `${monthlyPercent}% consumed`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setResetMonthly((prev) => !prev)}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium transition-colors",
                      resetMonthly
                        ? "text-amber-600 dark:text-amber-400 hover:underline"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <RotateCcw className="size-2.5" />
                    {resetMonthly ? "Cancel reset" : "Reset count"}
                  </button>
                </div>
              </div>

              {/* Custom Overrides Divider & Inputs */}
              <div className="pt-2 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3 text-primary" /> Custom Limit Overrides
                  </span>
                  {(hasCustomDaily || hasCustomMonthly || editedDailyInput !== null || editedMonthlyInput !== null) && (
                    <button
                      type="button"
                      onClick={handleRevertDefaults}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium"
                    >
                      Clear overrides (0)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="custom-daily" className="text-[11px] text-muted-foreground font-medium block">
                      Daily Max
                    </Label>
                    <Input
                      id="custom-daily"
                      type="number"
                      min={0}
                      placeholder={`Default (${rateLimit.dailyLimit})`}
                      value={customDailyInput}
                      onChange={(e) => setEditedDailyInput(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="custom-monthly" className="text-[11px] text-muted-foreground font-medium block">
                      Monthly Max
                    </Label>
                    <Input
                      id="custom-monthly"
                      type="number"
                      min={0}
                      placeholder={`Default (${rateLimit.monthlyLimit})`}
                      value={customMonthlyInput}
                      onChange={(e) => setEditedMonthlyInput(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/80 leading-normal">
                  Enter 0 or leave blank to inherit default platform limits.
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3.5 px-5 border-t border-border/60 bg-muted/10 flex flex-row items-center justify-between sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
            <Clock className="size-3.5 shrink-0 text-muted-foreground/70" />
            <span className="truncate">
              {rateLimit?.lastSearchAt
                ? `Last: ${format(new Date(rateLimit.lastSearchAt), "MMM d, yyyy · h:mm a")}`
                : "No searches recorded"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs px-3 gap-1.5 shadow-sm"
              onClick={handleSave}
              disabled={isLoading || updateMutation.isPending || !hasDraftChanges}
            >
              {updateMutation.isPending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Save Changes
                  <ArrowRight className="size-3" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
