import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, UserCheck, ClipboardCheck, Languages, BookOpen, Type, ArrowRight, RefreshCw, Activity } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionStatusBadge } from "@/components/shared/status-badge";
import { adminUsersApi, languagesApi, categoriesApi, conceptsApi, submissionsApi, statisticsApi, translationsApi } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { periodGrowth } from "@/lib/analytics";
import { StatisticsSummary } from "@/components/shared/statistics-summary";
import { formatDistanceToNow } from "date-fns";

export function OverviewPage() {
  const usersQuery = useQuery({ queryKey: queryKeys.adminUsers, queryFn: adminUsersApi.list });
  const languagesQuery = useQuery({ queryKey: queryKeys.languages, queryFn: languagesApi.list });
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: categoriesApi.list });
  const conceptsQuery = useQuery({
    queryKey: queryKeys.concepts({ page: 0, size: 1 }),
    queryFn: () => conceptsApi.list({ page: 0, size: 1 }),
  });
  const pendingQuery = useQuery({
    queryKey: queryKeys.pendingSubmissions(0, 6),
    queryFn: () => submissionsApi.listPending({ page: 0, size: 6 }),
  });
  const rawStatsQuery = useQuery({ queryKey: queryKeys.adminStatistics, queryFn: statisticsApi.admin });
  // Dedicated fast count endpoint — returns a single number, no data download needed.
  const translationsCountQuery = useQuery({
    queryKey: queryKeys.translationsCount,
    queryFn: () => translationsApi.count(),
  });

  const anyError =
    usersQuery.error ||
    languagesQuery.error ||
    categoriesQuery.error ||
    conceptsQuery.error ||
    pendingQuery.error;

  const users = usersQuery.data ?? [];
  const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
  const userGrowth = periodGrowth(users, (u) => u.createdAt, 30);

  function refetchAll() {
    usersQuery.refetch();
    languagesQuery.refetch();
    categoriesQuery.refetch();
    conceptsQuery.refetch();
    pendingQuery.refetch();
    rawStatsQuery.refetch();
    translationsCountQuery.refetch();
  }

  if (anyError) {
    return <ErrorState error={anyError} onRetry={refetchAll} className="mt-10" />;
  }

  return (
    <>
      <div className="admin-workspace-enter space-y-6">
      <PageHeader
        title="Overview"
        description="Platform-wide snapshot computed live from the Koro API."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={users.length}
          icon={Users}
          isLoading={usersQuery.isLoading}
          deltaPercent={userGrowth.percent}
          deltaLabel="growth, last 30 days"
        />
        <StatCard label="Active Users" value={activeUsers} icon={UserCheck} isLoading={usersQuery.isLoading} />
        <StatCard
          label="Pending Submissions"
          value={pendingQuery.data?.totalElements ?? null}
          icon={ClipboardCheck}
          isLoading={pendingQuery.isLoading}
        />
        <StatCard label="Languages" value={languagesQuery.data?.length ?? null} icon={Languages} isLoading={languagesQuery.isLoading} />
        <StatCard label="Categories" value={categoriesQuery.data?.length ?? null} icon={BookOpen} isLoading={categoriesQuery.isLoading} />
        <StatCard label="Concepts" value={conceptsQuery.data?.totalElements ?? null} icon={BookOpen} isLoading={conceptsQuery.isLoading} />
        <StatCard label="Translations" value={translationsCountQuery.data ?? null} icon={Type} isLoading={translationsCountQuery.isLoading} />
        <StatCard
          label="New Users (30d)"
          value={userGrowth.currentPeriod}
          icon={Users}
          isLoading={usersQuery.isLoading}
          deltaPercent={userGrowth.percent}
          deltaLabel="vs prior 30 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Pending Submission Queue</CardTitle>
              <CardDescription>Most recent crowd-sourced translations awaiting review.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/submissions">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pendingQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (pendingQuery.data?.totalElements ?? 0) === 0 ? (
              <EmptyState title="Queue is clear" description="No submissions are waiting for review right now." />
            ) : (
              <div className="divide-y divide-border">
                {pendingQuery.data!.content.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {s.sourceWord} → {s.englishTranslation}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.submittedBy?.name} · {s.sourceLanguage?.name} ·{" "}
                        {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <SubmissionStatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader className="flex-row items-start justify-between gap-2 p-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="flex items-center gap-2 leading-snug"><Activity className="size-4 text-blue-500" />Platform Statistics</CardTitle>
              <CardDescription className="text-xs">Latest platform totals and activity.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" aria-label="Refresh platform statistics" disabled={rawStatsQuery.isFetching} onClick={() => { void rawStatsQuery.refetch(); }}>
              <RefreshCw className={`size-3.5 ${rawStatsQuery.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {rawStatsQuery.isLoading ? (
              <div role="status" aria-label="Loading platform statistics" className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : rawStatsQuery.error ? (
              <ErrorState error={rawStatsQuery.error} onRetry={() => rawStatsQuery.refetch()} />
            ) : !rawStatsQuery.data || Object.keys(rawStatsQuery.data).length === 0 ? (
              <EmptyState title="No data returned" description="Platform statistics will appear here when available." />
            ) : (
              <StatisticsSummary data={rawStatsQuery.data} />
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}
