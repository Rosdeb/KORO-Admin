import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, UserCheck, ClipboardCheck, Languages, BookOpen, Type, ArrowRight } from "lucide-react";
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
import { formatNumber, humanizeKey } from "@/lib/utils";
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

  const isLoading =
    usersQuery.isLoading ||
    languagesQuery.isLoading ||
    categoriesQuery.isLoading ||
    conceptsQuery.isLoading ||
    pendingQuery.isLoading;

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

  if (anyError && !isLoading) {
    return <ErrorState error={anyError} onRetry={refetchAll} className="mt-10" />;
  }

  return (
    <div className="space-y-6">
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

        <Card>
          <CardHeader>
            <CardTitle>Backend Statistics (raw)</CardTitle>
            <CardDescription>Unmodified payload from GET /api/v1/admin/statistics.</CardDescription>
          </CardHeader>
          <CardContent>
            {rawStatsQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : rawStatsQuery.error ? (
              <ErrorState error={rawStatsQuery.error} onRetry={() => rawStatsQuery.refetch()} />
            ) : !rawStatsQuery.data || Object.keys(rawStatsQuery.data).length === 0 ? (
              <EmptyState title="No data returned" description="The endpoint responded with an empty object." />
            ) : (
              <dl className="space-y-2">
                {Object.entries(rawStatsQuery.data).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-2 text-sm">
                    <dt className="text-muted-foreground">{humanizeKey(key)}</dt>
                    <dd className="font-medium">
                      {typeof value === "number" ? formatNumber(value) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
