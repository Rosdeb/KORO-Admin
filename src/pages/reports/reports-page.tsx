import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  adminUsersApi,
  languagesApi,
  categoriesApi,
  conceptsApi,
  translationsApi,
  submissionsApi,
} from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { bucketByDate, countByKey } from "@/lib/analytics";
import { CHART_COLORS } from "@/lib/chart-colors";
import { downloadCsv, formatNumber } from "@/lib/utils";
import type { TranslationResponse } from "@/types/api";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  fontSize: 12,
};

export function ReportsPage() {
  const usersQuery = useQuery({ queryKey: queryKeys.adminUsers, queryFn: adminUsersApi.list });
  const languagesQuery = useQuery({ queryKey: queryKeys.languages, queryFn: languagesApi.list });
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: categoriesApi.list });
  const conceptsQuery = useQuery({
    queryKey: queryKeys.concepts({ page: 0, size: 100 }),
    queryFn: () => conceptsApi.list({ page: 0, size: 100 }),
  });
  const translationsQuery = useQuery({ queryKey: queryKeys.translations({ size: 1000 }), queryFn: () => translationsApi.list({ size: 1000 }) });
  const pendingQuery = useQuery({
    queryKey: queryKeys.pendingSubmissions(0, 100),
    queryFn: () => submissionsApi.listPending({ page: 0, size: 100 }),
  });

  const anyError =
    usersQuery.error || languagesQuery.error || categoriesQuery.error || conceptsQuery.error || translationsQuery.error || pendingQuery.error;
  const anyLoading =
    usersQuery.isLoading || languagesQuery.isLoading || categoriesQuery.isLoading || conceptsQuery.isLoading || translationsQuery.isLoading || pendingQuery.isLoading;

  const users = usersQuery.data ?? [];
  const growthSeries = bucketByDate(users, (u) => u.createdAt, "week", 12);
  const languageUsage = countByKey(translationsQuery.data?.content ?? [], (t) => t.languageName);
  const categoryUsage = countByKey(conceptsQuery.data?.content ?? [], (c) => c.categoryName ?? c.category?.name);

  const summaryRows = useMemo(
    () => [
      { metric: "Total Users", value: users.length },
      { metric: "Active Users", value: users.filter((u) => u.status === "ACTIVE").length },
      { metric: "Suspended Users", value: users.filter((u) => u.status === "SUSPENDED").length },
      { metric: "Total Languages", value: languagesQuery.data?.length ?? 0 },
      { metric: "Active Languages", value: (languagesQuery.data ?? []).filter((l) => l.active).length },
      { metric: "Total Categories", value: categoriesQuery.data?.length ?? 0 },
      { metric: "Total Concepts", value: conceptsQuery.data?.totalElements ?? 0 },
      { metric: "Total Translations", value: translationsQuery.data?.totalElements ?? 0 },
      {   metric: "Verified Translations",   value: (translationsQuery.data?.content ?? []).filter((t: TranslationResponse) => t.verified
  ).length 
},
      { metric: "Pending Submissions", value: pendingQuery.data?.totalElements ?? 0 },
    ],
    [users, languagesQuery.data, categoriesQuery.data, conceptsQuery.data, translationsQuery.data, pendingQuery.data],
  );

  if (anyError && !anyLoading) return <ErrorState error={anyError} className="mt-10" />;

  return (
    <div className="space-y-4">
      

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="growth">User Growth</TabsTrigger>
          <TabsTrigger value="content">Content Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card className="border-0 shadow-sm bg-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Platform Summary</CardTitle>
                <CardDescription>Current totals across every resource.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsv("koro-platform-summary.csv", summaryRows)}
                disabled={anyLoading}
              >
                <Download className="size-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {anyLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryRows.map((row) => (
                      <TableRow key={row.metric}>
                        <TableCell className="font-medium">{row.metric}</TableCell>
                        <TableCell className="text-right">{formatNumber(row.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth">
          <Card className="border-0 shadow-sm bg-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>User Growth by Week</CardTitle>
                <CardDescription>New registrations per week, last 12 weeks.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCsv("koro-user-growth.csv", growthSeries.map((b) => ({ week: b.label, newUsers: b.count })))}
                disabled={usersQuery.isLoading}
              >
                <Download className="size-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {usersQuery.isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={growthSeries}>
                    <defs>
                      <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" name="New users" stroke={CHART_COLORS[0]} fill="url(#growthFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-0 shadow-sm bg-card">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Translations per Language</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv("koro-translations-by-language.csv", languageUsage)}
                  disabled={translationsQuery.isLoading}
                >
                  <Download className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {translationsQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Language</TableHead>
                        <TableHead className="text-right">Translations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {languageUsage.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-card">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle>Concepts per Category</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv("koro-concepts-by-category.csv", categoryUsage)}
                  disabled={conceptsQuery.isLoading}
                >
                  <Download className="size-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {conceptsQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Concepts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryUsage.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
