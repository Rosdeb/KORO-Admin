import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses any date string / timestamp from the API.
 * If the string lacks a timezone offset (e.g. "2026-11-26T15:27:00" from Spring Boot/Postgres UTC),
 * it ensures it is parsed as UTC so JavaScript accurately converts to the browser's local timezone.
 */
export function parseDate(value: string | number | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return new Date(value);

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return new Date(Number(trimmed));
  }

  // If no 'Z' and no '+/-HH:mm' offset, treat as UTC
  if (!/[zZ]$|[+-]\d{2}(:?\d{2})?$/.test(trimmed)) {
    const formatted = trimmed.replace(" ", "T") + "Z";
    const parsed = new Date(formatted);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value: string | number | Date | null | undefined, pattern = "MMM d, yyyy · h:mm a"): string {
  const d = parseDate(value);
  if (!d) return "—";
  return format(d, pattern);
}

export function formatDateOnly(value: string | number | Date | null | undefined, pattern = "MMM d, yyyy"): string {
  const d = parseDate(value);
  if (!d) return "—";
  return format(d, pattern);
}

export function formatTimeOnly(value: string | number | Date | null | undefined, pattern = "h:mm a"): string {
  const d = parseDate(value);
  if (!d) return "—";
  return format(d, pattern);
}

export function formatRelativeTime(value: string | number | Date | null | undefined): string {
  const d = parseDate(value);
  if (!d) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function humanizeKey(key: string): string {
  const withSpaces = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return withSpaces
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
