import { getAdminPreferences } from "@/lib/admin-preferences";
// import { useMemo, useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { PageHeader } from "@/components/shared/page-header";
// import { RefreshButton } from "@/components/shared/refresh-button";
// import { SearchInput } from "@/components/shared/search-input";
// import { EmptyState } from "@/components/shared/empty-state";
// import { ErrorState } from "@/components/shared/error-state";
// import { Pagination } from "@/components/shared/pagination";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Skeleton } from "@/components/ui/skeleton";
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { activityApi, statisticsApi } from "@/api";
// import { queryKeys } from "@/lib/query-keys";
// import { usePagination } from "@/hooks/use-pagination";
// import { useDebouncedValue } from "@/hooks/use-debounced-value";
// import { humanizeKey, formatNumber } from "@/lib/utils";
// import { countByKey } from "@/lib/analytics";

// export function MyActivityPage() {
//   const [from, setFrom] = useState("");
//   const [to, setTo] = useState("");
//   const { data, isLoading, isFetching, error, refetch } = useQuery({
//     queryKey: [...queryKeys.activity, from, to],
//     queryFn: () => activityApi.list({ from: from || undefined, to: to || undefined }),
//   });
//   const statsQuery = useQuery({ queryKey: queryKeys.activityStatistics, queryFn: statisticsApi.activity });

//   const [search, setSearch] = useState("");
//   const debouncedSearch = useDebouncedValue(search);

//   const filtered = useMemo(() => {
//     if (!debouncedSearch.trim()) return data ?? [];
//     const q = debouncedSearch.toLowerCase();
//     return (data ?? []).filter(
//       (a) => a.activityType.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q),
//     );
//   }, [data, debouncedSearch]);

//   const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(filtered, 15);

//   const byType = useMemo(() => countByKey(data ?? [], (a) => a.activityType), [data]);

//   if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

//   return (
//     <div className="space-y-4">
//       <PageHeader
//         title="My Activity"
//         description="Your own actions on the platform — logins, reviews, edits."
//         actions={
//           <RefreshButton
//             onRefresh={() => {
//               void refetch();
//               void statsQuery.refetch();
//             }}
//             isRefreshing={isFetching || statsQuery.isFetching}
//           />
//         }
//       />

//       <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
//         <Card className="lg:col-span-2">
//           <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end">
//             <div className="flex-1 space-y-1.5">
//               <Label htmlFor="search">Search</Label>
//               <SearchInput value={search} onChange={setSearch} placeholder="Search activity type or description…" />
//             </div>
//             <div className="space-y-1.5">
//               <Label htmlFor="from">From</Label>
//               <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
//             </div>
//             <div className="space-y-1.5">
//               <Label htmlFor="to">To</Label>
//               <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">Activity statistics (raw)</CardTitle>
//             <CardDescription className="text-xs">From GET /api/v1/activity/statistics</CardDescription>
//           </CardHeader>
//           <CardContent>
//             {statsQuery.isLoading ? (
//               <Skeleton className="h-16 w-full" />
//             ) : !statsQuery.data || Object.keys(statsQuery.data).length === 0 ? (
//               <p className="text-xs text-muted-foreground">No data returned.</p>
//             ) : (
//               <dl className="space-y-1.5">
//                 {Object.entries(statsQuery.data).map(([key, value]) => (
//                   <div key={key} className="flex items-center justify-between text-xs">
//                     <dt className="text-muted-foreground">{humanizeKey(key)}</dt>
//                     <dd className="font-medium">{typeof value === "number" ? formatNumber(value) : String(value)}</dd>
//                   </div>
//                 ))}
//               </dl>
//             )}
//           </CardContent>
//         </Card>
//       </div>

//       {byType.length > 0 && (
//         <Card>
//           <CardHeader className="pb-2">
//             <CardTitle className="text-sm">By activity type</CardTitle>
//             <CardDescription className="text-xs">Counted from the entries loaded above.</CardDescription>
//           </CardHeader>
//           <CardContent className="flex flex-wrap gap-1.5">
//             {byType.map((t) => (
//               <Badge key={t.name} variant="outline" className="font-normal">
//                 {t.name} <span className="text-muted-foreground">· {t.value}</span>
//               </Badge>
//             ))}
//           </CardContent>
//         </Card>
//       )}

//       <Card className="overflow-hidden">
//       <CardContent className="p-0">
//       {isLoading ? (
//         <div className="space-y-2 p-4">
//           {Array.from({ length: 6 }).map((_, i) => (
//             <Skeleton key={i} className="h-12 w-full" />
//           ))}
//         </div>
//       ) : filtered.length === 0 ? (
//         <div className="p-4">
//           <EmptyState title="No activity found" description="Try widening the date range or clearing filters." />
//         </div>
//       ) : (
//         <>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Type</TableHead>
//                 <TableHead>Description</TableHead>
//                 <TableHead>Device</TableHead>
//                 <TableHead>IP</TableHead>
//                 <TableHead>When</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {pageItems.map((log) => (
//                 <TableRow key={log.id}>
//                   <TableCell>
//                     <Badge variant="outline">{log.activityType}</Badge>
//                   </TableCell>
//                   <TableCell>{log.description ?? "—"}</TableCell>
//                   <TableCell className="text-muted-foreground">{log.device ?? "—"}</TableCell>
//                   <TableCell className="text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
//                   <TableCell className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//           <div className="border-t border-border p-3">
//             <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
//           </div>
//         </>
//       )}
//       </CardContent>
//       </Card>
//     </div>
//   );
// }


import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Card, CardContent } from "@/components/ui/card";
import { activityApi, statisticsApi } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { humanizeKey, formatNumber } from "@/lib/utils";
import { countByKey } from "@/lib/analytics";
import { Calendar, Filter, Check, Globe, Laptop, Smartphone, Server, HelpCircle } from "lucide-react";

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
  const statsQuery = useQuery({ queryKey: queryKeys.activityStatistics, queryFn: statisticsApi.activity });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const filtered = useMemo(() => {
    let list = data?.content ?? [];

    if (selectedType) {
      list = list.filter((a) => a.activityType.toLowerCase() === selectedType.toLowerCase());
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (a) => a.activityType.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [data, debouncedSearch, selectedType]);

  const byType = useMemo(() => countByKey(data?.content ?? [], (a) => a.activityType), [data]);

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">My Activity</h1>
          <p className="text-xs text-muted-foreground">Your own actions on the platform — logins, reviews, edits.</p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {statsQuery.isLoading ? (
            <Skeleton className="h-9 w-64 rounded-lg" />
          ) : statsQuery.data && Object.keys(statsQuery.data).length > 0 ? (
            <div className="flex max-w-full items-center gap-2 overflow-x-auto rounded-lg border bg-slate-50/50 p-1">
              {Object.entries(statsQuery.data).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">{humanizeKey(key)}:</span>
                  <span className="font-semibold text-slate-900">
                    {typeof value === "number" ? formatNumber(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <RefreshButton
            onRefresh={() => {
              void refetch();
              void statsQuery.refetch();
            }}
            isRefreshing={isFetching || statsQuery.isFetching}
          />
        </div>
      </div>

      {/* Toolbar Controls */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SearchInput 
                value={search} 
                onChange={setSearch} 
                placeholder="Search activity type or description…" 
              />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border bg-slate-50 px-2.5 py-1.5 sm:flex-none">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="from" className="text-xs font-medium text-muted-foreground">From</Label>
                <Input 
                  id="from" 
                  type="date" 
                  value={from} 
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 min-w-0 w-full border-0 bg-transparent p-0 text-xs focus-visible:ring-0 sm:w-auto" 
                />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border bg-slate-50 px-2.5 py-1.5 sm:flex-none">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="to" className="text-xs font-medium text-muted-foreground">To</Label>
                <Input 
                  id="to" 
                  type="date" 
                  value={to} 
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 min-w-0 w-full border-0 bg-transparent p-0 text-xs focus-visible:ring-0 sm:w-auto" 
                />
              </div>
              {(from || to || selectedType || search) && (
                <button
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setSelectedType(null);
                    setSearch("");
                    setPage(1);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {byType.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground font-medium">
                <Filter className="h-3.5 w-3.5" />
                <span>Filter by activity type:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedType(null);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    selectedType === null
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  All
                </button>
                {byType.map((t) => {
                  const isSelected = selectedType?.toLowerCase() === t.name.toLowerCase();
                  return (
                    <button
                      key={t.name}
                      onClick={() => {
                        setSelectedType(isSelected ? null : t.name);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      <span>{t.name}</span>
                      <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        {t.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No activity found" description="Try widening the date range or clearing filters." />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[180px]">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[180px]">Device</TableHead>
                    <TableHead className="w-[140px]">IP Address</TableHead>
                    <TableHead className="w-[180px] text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => {
                    const deviceMeta = parseDevice(log.device);
                    const DeviceIcon = deviceMeta.icon;

                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell>
                          <Badge variant="outline" className="font-medium bg-slate-50 border-slate-200">
                            {log.activityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {log.description ?? "—"}
                        </TableCell>
                        
                        {/* Beautiful Device Cell */}
                        <TableCell className="text-slate-700 text-xs">
                          <div 
                            className="inline-flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-md max-w-[170px] truncate"
                            title={log.device ?? "Unknown"}
                          >
                            <DeviceIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                            <span className="truncate font-medium">{deviceMeta.name}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-muted-foreground text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{log.ipAddress === "0:0:0:0:0:0:0:1" ? "localhost" : log.ipAddress ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs text-right whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="border-t border-border p-3 bg-slate-50/30">
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
        </CardContent>
      </Card>
    </div>
  );
}
