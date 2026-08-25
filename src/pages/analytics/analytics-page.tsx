import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ChartCard } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  adminUsersApi,
  languagesApi,
  conceptsApi,
  translationsApi,
  submissionsApi,
} from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { bucketByDate, countByKey } from "@/lib/analytics";
import { CHART_COLORS } from "@/lib/chart-colors";
import { ROLE_LABEL } from "@/components/shared/status-badge";
import type { Role } from "@/types/api";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  fontSize: 12,
};

export function AnalyticsPage() {
  const usersQuery = useQuery({ queryKey: queryKeys.adminUsers, queryFn: adminUsersApi.list });
  const languagesQuery = useQuery({ queryKey: queryKeys.languages, queryFn: languagesApi.list });
  const conceptsQuery = useQuery({ queryKey: queryKeys.concepts(), queryFn: () => conceptsApi.list() });
  const translationsQuery = useQuery({ queryKey: queryKeys.translations(), queryFn: () => translationsApi.list() });
  const pendingQuery = useQuery({ queryKey: queryKeys.pendingSubmissions, queryFn: submissionsApi.listPending });

  const users = usersQuery.data ?? [];
  const languages = languagesQuery.data ?? [];
  const concepts = conceptsQuery.data ?? [];
  const translations = translationsQuery.data ?? [];
  const pending = pendingQuery.data ?? [];

  const userGrowthSeries = bucketByDate(users, (u) => u.createdAt, "day", 30);
  const submissionSeries = bucketByDate(pending, (s) => s.createdAt, "day", 30);
  const statusBreakdown = countByKey(users, (u) => u.status);
  const roleBreakdown = countByKey(
    users.flatMap((u) => u.roles.map((r) => ROLE_LABEL[r as Role] ?? r.replace("ROLE_", ""))),
    (r) => r,
  );
  const nativeLanguageBreakdown = countByKey(users, (u) => u.nativeLanguage).slice(0, 8);
  const preferredLanguageBreakdown = countByKey(users, (u) => u.preferredLanguage).slice(0, 8);
  const translationsByLanguage = countByKey(translations, (t) => t.languageName).slice(0, 8);
  const conceptsByCategory = countByKey(concepts, (c) => c.category?.name).slice(0, 8);
  const languageStatus = countByKey(languages, (l) => (l.active ? "Active" : "Inactive"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Trends and distributions computed from live API data — no simulated numbers."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="User Growth"
          description="New accounts registered per day, last 30 days"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={users.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={userGrowthSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval={4} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" name="New users" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Pending Submissions Created"
          description="Daily count of translations submitted and still awaiting review, last 30 days"
          isLoading={pendingQuery.isLoading}
          error={pendingQuery.error}
          onRetry={() => pendingQuery.refetch()}
          isEmpty={pending.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={submissionSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval={4} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" name="Submissions" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="User Status Breakdown"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={statusBreakdown.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {statusBreakdown.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={24} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Role Distribution"
          description="Accounts can hold more than one role, so totals may exceed user count"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={roleBreakdown.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={roleBreakdown} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Users" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Users by Native Language"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={nativeLanguageBreakdown.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={nativeLanguageBreakdown} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Users" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Users by Preferred (Learning) Language"
          isLoading={usersQuery.isLoading}
          error={usersQuery.error}
          onRetry={() => usersQuery.refetch()}
          isEmpty={preferredLanguageBreakdown.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={preferredLanguageBreakdown} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Users" fill={CHART_COLORS[4]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Translations by Language"
          isLoading={translationsQuery.isLoading}
          error={translationsQuery.error}
          onRetry={() => translationsQuery.refetch()}
          isEmpty={translationsByLanguage.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={translationsByLanguage} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Translations" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Concepts by Category"
          isLoading={conceptsQuery.isLoading}
          error={conceptsQuery.error}
          onRetry={() => conceptsQuery.refetch()}
          isEmpty={conceptsByCategory.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={conceptsByCategory} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Concepts" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Languages: Active vs Inactive"
          isLoading={languagesQuery.isLoading}
          error={languagesQuery.error}
          onRetry={() => languagesQuery.refetch()}
          isEmpty={languageStatus.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={languageStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {languageStatus.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={24} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card className="border-dashed">
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <CardTitle>Not available from the current API</CardTitle>
            <CardDescription className="mt-1">
              These are intentionally left out rather than filled with placeholder data.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p>• DAU / WAU / MAU and most-active-hour/day trends — require a platform-wide activity feed; GET /api/v1/activity only returns the signed-in user's own activity.</p>
          <p>• Approved vs. rejected submission trends — no endpoint lists reviewed submissions, only the pending queue.</p>
          <p>• Most-searched or most-viewed content — no search/view analytics endpoint exists.</p>
          <p>• User retention / returning-vs-new cohorts — would need historical login snapshots beyond `lastLoginAt`.</p>
          <p>See <span className="font-medium text-foreground">docs/BACKEND_GAPS.md</span> for the full list with suggested endpoints.</p>
        </CardContent>
      </Card>
    </div>
  );
}
