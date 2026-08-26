import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { activityApi, statisticsApi } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { humanizeKey, formatNumber } from "@/lib/utils";
import { countByKey } from "@/lib/analytics";

export function MyActivityPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [...queryKeys.activity, from, to],
    queryFn: () => activityApi.list({ from: from || undefined, to: to || undefined }),
  });
  const statsQuery = useQuery({ queryKey: queryKeys.activityStatistics, queryFn: statisticsApi.activity });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return data ?? [];
    const q = debouncedSearch.toLowerCase();
    return (data ?? []).filter(
      (a) => a.activityType.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q),
    );
  }, [data, debouncedSearch]);

  const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(filtered, 15);

  const byType = useMemo(() => countByKey(data ?? [], (a) => a.activityType), [data]);

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Activity"
        description="Your own actions on the platform — logins, reviews, edits."
        actions={
          <RefreshButton
            onRefresh={() => {
              void refetch();
              void statsQuery.refetch();
            }}
            isRefreshing={isFetching || statsQuery.isFetching}
          />
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search">Search</Label>
              <SearchInput value={search} onChange={setSearch} placeholder="Search activity type or description…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Activity statistics (raw)</CardTitle>
            <CardDescription className="text-xs">From GET /api/v1/activity/statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : !statsQuery.data || Object.keys(statsQuery.data).length === 0 ? (
              <p className="text-xs text-muted-foreground">No data returned.</p>
            ) : (
              <dl className="space-y-1.5">
                {Object.entries(statsQuery.data).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <dt className="text-muted-foreground">{humanizeKey(key)}</dt>
                    <dd className="font-medium">{typeof value === "number" ? formatNumber(value) : String(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      {byType.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By activity type</CardTitle>
            <CardDescription className="text-xs">Counted from the entries loaded above.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {byType.map((t) => (
              <Badge key={t.name} variant="outline" className="font-normal">
                {t.name} <span className="text-muted-foreground">· {t.value}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
      <CardContent className="p-0">
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-4">
          <EmptyState title="No activity found" description="Try widening the date range or clearing filters." />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline">{log.activityType}</Badge>
                  </TableCell>
                  <TableCell>{log.description ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{log.device ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-border p-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
          </div>
        </>
      )}
      </CardContent>
      </Card>
    </div>
  );
}
