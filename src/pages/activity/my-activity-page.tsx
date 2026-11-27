import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminPreferences } from "@/lib/admin-preferences";
import { RefreshButton } from "@/components/shared/refresh-button";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activityApi } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { countByKey } from "@/lib/analytics";
import { formatDateTime } from "@/lib/utils";
import { Globe, Laptop, Smartphone, Server, HelpCircle, Calendar as CalendarIcon, X } from "lucide-react";

/**
 * Parses raw device strings/User-Agents into clean labels & icons
 */
function parseDevice(deviceString?: string | null) {
  if (!deviceString || deviceString === "—") {
    return { name: "Unknown", icon: HelpCircle };
  }

  const str = deviceString.toLowerCase();

  if (str === "system") {
    return { name: "System", icon: Server };
  }

  let os = "Desktop";
  if (str.includes("macintosh") || str.includes("mac os")) os = "macOS";
  else if (str.includes("windows")) os = "Windows";
  else if (str.includes("android")) os = "Android";
  else if (str.includes("iphone") || str.includes("ipad")) os = "iOS";
  else if (str.includes("linux")) os = "Linux";

  let browser = "";
  if (str.includes("chrome") && !str.includes("edg")) browser = "Chrome";
  else if (str.includes("safari") && !str.includes("chrome")) browser = "Safari";
  else if (str.includes("firefox")) browser = "Firefox";
  else if (str.includes("edg")) browser = "Edge";

  const isMobile = str.includes("mobile") || str.includes("android") || str.includes("iphone");

  return {
    name: browser ? `${os} · ${browser}` : os,
    icon: isMobile ? Smartphone : Laptop,
  };
}

export function MyActivityPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getAdminPreferences().pageSize ?? 10);

  // Use the standard, safe pagination parameters expected by the backend
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [...queryKeys.activity, from, to, page - 1, pageSize],
    queryFn: () =>
      activityApi.list({
        from: from || undefined,
        to: to || undefined,
        page: page - 1,
        size: pageSize,
      }),
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  // Filter client-side by activity type and search query
  const filtered = useMemo(() => {
    let list = data?.content ?? [];

    if (selectedType) {
      list = list.filter((a) => a.activityType.toLowerCase() === selectedType.toLowerCase());
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (a) =>
          a.activityType.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [data, debouncedSearch, selectedType]);

  const byType = useMemo(() => countByKey(data?.content ?? [], (a) => a.activityType), [data]);

  const hasFilters = Boolean(from || to || selectedType || search);

  const handleResetFilters = () => {
    setFrom("");
    setTo("");
    setSelectedType(null);
    setSearch("");
    setPage(1);
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;
  }

  return (
    <div className="space-y-4">
      {/* Clean Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">My Activity</h1>
          <p className="text-xs text-muted-foreground">
            Audit history of your personal platform actions and edits
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data?.totalElements !== undefined && (
            <Badge variant="secondary" className="text-xs font-mono">
              {data.totalElements.toLocaleString()} recorded
            </Badge>
          )}

          <RefreshButton
            onRefresh={() => {
              void refetch();
            }}
            isRefreshing={isFetching}
          />
        </div>
      </div>

      {/* Minimal Inline Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search activity description…"
            className="h-8 text-xs w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Activity Type Dropdown */}
          {byType.length > 0 && (
            <Select
              value={selectedType ?? "ALL"}
              onValueChange={(val) => {
                setSelectedType(val === "ALL" ? null : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {byType.map((t) => (
                  <SelectItem key={t.name} value={t.name}>
                    {t.name} ({t.value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Compact Date Range Pickers */}
          <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2 py-1 text-xs">
            <CalendarIcon className="size-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">From:</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="h-6 w-28 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/20 px-2 py-1 text-xs">
            <CalendarIcon className="size-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">To:</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="h-6 w-28 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium px-2 py-1 transition-colors"
            >
              <X className="size-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Flat Minimal Table Container (No outside card design) */}
      <div className="overflow-hidden rounded-lg border border-border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No activity found"
              description={
                hasFilters
                  ? "Try clearing or widening your filters."
                  : "Actions you take on the platform will be logged here."
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[170px] text-xs">Type</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="w-[160px] text-xs">Device</TableHead>
                  <TableHead className="w-[130px] text-xs">IP Address</TableHead>
                  <TableHead className="w-[170px] text-right text-xs">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => {
                  const deviceMeta = parseDevice(log.device);
                  const DeviceIcon = deviceMeta.icon;

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[11px] font-mono font-normal bg-muted/20 border-border"
                        >
                          {log.activityType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {log.description ?? "—"}
                      </TableCell>

                      {/* Device Info */}
                      <TableCell className="text-muted-foreground text-xs">
                        <div
                          className="inline-flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded text-[11px] max-w-[150px] truncate"
                          title={log.device ?? "Unknown"}
                        >
                          <DeviceIcon className="size-3 shrink-0 text-muted-foreground" />
                          <span className="truncate">{deviceMeta.name}</span>
                        </div>
                      </TableCell>

                      {/* IP Address */}
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Globe className="size-3 text-muted-foreground/70" />
                          <span>
                            {log.ipAddress === "0:0:0:0:0:0:0:1"
                              ? "localhost"
                              : log.ipAddress ?? "—"}
                          </span>
                        </div>
                      </TableCell>

                      {/* When */}
                      <TableCell className="text-muted-foreground text-xs text-right whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="border-t border-border p-3 bg-muted/10">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={data?.totalElements ?? 0}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
