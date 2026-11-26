import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users, UserCheck, ClipboardCheck, Languages, BookOpen, Type,
  ArrowRight, RefreshCw, Activity, Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmissionStatusBadge } from "@/components/shared/status-badge";
import { adminUsersApi, languagesApi, categoriesApi, conceptsApi, submissionsApi, statisticsApi, translationsApi } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { periodGrowth } from "@/lib/analytics";
import { StatisticsSummary } from "@/components/shared/statistics-summary";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

const STAT_ICON_COLORS: Record<string, string> = {
  users:        "bg-blue-500/12 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  activeUsers:  "bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  pending:      "bg-amber-500/12 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  languages:    "bg-violet-500/12 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  categories:   "bg-pink-500/12 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400",
  concepts:     "bg-cyan-500/12 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400",
  translations: "bg-primary/10 text-primary",
  newUsers:     "bg-blue-500/12 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
};

export function OverviewPage() {
  const { user } = useAuth();
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
  const pendingCount = pendingQuery.data?.totalElements ?? 0;

  function refetchAll() {
    usersQuery.refetch();
    languagesQuery.refetch();
    categoriesQuery.refetch();
    conceptsQuery.refetch();
    pendingQuery.refetch();
    rawStatsQuery.refetch();
    translationsCountQuery.refetch();
  }

  const firstName = user?.name?.split(" ")[0] ?? "Admin";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (anyError) {
    return <ErrorState error={anyError} onRetry={refetchAll} className="mt-10" />;
  }

  return (
    <div className="admin-workspace-enter space-y-7">

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-emerald-600 p-6 text-primary-foreground shadow-md">
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary-foreground/80 text-sm font-medium mb-1">
              <Sparkles className="size-3.5" />
              {greeting}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{firstName} 👋</h2>
            <p className="mt-1 text-sm text-primary-foreground/75">
              Here's what's happening on the Korot platform today.
            </p>
          </div>
          {pendingCount > 0 && (
            <Button asChild size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm shrink-0">
              <Link to="/submissions">
                Review {pendingCount} pending {pendingCount === 1 ? "submission" : "submissions"}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
        {/* decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-12 right-24 size-36 rounded-full bg-white/5" />
      </div>

      {/* Page header row */}
      <PageHeader
        title="Overview"
        description="Platform-wide snapshot computed live from the Koro API."
        actions={
          <Button variant="outline" size="sm" onClick={refetchAll} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Stat grid — primary 4 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={users.length}
          icon={Users}
          iconColor={STAT_ICON_COLORS.users}
          isLoading={usersQuery.isLoading}
          deltaPercent={userGrowth.percent}
          deltaLabel="growth, last 30 days"
        />
        <StatCard
          label="Active Users"
          value={activeUsers}
          icon={UserCheck}
          iconColor={STAT_ICON_COLORS.activeUsers}
          isLoading={usersQuery.isLoading}
        />
        <StatCard
          label="Pending Submissions"
          value={pendingQuery.data?.totalElements ?? null}
          icon={ClipboardCheck}
          iconColor={pendingCount > 0 ? STAT_ICON_COLORS.pending : undefined}
          isLoading={pendingQuery.isLoading}
        />
        <StatCard
          label="New Users (30d)"
          value={userGrowth.currentPeriod}
          icon={Users}
          iconColor={STAT_ICON_COLORS.newUsers}
          isLoading={usersQuery.isLoading}
          deltaPercent={userGrowth.percent}
          deltaLabel="vs prior 30 days"
        />
      </div>

      {/* Stat grid — content */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Languages"
          value={languagesQuery.data?.length ?? null}
          icon={Languages}
          iconColor={STAT_ICON_COLORS.languages}
          isLoading={languagesQuery.isLoading}
        />
        <StatCard
          label="Categories"
          value={categoriesQuery.data?.length ?? null}
          icon={BookOpen}
          iconColor={STAT_ICON_COLORS.categories}
          isLoading={categoriesQuery.isLoading}
        />
        <StatCard
          label="Concepts"
          value={conceptsQuery.data?.totalElements ?? null}
          icon={BookOpen}
          iconColor={STAT_ICON_COLORS.concepts}
          isLoading={conceptsQuery.isLoading}
        />
        <StatCard
          label="Translations"
          value={translationsCountQuery.data ?? null}
          icon={Type}
          iconColor={STAT_ICON_COLORS.translations}
          isLoading={translationsCountQuery.isLoading}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Submission Queue */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">Submission Queue</CardTitle>
              <CardDescription className="mt-0.5">Most recent crowd-sourced translations awaiting review.</CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!pendingQuery.isLoading && pendingCount > 0 && (
                <Badge variant="secondary" className="font-semibold tabular-nums">
                  {pendingCount}
                </Badge>
              )}
              <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
                <Link to="/submissions">
                  View all <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {pendingQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : pendingCount === 0 ? (
              <EmptyState
                title="Queue is clear"
                description="No submissions are waiting for review right now."
              />
            ) : (
              <div className="divide-y divide-border -mx-6 px-6">
                {(pendingQuery.data?.content ?? []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground font-medium text-xs uppercase">
                        {s.sourceLanguage?.name?.slice(0, 2) ?? "??"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {s.sourceWord}
                          <span className="mx-1.5 text-muted-foreground font-normal">→</span>
                          {s.englishTranslation}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.submittedBy?.name} · {s.sourceLanguage?.name} ·{" "}
                          {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <SubmissionStatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform Statistics */}
        <Card className="self-start">
          <CardHeader className="flex-row items-start justify-between gap-2 pb-3">
            <div className="min-w-0 space-y-0.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-primary" />
                Platform Stats
              </CardTitle>
              <CardDescription className="text-xs">Latest platform totals and activity.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Refresh platform statistics"
              disabled={rawStatsQuery.isFetching}
              onClick={() => { void rawStatsQuery.refetch(); }}
            >
              <RefreshCw className={`size-3.5 ${rawStatsQuery.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {rawStatsQuery.isLoading ? (
              <div
                role="status"
                aria-label="Loading platform statistics"
                className="grid grid-cols-2 gap-2"
              >
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : rawStatsQuery.error ? (
              <ErrorState error={rawStatsQuery.error} onRetry={() => rawStatsQuery.refetch()} />
            ) : !rawStatsQuery.data || Object.keys(rawStatsQuery.data).length === 0 ? (
              <EmptyState
                title="No data returned"
                description="Platform statistics will appear here when available."
              />
            ) : (
              <StatisticsSummary data={rawStatsQuery.data} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
