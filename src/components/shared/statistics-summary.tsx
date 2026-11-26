import { Activity, BookOpen, ClipboardCheck, Languages, Type, Users } from "lucide-react";
import { formatNumber, humanizeKey } from "@/lib/utils";

function metricIcon(key: string) {
  if (/user|account/i.test(key)) return Users;
  if (/language/i.test(key)) return Languages;
  if (/translation/i.test(key)) return Type;
  if (/submission|pending|review/i.test(key)) return ClipboardCheck;
  if (/concept|categor/i.test(key)) return BookOpen;
  return Activity;
}

function displayValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function StatisticsSummary({ data, path = "" }: { data: Record<string, unknown>; path?: string }) {
  return <dl className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
    {Object.entries(data).map(([key, value]) => {
      const Icon = metricIcon(`${path} ${key}`);
      const nested = value !== null && typeof value === "object";
      return <div key={key} className={`min-w-0 rounded-lg bg-muted/30 shadow-xs p-2.5 ${nested ? "col-span-full" : ""}`}>
        <dt className="flex items-start gap-1.5 text-xs leading-4 text-muted-foreground">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-500"><Icon className="size-3.5" /></span>
          <span className="min-w-0 break-words pt-1">{humanizeKey(key)}</span>
        </dt>
        <dd className={nested ? "mt-2" : "mt-2 break-words text-lg font-semibold tracking-tight tabular-nums"}>
          {nested ? Object.keys(value).length > 0 ? <StatisticsSummary data={value as Record<string, unknown>} path={`${path} ${key}`} /> : <span className="text-xs text-muted-foreground">No details available</span> : displayValue(value)}
        </dd>
      </div>;
    })}
  </dl>;
}
