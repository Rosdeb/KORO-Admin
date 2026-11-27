import * as React from "react";
import {
  Calendar as CalendarIcon,
  Flame,
  Trophy,
  CheckCircle2,
  TrendingUp,
  X,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, parseDate } from "@/lib/utils";

export const DHAKA_TIMEZONE = "Asia/Dhaka";

export function toDhakaDateString(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: DHAKA_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

export interface ActivityItem {
  id?: string;
  createdAt: string;
  activityType?: string;
  description?: string | null;
}

export interface GitHubActivityCalendarProps {
  activities?: ActivityItem[];
  totalActivities?: number;
  isLoading?: boolean;
  selectedDate?: string | null; // format YYYY-MM-DD
  onSelectDate?: (dateStr: string | null) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

interface CalendarDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  col: number;     // 0 to 52
  row: number;     // 0 (Sun) to 6 (Sat)
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface MonthLabel {
  name: string;
  col: number;
}

// GitHub calendar geometry
const CELL_SIZE = 10;
const CELL_GAP = 3;
const DISTANCE = CELL_SIZE + CELL_GAP; // 13px
const MARGIN_LEFT = 30;
const MARGIN_TOP = 20;
const TOTAL_WEEKS = 53;
const SVG_WIDTH = MARGIN_LEFT + TOTAL_WEEKS * DISTANCE + 6; // 725px
const SVG_HEIGHT = MARGIN_TOP + 7 * DISTANCE + 6; // 117px

// Authentic GitHub Contribution Colors
// Light: #ebedf0, #9be9a8, #40c463, #30a14e, #216e39
// Dark:  #161b22, #0e4429, #006d32, #26a641, #39d353
const GITHUB_LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "fill-[#ebedf0] dark:fill-[#161b22] stroke-[rgba(27,31,35,0.06)] dark:stroke-[rgba(255,255,255,0.05)]",
  1: "fill-[#9be9a8] dark:fill-[#0e4429] stroke-transparent",
  2: "fill-[#40c463] dark:fill-[#006d32] stroke-transparent",
  3: "fill-[#30a14e] dark:fill-[#26a641] stroke-transparent",
  4: "fill-[#216e39] dark:fill-[#39d353] stroke-transparent",
};

const LEGEND_LEVEL_STYLES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-[#ebedf0] dark:bg-[#161b22] border-[rgba(27,31,35,0.06)] dark:border-[rgba(255,255,255,0.05)]",
  1: "bg-[#9be9a8] dark:bg-[#0e4429] border-transparent",
  2: "bg-[#40c463] dark:bg-[#006d32] border-transparent",
  3: "bg-[#30a14e] dark:bg-[#26a641] border-transparent",
  4: "bg-[#216e39] dark:bg-[#39d353] border-transparent",
};

function getColorLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (!count || count <= 0) return 0;
  if (maxCount <= 4) {
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return 4;
  }
  const q1 = Math.max(1, Math.ceil(maxCount * 0.25));
  const q2 = Math.max(2, Math.ceil(maxCount * 0.5));
  const q3 = Math.max(3, Math.ceil(maxCount * 0.75));
  if (count <= q1) return 1;
  if (count <= q2) return 2;
  if (count <= q3) return 3;
  return 4;
}

export function GitHubActivityCalendar({
  activities = [],
  totalActivities,
  isLoading = false,
  selectedDate = null,
  onSelectDate,
  title = "Activity Overview",
  subtitle = "Activity audit tracked in Asia/Dhaka time (UTC+06:00)",
  className,
}: GitHubActivityCalendarProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = React.useState<"lastYear" | number>("lastYear");
  const [hoveredDay, setHoveredDay] = React.useState<{
    day: CalendarDay;
    clientX: number;
    clientY: number;
  } | null>(null);

  const currentYear = React.useMemo(() => new Date().getFullYear(), []);
  const availableYears = React.useMemo(() => [currentYear, currentYear - 1], [currentYear]);

  // 1. Group daily activity counts using Asia/Dhaka timezone
  const dayCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const act of activities) {
      if (!act?.createdAt) continue;
      const dStr = toDhakaDateString(act.createdAt);
      if (dStr) {
        counts[dStr] = (counts[dStr] ?? 0) + 1;
      }
    }
    return counts;
  }, [activities]);

  // 2. Date interval bounds
  const { endDate, weeksCount } = React.useMemo(() => {
    if (selectedYear === "lastYear") {
      return { endDate: new Date(), weeksCount: 52 };
    }
    const end = selectedYear === currentYear ? new Date() : new Date(selectedYear, 11, 31);
    return { endDate: end, weeksCount: 52 };
  }, [selectedYear, currentYear]);

  // 3. Generate 53 weeks grid
  const calendarDays = React.useMemo(() => {
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const endDayOfWeek = end.getDay(); // 0 = Sun
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (weeksCount * 7 + endDayOfWeek));
    const totalDays = weeksCount * 7 + endDayOfWeek + 1;

    let maxCount = 0;
    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const dStr = `${y}-${m}-${d}`;
      const count = dayCounts[dStr] ?? 0;
      if (count > maxCount) maxCount = count;
    }

    const days: CalendarDay[] = [];
    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, "0");
      const d = String(cur.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      const count = dayCounts[dateStr] ?? 0;
      const col = Math.floor(i / 7);
      const row = cur.getDay();

      days.push({
        date: cur,
        dateStr,
        col,
        row,
        count,
        level: getColorLevel(count, maxCount),
      });
    }

    return days;
  }, [endDate, weeksCount, dayCounts]);

  // 4. Month labels
  const monthLabels = React.useMemo(() => {
    const labels: MonthLabel[] = [];
    let lastMonth = -1;
    let lastCol = -10;

    for (const day of calendarDays) {
      const month = day.date.getMonth();
      if (month !== lastMonth && day.col - lastCol >= 2) {
        const monthName = day.date.toLocaleDateString("en-US", { month: "short" });
        labels.push({ name: monthName, col: day.col });
        lastMonth = month;
        lastCol = day.col;
      }
    }
    return labels;
  }, [calendarDays]);

  // 5. Streaks and stats
  const { total, activeDays, maxStreak, currentStreak } = React.useMemo(() => {
    let tot = 0;
    let act = 0;
    let maxS = 0;
    let tempS = 0;

    for (const day of calendarDays) {
      const c = day.count;
      tot += c;
      if (c > 0) {
        act++;
        tempS++;
        if (tempS > maxS) maxS = tempS;
      } else {
        tempS = 0;
      }
    }

    let currS = 0;
    if (calendarDays.length > 0) {
      let idx = calendarDays.length - 1;
      if (calendarDays[idx].count === 0 && idx > 0 && calendarDays[idx - 1].count > 0) {
        idx--;
      }
      while (idx >= 0 && calendarDays[idx].count > 0) {
        currS++;
        idx--;
      }
    }

    return { total: tot, activeDays: act, maxStreak: maxS, currentStreak: currS };
  }, [calendarDays]);

  const displayTotal = totalActivities !== undefined ? Math.max(totalActivities, total) : total;

  // Auto-scroll to latest week on mobile
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [selectedYear]);

  const weekdayLabels = [
    { row: 1, label: "Mon" },
    { row: 3, label: "Wed" },
    { row: 5, label: "Fri" },
  ];

  const handleCellClick = (day: CalendarDay) => {
    if (!onSelectDate) return;
    onSelectDate(selectedDate === day.dateStr ? null : day.dateStr);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 4 Key Stat Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Recorded",
            value: displayTotal.toLocaleString(),
            icon: TrendingUp,
            iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Active Days",
            value: `${activeDays} days`,
            icon: CheckCircle2,
            iconClass: "bg-muted text-muted-foreground",
          },
          {
            label: "Longest Streak",
            value: `${maxStreak} days`,
            icon: Trophy,
            iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
          },
          {
            label: "Current Streak",
            value: `${currentStreak} days`,
            icon: Flame,
            iconClass: "bg-primary/10 text-primary",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-border/80"
          >
            <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", card.iconClass)}>
              <card.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold tabular-nums text-foreground">{card.value}</p>
              <p className="text-[11px] text-muted-foreground truncate">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* GitHub-style Contribution Card */}
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5 shadow-xs">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/50">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {title} &bull;{" "}
                <span className="font-normal text-muted-foreground">
                  {displayTotal} actions in the last year
                </span>
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>

          {/* Year selector pills */}
          <div className="flex items-center gap-1 self-start sm:self-auto rounded-md bg-muted/60 p-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedYear("lastYear")}
              className={cn(
                "rounded px-2.5 py-0.5 font-medium transition-colors text-[11px]",
                selectedYear === "lastYear"
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Last 12 months
            </button>
            {availableYears.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "rounded px-2.5 py-0.5 font-medium transition-colors text-[11px]",
                  selectedYear === year
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Grid SVG */}
        <div className="relative pt-3">
          {isLoading ? (
            <Skeleton className="h-[120px] w-full rounded-md" />
          ) : (
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin select-none"
            >
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="w-full min-w-[725px] max-w-full overflow-visible font-sans"
                style={{ maxHeight: 140 }}
              >
                {/* Month Labels */}
                {monthLabels.map((lbl, idx) => (
                  <text
                    key={`${lbl.name}-${idx}`}
                    x={MARGIN_LEFT + lbl.col * DISTANCE}
                    y={12}
                    className="fill-muted-foreground text-[10px] font-normal"
                  >
                    {lbl.name}
                  </text>
                ))}

                {/* Day of Week Labels (Mon, Wed, Fri) */}
                {weekdayLabels.map((item) => (
                  <text
                    key={item.label}
                    x={MARGIN_LEFT - 6}
                    y={MARGIN_TOP + item.row * DISTANCE + 8.5}
                    textAnchor="end"
                    className="fill-muted-foreground text-[9px] font-normal"
                  >
                    {item.label}
                  </text>
                ))}

                {/* Grid Cells */}
                <g>
                  {calendarDays.map((day) => {
                    const x = MARGIN_LEFT + day.col * DISTANCE;
                    const y = MARGIN_TOP + day.row * DISTANCE;
                    const isSelected = selectedDate === day.dateStr;

                    return (
                      <rect
                        key={day.dateStr}
                        x={x}
                        y={y}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        rx={2}
                        ry={2}
                        className={cn(
                          "cursor-pointer transition-all duration-100 stroke-[1px]",
                          GITHUB_LEVEL_CLASSES[day.level],
                          isSelected && "stroke-primary stroke-[2px] filter drop-shadow-xs",
                          "hover:stroke-foreground/80 hover:stroke-[1.5px]",
                        )}
                        onClick={() => handleCellClick(day)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            day,
                            clientX: rect.left + rect.width / 2,
                            clientY: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
          )}

          {/* Floating Dark GitHub Tooltip */}
          {hoveredDay && (
            <div
              className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-full pb-2 animate-in fade-in zoom-in-95 duration-100"
              style={{ left: hoveredDay.clientX, top: hoveredDay.clientY }}
            >
              <div className="relative rounded bg-[#24292f] dark:bg-[#161b22] px-2.5 py-1 text-xs text-white shadow-md border border-[#30363d] dark:border-[#444c56]">
                <p className="font-normal whitespace-nowrap">
                  <span className="font-semibold">
                    {hoveredDay.day.count === 0
                      ? "No activity"
                      : `${hoveredDay.day.count} ${hoveredDay.day.count === 1 ? "activity" : "activities"}`}
                  </span>{" "}
                  on{" "}
                  {hoveredDay.day.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: DHAKA_TIMEZONE,
                  })}
                </p>
                <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-[#24292f] dark:border-t-[#161b22]" />
              </div>
            </div>
          )}
        </div>

        {/* Footer: Timezone, Filter Active & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
              <Clock className="size-3" />
              <span>Asia/Dhaka (UTC+06:00)</span>
            </div>

            {selectedDate && (
              <button
                type="button"
                onClick={() => onSelectDate?.(null)}
                className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <span>Filtered: {selectedDate}</span>
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* GitHub Less ... More Legend */}
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <span>Less</span>
            <div className="flex items-center gap-1">
              {([0, 1, 2, 3, 4] as const).map((lvl) => (
                <span
                  key={lvl}
                  className={cn("size-2.5 rounded-xs border", LEGEND_LEVEL_STYLES[lvl])}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
