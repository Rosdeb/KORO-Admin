import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshButton } from "@/components/shared/refresh-button";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { GitHubActivityCalendar } from "@/components/shared/github-activity-calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activityApi } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Globe, Laptop, Smartphone, Server, HelpCircle, X } from "lucide-react";
import { getAdminPreferences } from "@/lib/admin-preferences";
import { format } from "date-fns";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date") ?? null;

  const [selectedDate, setSelectedDate] = useState<string | null>(dateParam);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getAdminPreferences().pageSize ?? 15);

  // Fetch full activity dataset for both the heatmap and the table
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [...queryKeys.activity, "all"],
    queryFn: () => activityApi.list({ page: 0, size: 500 }),
    staleTime: 30_000,
  });

  const allActivities = useMemo(() => data?.content ?? [], [data]);

  // Extract distinct activity types for the filter dropdown
  const activityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const act of allActivities) {
      if (act.activityType) set.add(act.activityType);
    }
    return Array.from(set).sort();
  }, [allActivities]);

  // Handle calendar cell click
  const handleCalendarSelect = (dateStr: string | null) => {
    setSelectedDate(dateStr);
    setPage(1);
    if (dateStr) {
      setSearchParams({ date: dateStr });
    } else {
      setSearchParams({});
    }
  };

  // Filter activities reliably client-side
  const filteredActivities = useMemo(() => {
    let list = allActivities;

    if (selectedDate) {
      list = list.filter((a) => a.createdAt && a.createdAt.startsWith(selectedDate));
    }

    if (selectedType) {
      list = list.filter(
        (a) => a.activityType && a.activityType.toLowerCase() === selectedType.toLowerCase(),
      );
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (a) =>
          (a.activityType && a.activityType.toLowerCase().includes(q)) ||
          (a.description && a.description.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [allActivities, selectedDate, selectedType, debouncedSearch]);

  // Client-side pagination
  const totalElements = filteredActivities.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginatedList = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, clampedPage, pageSize]);

  const hasActiveFilters = Boolean(selectedDate || selectedType || search.trim());

  const handleResetFilters = () => {
    setSelectedDate(null);
    setSelectedType(null);
    setSearch("");
    setPage(1);
    setSearchParams({});
  };

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">My Activity</h1>
          <p className="text-xs text-muted-foreground">
            Personal audit history and contributions on the platform
          </p>
        </div>

        <RefreshButton
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
      </div>

      {/* Clean GitHub Activity Calendar */}
      <GitHubActivityCalendar
        activities={allActivities}
        isLoading={isLoading}
        weeksToShow={28}
        selectedDate={selectedDate}
        onSelectDate={handleCalendarSelect}
        title="Contribution Activity"
      />

      {/* Minimal Inline Filter Toolbar (No nested cards) */}
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

        <div className="flex items-center gap-2">
          {activityTypes.length > 0 && (
            <Select
              value={selectedType ?? "ALL"}
              onValueChange={(val) => {
                setSelectedType(val === "ALL" ? null : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[140px] font-medium">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {activityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
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

      {/* Activity Log Table */}
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No activity records found"
                description={
                  hasActiveFilters
                    ? "Try clearing the active filters to see all recorded activities."
                    : "Your actions will appear here once you make changes or approvals."
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[170px] text-xs">Action Type</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="w-[160px] text-xs">Device</TableHead>
                    <TableHead className="w-[130px] text-xs">IP Address</TableHead>
                    <TableHead className="w-[160px] text-right text-xs">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedList.map((log) => {
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
                          {log.createdAt
                            ? format(new Date(log.createdAt), "MMM d, yyyy · h:mm a")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="border-t border-border/60 p-3 bg-muted/10">
                <Pagination
                  page={clampedPage}
                  pageSize={pageSize}
                  total={totalElements}
                  onPageChange={(p) => setPage(p)}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
