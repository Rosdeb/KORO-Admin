import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VerticalBarChart, DistributionChart, LanguageDonutChart } from "@/components/shared/analytics-charts";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard } from "@/components/shared/chart-card";
import {
  adminUsersApi,
  languagesApi,
  conceptsApi,
  translationsApi,
  submissionsApi,
} from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { bucketByDate, countByKey } from "@/lib/analytics";

import { ROLE_LABEL } from "@/components/shared/status-badge";
import type { Role } from "@/types/api";

import { ANALYTICS_COLORS as CHART_COLORS } from "@/lib/analytics-colors";

function PeriodSelect({ days, onChange, label }: { days: number; onChange: (days: number) => void; label: string }) {
  return (
    <div className="relative shrink-0">
      <select aria-label={label} value={days} onChange={(event) => onChange(Number(event.target.value))} className="h-8 cursor-pointer appearance-none rounded-md border border-input bg-background py-1 pl-3 pr-8 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs">
        {[7, 30, 90].map((period) => <option key={period} value={period}>Last {period} Days</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-3 text-muted-foreground" />
    </div>
  );
}


export function AnalyticsPage() {
  const [growthDays, setGrowthDays] = useState(7);
  const [activityDays, setActivityDays] = useState(7);
  const usersQuery = useQuery({ queryKey: queryKeys.adminUsers, queryFn: adminUsersApi.list });
  const languagesQuery = useQuery({ queryKey: queryKeys.languages, queryFn: languagesApi.list });
  const conceptsQuery = useQuery({
    queryKey: queryKeys.concepts({ page: 0, size: 100 }),
    queryFn: () => conceptsApi.list({ page: 0, size: 100 }),
  });
  const translationsQuery = useQuery({ queryKey: queryKeys.translations({ size: 1000 }), queryFn: () => translationsApi.list({ size: 1000 }) });
  const pendingQuery = useQuery({
    queryKey: queryKeys.pendingSubmissions(0, 100),
    queryFn: () => submissionsApi.listPending({ page: 0, size: 100 }),
  });

  const users = usersQuery.data ?? [];
  const languages = languagesQuery.data ?? [];
  const concepts = conceptsQuery.data?.content ?? [];
  const translations = translationsQuery.data?.content ?? [];
  const pending = pendingQuery.data?.content ?? [];

  const userGrowthSeries = bucketByDate(users, (u) => u.createdAt, "day", growthDays);
  const activityUsers = bucketByDate(users, (u) => u.createdAt, "day", activityDays);
  const submissionSeries = bucketByDate(pending, (s) => s.createdAt, "day", activityDays).map((bucket, index) => ({
    ...bucket, users: activityUsers[index].count,
  }));
  const statusBreakdown = countByKey(users, (u) => u.status);
  const roleBreakdown = countByKey(
    users.flatMap((u) => u.roles.map((r) => ROLE_LABEL[r as Role] ?? r.replace("ROLE_", ""))),
    (r) => r,
  );
  const nativeLanguageBreakdown = countByKey(users, (u) => u.nativeLanguage).slice(0, 8);
  const preferredLanguageBreakdown = countByKey(users, (u) => u.preferredLanguage).slice(0, 8);
  const translationsByLanguage = countByKey(translations, (t) => t.languageName).slice(0, 8);
  const conceptsByCategory = countByKey(concepts, (c) => c.categoryName ?? c.category?.name).slice(0, 8);
  const languageStatus = countByKey(languages, (l) => (l.active ? "Active" : "Inactive"));

  return (
    <div className="space-y-6">
      <PageHeader
        title=""
        description=""/>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [&_h3]:font-medium [&_h3]:leading-snug">
        <ChartCard
          title="User Growth"
          actions={<PeriodSelect days={growthDays} onChange={setGrowthDays} label="User growth period" />}
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={users.length === 0}
        >
          <VerticalBarChart label="Daily new user registrations" labels={userGrowthSeries.map((d) => d.label)} series={[{ name: "New users", color: CHART_COLORS[0], values: userGrowthSeries.map((d) => d.count) }]} />
        </ChartCard>

        <ChartCard
          title="Activity overview"
          actions={<PeriodSelect days={activityDays} onChange={setActivityDays} label="Activity period" />}
          legend={<div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#46a564]" />New users</span>
            <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#ee78be]" />Pending submissions</span>
          </div>}
          isLoading={pendingQuery.isLoading || usersQuery.isLoading}
          error={pendingQuery.error || usersQuery.error}
          onRetry={() => { void pendingQuery.refetch(); void usersQuery.refetch(); }}
          isEmpty={pending.length === 0 && users.length === 0}
        >
          <VerticalBarChart label="Daily account and pending submission activity" labels={submissionSeries.map((d) => d.label)} series={[{ name: "New users", color: CHART_COLORS[0], values: submissionSeries.map((d) => d.users) }, { name: "Pending submissions", color: CHART_COLORS[1], values: submissionSeries.map((d) => d.count) }]} stacked />
        </ChartCard>

        <ChartCard
          title="User Status Breakdown"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={statusBreakdown.length === 0}
        >
          <VerticalBarChart label="User status breakdown" labels={statusBreakdown.map((d) => d.name)} series={[{ name: "Users", color: CHART_COLORS[2], values: statusBreakdown.map((d) => d.value) }]} />
        </ChartCard>

        <ChartCard
          title="Role Distribution"
          description="Accounts can hold more than one role, so totals may exceed user count"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={roleBreakdown.length === 0}
        >
          <DistributionChart label="Role distribution" data={roleBreakdown} color={CHART_COLORS[3]} />
        </ChartCard>

        <ChartCard
          title="Users by Native Language"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={nativeLanguageBreakdown.length === 0}
        >
          <VerticalBarChart label="Users by native language" labels={nativeLanguageBreakdown.map((d) => d.name)} series={[{ name: "Users", color: CHART_COLORS[0], values: nativeLanguageBreakdown.map((d) => d.value) }]} multicolor rounded />
        </ChartCard>

        <ChartCard
          title="Users by Preferred (Learning) Language"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={preferredLanguageBreakdown.length === 0}
        >
          <DistributionChart label="Users by learning language" data={preferredLanguageBreakdown} color={CHART_COLORS[4]} outlined />
        </ChartCard>

        <ChartCard
          title="Translations by Language"
          isLoading={translationsQuery.isLoading}
          error={translationsQuery.error}
          onRetry={() => translationsQuery.refetch()}
          isEmpty={translationsByLanguage.length === 0}
        >
          <DistributionChart label="Translations by language" data={translationsByLanguage} color={CHART_COLORS[2]} />
        </ChartCard>

        <ChartCard
          title="Concepts by Category"
          isLoading={conceptsQuery.isLoading}
          error={conceptsQuery.error}
          onRetry={() => conceptsQuery.refetch()}
          isEmpty={conceptsByCategory.length === 0}
        >
          <DistributionChart label="Concepts by category" data={conceptsByCategory} color={CHART_COLORS[7]} />
        </ChartCard>

        <ChartCard
          title="Languages: Active vs Inactive"
          isLoading={languagesQuery.isLoading}
          error={languagesQuery.error}
          onRetry={() => languagesQuery.refetch()}
          isEmpty={languageStatus.length === 0}
        >
          <LanguageDonutChart data={languageStatus} />
        </ChartCard>
      </div>
    </div>
  );
}
