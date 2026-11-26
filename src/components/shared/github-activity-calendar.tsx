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
import { Flame, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  weeksToShow?: number; // e.g. 20 for compact, 26 for ~6 months, 52 for 1 year
  selectedDate?: string | null; // format YYYY-MM-DD
  onSelectDate?: (dateStr: string | null) => void;
  title?: string;
  className?: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function GitHubActivityCalendar({
  activities = [],
  isLoading = false,
  weeksToShow = 24,
  selectedDate = null,
  onSelectDate,
  title = "Activity",
  className,
}: GitHubActivityCalendarProps) {
  // 1. Process activity counts per date string (yyyy-MM-dd)
  const { dateCountMap, dateTypeMap } = React.useMemo(() => {
    const counts = new Map<string, number>();
    const types = new Map<string, string[]>();

    for (const act of activities) {
      if (!act?.createdAt) continue;
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

  // 3. Compute simple streak & total contributions
  const { totalContributions, currentStreak } = React.useMemo(() => {
    let total = 0;

    weeks.forEach((w) => {
      w.forEach((day) => {
        if (!day.isFuture) {
          total += day.count;
        }
      });
    });

    // Current streak
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

    return { totalContributions: total, currentStreak: curr };
  }, [weeks, dateCountMap]);

  // Minimal clean GitHub green shades
  const getCellColor = (count: number, isFuture: boolean) => {
    if (isFuture) return "bg-transparent opacity-0 pointer-events-none";
    if (count === 0)
      return "bg-muted/50 dark:bg-muted/30 border border-border/20 hover:border-foreground/30";
    if (count <= 2)
      return "bg-emerald-200 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-800/80";
    if (count <= 5)
      return "bg-emerald-400 dark:bg-emerald-700 border border-emerald-500 dark:border-emerald-600";
    if (count <= 9)
      return "bg-emerald-500 dark:bg-emerald-500 border border-emerald-600 dark:border-emerald-400";
    return "bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300";
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-sm space-y-3",
        className,
      )}
    >
      {/* Sleek, minimal header: Title + count + subtle streak */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground tracking-tight">{title}</span>
          <span className="text-muted-foreground text-[11px]">
            &bull; {totalContributions.toLocaleString()} actions
          </span>
        </div>

        {currentStreak > 0 && !isLoading && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Flame className="size-3.5 fill-amber-500 text-amber-500" />
            <span>{currentStreak}d streak</span>
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      {isLoading ? (
        <div className="py-2">
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : (
        <TooltipProvider delayDuration={50}>
          <div className="overflow-x-auto pb-1">
            <div className="inline-block min-w-full">
              {/* Month Labels */}
              <div className="flex text-[9px] text-muted-foreground font-medium mb-1 pl-6">
                {weeks.map((_, i) => {
                  const monthHeader = monthHeaders.find((m) => m.weekIndex === i);
                  return (
                    <div
                      key={i}
                      className="w-2.5 sm:w-3 mr-1 shrink-0 text-left truncate"
                    >
                      {monthHeader ? monthHeader.label : ""}
                    </div>
                  );
                })}
              </div>

              {/* Grid: Day labels + Week columns */}
              <div className="flex items-start">
                {/* Mon, Wed, Fri labels */}
                <div className="flex flex-col gap-1 pr-1.5 text-[8.5px] text-muted-foreground font-medium select-none">
                  {DAY_LABELS.map((dayLabel, idx) => (
                    <div
                      key={dayLabel}
                      className={cn(
                        "h-2.5 sm:h-3 flex items-center justify-end leading-none",
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
                              className="size-2.5 sm:size-3 rounded-[2px] bg-transparent"
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
                                  "size-2.5 sm:size-3 rounded-[2px] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                                  cellColor,
                                  isCurrentDay && "ring-1 ring-primary/80",
                                  isSelected && "ring-2 ring-primary ring-offset-1 z-10 scale-125",
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs p-2 space-y-0.5 shadow-lg border">
                              <p className="font-semibold text-foreground">
                                {day.count === 0
                                  ? "No activity"
                                  : `${day.count} ${day.count === 1 ? "activity" : "activities"}`}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(day.date, "EEEE, MMM d, yyyy")}
                              </p>
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

      {/* Minimal Footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
        <div>
          {selectedDate ? (
            <button
              type="button"
              onClick={() => onSelectDate?.(null)}
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
            >
              <span>{format(parseISO(selectedDate), "MMM d")}: clear filter</span>
              <X className="size-3" />
            </button>
          ) : (
            <span className="text-[10px]">Click a day to filter table</span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 text-[10px]">
          <span>Less</span>
          <div className="size-2 rounded-[2px] bg-muted/50 dark:bg-muted/30 border border-border/20" />
          <div className="size-2 rounded-[2px] bg-emerald-200 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-800/80" />
          <div className="size-2 rounded-[2px] bg-emerald-400 dark:bg-emerald-700" />
          <div className="size-2 rounded-[2px] bg-emerald-500 dark:bg-emerald-500" />
          <div className="size-2 rounded-[2px] bg-emerald-600 dark:bg-emerald-400" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
