import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subMonths,
  isWithinInterval,
  format,
} from "date-fns";

/** All trend math here is derived from real `createdAt`/timestamp fields — never fabricated. */

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function countSince<T>(items: T[], dateField: (item: T) => string | null | undefined, since: Date): number {
  return items.filter((item) => {
    const d = parseDate(dateField(item));
    return d !== null && d >= since;
  }).length;
}

export function countBetween<T>(
  items: T[],
  dateField: (item: T) => string | null | undefined,
  start: Date,
  end: Date,
): number {
  return items.filter((item) => {
    const d = parseDate(dateField(item));
    return d !== null && isWithinInterval(d, { start, end });
  }).length;
}

/** Percent change of `current` relative to `previous`, or null when it can't be meaningfully computed. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/**
 * Growth rate for a running total: compares the count of items created in the last
 * `days` days against the equivalent count in the prior `days`-day window.
 */
export function periodGrowth<T>(
  items: T[],
  dateField: (item: T) => string | null | undefined,
  days: number,
): { currentPeriod: number; previousPeriod: number; percent: number | null } {
  const now = new Date();
  const periodStart = subDays(now, days);
  const previousPeriodStart = subDays(now, days * 2);

  const currentPeriod = countSince(items, dateField, periodStart);
  const previousPeriod = countBetween(items, dateField, previousPeriodStart, periodStart);

  return { currentPeriod, previousPeriod, percent: percentChange(currentPeriod, previousPeriod) };
}

export type BucketGranularity = "day" | "week" | "month";

export function bucketByDate<T>(
  items: T[],
  dateField: (item: T) => string | null | undefined,
  granularity: BucketGranularity,
  bucketCount: number,
): { label: string; date: Date; count: number }[] {
  const now = new Date();
  const bucketStart = (d: Date) =>
    granularity === "day" ? startOfDay(d) : granularity === "week" ? startOfWeek(d) : startOfMonth(d);
  const stepBack = (d: Date, n: number) =>
    granularity === "month" ? subMonths(d, n) : subDays(d, granularity === "week" ? n * 7 : n);
  const labelFormat = granularity === "month" ? "MMM yyyy" : "MMM d";

  const buckets: { label: string; date: Date; count: number }[] = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    const date = bucketStart(stepBack(now, i));
    buckets.push({ label: format(date, labelFormat), date, count: 0 });
  }

  for (const item of items) {
    const d = parseDate(dateField(item));
    if (!d) continue;
    const bucketDate = bucketStart(d).getTime();
    const bucket = buckets.find((b) => b.date.getTime() === bucketDate);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

export function countByKey<T>(items: T[], keyFn: (item: T) => string | null | undefined): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) ?? "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}
