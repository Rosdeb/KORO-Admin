import * as React from "react";
import {
  format,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isAfter,
  parseISO,
  isToday,
  subDays,
} from "date-fns";
import {
  Flame,
  Calendar,
  Sparkles,
  Trophy,
  Activity,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  createdAt: string;
  activityType?: string;
  description?: string | null;
}

interface GitHubActivityCalendarProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
  weeksToShow?: number; // e.g. 26 for ~6 months, 52 for 1 year, 16 for compact
  selectedDate?: string | null; // format YYYY-MM-DD
  onSelectDate?: (dateStr: string | null) => void;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
  showStreaks?: boolean;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function GitHubActivityCalendar({
  activities = [],
  isLoading = false,
  weeksToShow = 26,
  selectedDate = null,
  onSelectDate,
  title = "Contribution Activity",
  description,
  className,
  compact = false,
  showStreaks = true,
}: GitHubActivityCalendarProps) {
  // 1. Process activity counts per date string (yyyy-MM-dd)
  const { dateCountMap, dateTypeMap } = React.useMemo(() => {
    const counts = new Map<string, number>();
    const types = new Map<string, string[]>();

    for (const act of activities) {
      if (!act.createdAt) continue;
      try {
        const d = typeof act.createdAt === "string" ? parseISO(act.createdAt) : new Date(act.createdAt);
        const key = format(d, "yyyy-MM-dd");
        counts.set(key, (counts.get(key) ?? 0) + 1);

        if (act.activityType) {
          const list = types.get(key) ?? [];
          if (!list.includes(act.activityType)) {
            list.push(act.activityType);
          }
          types.set(key, list);
        }
      } catch {
        // Skip malformed dates safely
      }
    }

    return { dateCountMap: counts, dateTypeMap: types };
  }, [activities]);

  // 2. Generate calendar weeks grid
  const { weeks, monthHeaders } = React.useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subWeeks(today, weeksToShow - 1), { weekStartsOn: 0 });
    const endDate = endOfWeek(today, { weekStartsOn: 0 });

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    const weeksArr: {
      date: Date;
      dateStr: string;
      count: number;
      isFuture: boolean;
      types: string[];
    }[][] = [];

    let currentWeek: {
      date: Date;
      dateStr: string;
      count: number;
      isFuture: boolean;
      types: string[];
    }[] = [];

    const months: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    allDays.forEach((day, index) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const count = dateCountMap.get(dateStr) ?? 0;
      const isFuture = isAfter(day, today) && !isSameDay(day, today);
      const types = dateTypeMap.get(dateStr) ?? [];

      currentWeek.push({
        date: day,
        dateStr,
        count,
        isFuture,
        types,
      });

      // Track month transitions
      const monthNum = day.getMonth();
      const weekIndex = Math.floor(index / 7);
      if (monthNum !== lastMonth && day.getDate() <= 7) {
        months.push({
          label: format(day, "MMM"),
          weekIndex,
        });
        lastMonth = monthNum;
      }

      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    return { weeks: weeksArr, monthHeaders: months };
  }, [weeksToShow, dateCountMap, dateTypeMap]);

  // 3. Compute streaks and summary metrics
  const { totalContributions, currentStreak, longestStreak, activeDays } = React.useMemo(() => {
    let total = 0;
    let active = 0;

    weeks.forEach((w) => {
      w.forEach((day) => {
        if (!day.isFuture) {
          total += day.count;
          if (day.count > 0) active++;
        }
      });
    });

    // Compute current streak: count backward from today (or yesterday if today is 0)
    const today = new Date();
    let curr = 0;
    const todayStr = format(today, "yyyy-MM-dd");
    const todayCount = dateCountMap.get(todayStr) ?? 0;

    let checkDate = todayCount > 0 ? today : subDays(today, 1);
    while (true) {
      const key = format(checkDate, "yyyy-MM-dd");
      const c = dateCountMap.get(key) ?? 0;
      if (c > 0) {
        curr++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    // Longest streak in visible period
    let longest = 0;
    let tempStreak = 0;
    const allDaysSorted = weeks.flatMap((w) => w).filter((d) => !d.isFuture);
    allDaysSorted.forEach((d) => {
      if (d.count > 0) {
        tempStreak++;
        if (tempStreak > longest) longest = tempStreak;
      } else {
        tempStreak = 0;
      }
    });

    return {
      totalContributions: total,
      currentStreak: curr,
      longestStreak: longest,
      activeDays: active,
    };
  }, [weeks, dateCountMap]);

  // Activity level styling (GitHub inspired greens)
  const getCellColor = (count: number, isFuture: boolean) => {
    if (isFuture) return "bg-transparent opacity-0 pointer-events-none";
    if (count === 0)
      return "bg-muted/60 dark:bg-muted/40 border border-border/30 hover:border-foreground/30";
    if (count <= 2)
      return "bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900";
    if (count <= 5)
      return "bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600 text-white";
    if (count <= 9)
      return "bg-emerald-500 dark:bg-emerald-500 border border-emerald-600 dark:border-emerald-400 text-white";
    return "bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300 text-white";
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4",
        className,
      )}
    >
      {/* Header with Title and Streak Badges */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="size-4" />
            </div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <Badge variant="secondary" className="text-xs font-mono font-medium">
              {totalContributions.toLocaleString()} total
            </Badge>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        {/* Streaks Summary Pills */}
        {showStreaks && !isLoading && (
          <div className="flex items-center gap-2 text-xs">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1">
              <Flame className="size-3.5 text-amber-500" />
              <span className="text-muted-foreground">Streak:</span>
              <span className="font-semibold text-foreground font-mono">
                {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1">
              <Trophy className="size-3.5 text-yellow-500" />
              <span className="text-muted-foreground">Best:</span>
              <span className="font-semibold text-foreground font-mono">
                {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Active:</span>
              <span className="font-semibold text-foreground font-mono">
                {activeDays} {activeDays === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Heatmap Grid */}
      {isLoading ? (
        <div className="space-y-2 py-4">
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      ) : (
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto pb-1">
            <div className="inline-block min-w-full">
              {/* Month Labels Row */}
              <div className="flex text-[10px] text-muted-foreground font-medium mb-1 pl-7">
                {weeks.map((_, i) => {
                  const monthHeader = monthHeaders.find((m) => m.weekIndex === i);
                  return (
                    <div
                      key={i}
                      className="w-3 sm:w-3.5 mr-1 shrink-0 text-left truncate"
                    >
                      {monthHeader ? monthHeader.label : ""}
                    </div>
                  );
                })}
              </div>

              {/* Grid: Day labels + Week columns */}
              <div className="flex items-start">
                {/* Day of Week Labels (Mon, Wed, Fri) */}
                <div className="flex flex-col gap-1 pr-2 text-[9px] text-muted-foreground font-medium select-none">
                  {DAY_LABELS.map((dayLabel, idx) => (
                    <div
                      key={dayLabel}
                      className={cn(
                        "h-3 sm:h-3.5 flex items-center justify-end leading-none",
                        idx % 2 === 1 ? "opacity-100" : "opacity-0",
                      )}
                    >
                      {dayLabel}
                    </div>
                  ))}
                </div>

                {/* Calendar Columns (Weeks) */}
                <div className="flex gap-1">
                  {weeks.map((week, wIndex) => (
                    <div key={wIndex} className="flex flex-col gap-1 shrink-0">
                      {week.map((day) => {
                        const isSelected = selectedDate === day.dateStr;
                        const cellColor = getCellColor(day.count, day.isFuture);
                        const isCurrentDay = isToday(day.date);

                        if (day.isFuture) {
                          return (
                            <div
                              key={day.dateStr}
                              className="size-3 sm:size-3.5 rounded-[3px] bg-transparent"
                            />
                          );
                        }

                        return (
                          <Tooltip key={day.dateStr}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectDate) {
                                    onSelectDate(isSelected ? null : day.dateStr);
                                  }
                                }}
                                aria-label={`${day.count} activities on ${day.dateStr}`}
                                className={cn(
                                  "size-3 sm:size-3.5 rounded-[3px] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                  cellColor,
                                  isCurrentDay && "ring-1 ring-primary/70",
                                  isSelected && "ring-2 ring-primary ring-offset-1 z-10 scale-110",
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs p-2 space-y-1 shadow-lg">
                              <p className="font-semibold text-foreground">
                                {day.count === 0
                                  ? "No activity"
                                  : `${day.count} ${day.count === 1 ? "activity" : "activities"}`}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {format(day.date, "EEEE, MMMM d, yyyy")}
                              </p>
                              {day.types.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50 max-w-[200px]">
                                  {day.types.slice(0, 3).map((t) => (
                                    <span
                                      key={t}
                                      className="text-[9px] px-1 py-0.2 rounded bg-muted text-foreground font-mono"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {day.types.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">
                                      +{day.types.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
      )}

      {/* Footer: Filter Reset & GitHub-style Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {selectedDate ? (
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium text-xs">
              <Calendar className="size-3" />
              <span>Filtered to: {format(parseISO(selectedDate), "MMM d, yyyy")}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectDate?.(null)}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent text-primary hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                <span className="sr-only">Clear date filter</span>
              </Button>
            </div>
          ) : (
            <span className="text-[11px]">
              {compact ? "Recent activity overview" : "Click any square to filter the log table below"}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span>Less</span>
          <div className="size-2.5 sm:size-3 rounded-[2px] bg-muted/60 dark:bg-muted/40 border border-border/30" />
          <div className="size-2.5 sm:size-3 rounded-[2px] bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800" />
          <div className="size-2.5 sm:size-3 rounded-[2px] bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600" />
          <div className="size-2.5 sm:size-3 rounded-[2px] bg-emerald-500 dark:bg-emerald-500 border border-emerald-600 dark:border-emerald-400" />
          <div className="size-2.5 sm:size-3 rounded-[2px] bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
