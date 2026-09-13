import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { leaderboardApi } from "@/api/leaderboard";
import type { AdminLeaderboardEntry, LeaderboardPeriod, LeaderboardType } from "@/api/leaderboard";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatNumber } from "@/lib/utils";
import type { SubmissionStatus } from "@/types/api";

const types: LeaderboardType[] = ["OVERALL", "SUBMISSIONS", "TRANSLATIONS"];
const periods: LeaderboardPeriod[] = ["ALL_TIME", "MONTHLY", "WEEKLY"];
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function LeaderboardPage() {
  const { hasRole } = useAuth();
  const canAudit = hasRole("ROLE_ADMIN", "ROLE_MODERATOR");
  const [view, setView] = useState<"public" | "audit">("public");
  const [type, setType] = useState<LeaderboardType>("OVERALL");
  const [period, setPeriod] = useState<LeaderboardPeriod>("ALL_TIME");
  const [status, setStatus] = useState<SubmissionStatus | "ALL">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<AdminLeaderboardEntry | null>(null);
  const publicQuery = useQuery({
    queryKey: queryKeys.leaderboardPublic(type, period, 20),
    queryFn: () => leaderboardApi.public(type, period),
    enabled: view === "public",
  });
  const adminParams = { status: status === "ALL" ? undefined : status, from: from || undefined, to: to || undefined, limit: 50 };
  const adminQuery = useQuery({
    queryKey: queryKeys.leaderboardAdmin(adminParams.status, adminParams.from, adminParams.to, 50),
    queryFn: () => leaderboardApi.admin(adminParams),
    enabled: view === "audit" && canAudit && (!from || !to || from <= to),
  });
  const detailQuery = useQuery({
    queryKey: queryKeys.leaderboardDetail(selected?.userId ?? ""),
    queryFn: () => leaderboardApi.detail(selected!.userId),
    enabled: canAudit && !!selected,
  });
  const activeQuery = view === "public" ? publicQuery : adminQuery;

  return <div className="space-y-4">
    <PageHeader title="Leaderboard" description="Contributor rankings and submission activity."
      actions={<RefreshButton onRefresh={() => activeQuery.refetch()} isRefreshing={activeQuery.isFetching} />} />
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant={view === "public" ? "default" : "outline"} onClick={() => setView("public")}>Rankings</Button>
      {canAudit && <Button size="sm" variant={view === "audit" ? "default" : "outline"} onClick={() => setView("audit")}>Contributor audit</Button>}
    </div>
    {view === "public" ? <>
      <div className="flex flex-wrap gap-2">
        <Select value={type} onValueChange={(v) => setType(v as LeaderboardType)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{types.map((value) => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}</SelectContent></Select>
        <Select value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{periods.map((value) => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}</SelectContent></Select>
      </div>
      {publicQuery.error ? <ErrorState error={publicQuery.error} onRetry={() => publicQuery.refetch()} /> : <Card><CardContent className="p-0">{publicQuery.isLoading ? <Loading /> : !publicQuery.data?.entries.length ? <EmptyState title="No rankings yet" description="No contributors for this period." /> : <Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Contributor</TableHead><TableHead>Language</TableHead><TableHead>Approved submissions</TableHead><TableHead>Translations</TableHead><TableHead>Score</TableHead><TableHead>Badge</TableHead></TableRow></TableHeader><TableBody>{publicQuery.data.entries.map((entry) => <TableRow key={entry.userId}><TableCell>{entry.rank}</TableCell><TableCell className="font-medium">{entry.name}</TableCell><TableCell>{entry.nativeLanguage ?? "—"}</TableCell><TableCell>{formatNumber(entry.submissionsCount)}</TableCell><TableCell>{formatNumber(entry.translationsCount)}</TableCell><TableCell>{formatNumber(entry.score)}</TableCell><TableCell>{entry.badge ?? "—"}</TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>}
      {publicQuery.data?.currentUserRank && <p className="text-sm text-muted-foreground">Your rank: #{publicQuery.data.currentUserRank.rank} · {formatNumber(publicQuery.data.currentUserRank.score)} points</p>}
    </> : canAudit && <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as SubmissionStatus | "ALL")}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{["ALL", "APPROVED", "PENDING", "REJECTED"].map((value) => <SelectItem key={value} value={value}>{value === "ALL" ? "All submissions" : label(value)}</SelectItem>)}</SelectContent></Select>
        <Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <Input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </div>
      {from && to && from > to ? <p className="text-sm text-destructive">The start date must be on or before the end date.</p> : adminQuery.error ? <ErrorState error={adminQuery.error} onRetry={() => adminQuery.refetch()} /> : <Card><CardContent className="p-0">{adminQuery.isLoading ? <Loading /> : !adminQuery.data?.length ? <EmptyState title="No contributors found" description="Try another status or date range." /> : <Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Contributor</TableHead><TableHead>Email</TableHead><TableHead>Account</TableHead><TableHead>Approved</TableHead><TableHead>Pending</TableHead><TableHead>Rejected</TableHead><TableHead>Translations</TableHead><TableHead>Score</TableHead><TableHead>Audit</TableHead></TableRow></TableHeader><TableBody>{adminQuery.data.map((entry) => <TableRow key={entry.userId}><TableCell>{entry.rank}</TableCell><TableCell className="font-medium">{entry.name}</TableCell><TableCell>{entry.email}</TableCell><TableCell>{entry.status}</TableCell><TableCell>{formatNumber(entry.approvedSubmissions)}</TableCell><TableCell>{formatNumber(entry.pendingSubmissions)}</TableCell><TableCell>{formatNumber(entry.rejectedSubmissions)}</TableCell><TableCell>{formatNumber(entry.translationActivities)}</TableCell><TableCell>{formatNumber(entry.score)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => setSelected(entry)}>Details</Button></TableCell></TableRow>)}</TableBody></Table>}</CardContent></Card>}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{selected?.name} · activity audit</DialogTitle></DialogHeader>{detailQuery.isLoading ? <Loading /> : detailQuery.error ? <ErrorState error={detailQuery.error} onRetry={() => detailQuery.refetch()} /> : detailQuery.data && <div className="space-y-3 text-sm"><p>{detailQuery.data.email}</p><p>Submissions: {formatNumber(detailQuery.data.totalSubmissions)} total · {formatNumber(detailQuery.data.approvedSubmissions)} approved · {formatNumber(detailQuery.data.pendingSubmissions)} pending · {formatNumber(detailQuery.data.rejectedSubmissions)} rejected</p><p className="font-medium">Calculated score: {formatNumber(detailQuery.data.calculatedScore)}</p><div className="space-y-1">{Object.entries(detailQuery.data.activityTypeBreakdown ?? {}).map(([activity, count]) => <div key={activity} className="flex justify-between"><span>{label(activity)}</span><span>{formatNumber(count)}</span></div>)}</div></div>}</DialogContent></Dialog>
    </>}
  </div>;
}
function Loading() { return <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>; }
