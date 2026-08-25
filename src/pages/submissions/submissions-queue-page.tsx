import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submissionsApi } from "@/api";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { TranslationSubmission } from "@/types/api";

type ReviewAction = "approve" | "reject";

export function SubmissionsQueuePage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.pendingSubmissions,
    queryFn: submissionsApi.listPending,
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [reviewTarget, setReviewTarget] = useState<{ submission: TranslationSubmission; action: ReviewAction } | null>(null);
  const [reviewerNote, setReviewerNote] = useState("");

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return data ?? [];
    const q = debouncedSearch.toLowerCase();
    return (data ?? []).filter(
      (s) =>
        s.suggestedTranslation.toLowerCase().includes(q) ||
        s.concept?.name?.toLowerCase().includes(q) ||
        s.submittedBy?.name?.toLowerCase().includes(q),
    );
  }, [data, debouncedSearch]);

  const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(filtered, 10);

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: ReviewAction; note: string }) =>
      action === "approve" ? submissionsApi.approve(id, { reviewerNote: note }) : submissionsApi.reject(id, { reviewerNote: note }),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<TranslationSubmission[]>(queryKeys.pendingSubmissions, (prev) =>
        prev?.filter((s) => s.id !== variables.id),
      );
      setReviewTarget(null);
      setReviewerNote("");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to review submission"),
  });

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Submission Queue"
        description="Crowd-sourced translations waiting for review."
        actions={<RefreshButton onRefresh={() => refetch()} isRefreshing={isFetching} />}
      />

      <div className="flex items-start gap-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Only the pending queue is exposed by the API — there's no endpoint to list already-approved or rejected
          submissions, so no history view is shown here. See docs/BACKEND_GAPS.md.
        </span>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search by concept, translation, or submitter…" className="max-w-sm" />

      <Card className="overflow-hidden">
      <CardContent className="p-0">
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-4">
          <EmptyState title="Queue is clear" description="No submissions are waiting for review right now." />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concept</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Suggested translation</TableHead>
                <TableHead>Submitted by</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.concept?.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.language?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{s.suggestedTranslation}</p>
                      {s.pronunciation && <p className="text-xs text-muted-foreground">{s.pronunciation}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.submittedBy?.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-success/40 text-success hover:bg-success/10 hover:text-success"
                        onClick={() => {
                          setReviewTarget({ submission: s, action: "approve" });
                          setReviewerNote("");
                        }}
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setReviewTarget({ submission: s, action: "reject" });
                          setReviewerNote("");
                        }}
                      >
                        <X className="size-4" /> Reject
                      </Button>
                    </div>
                  </TableCell>
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

      <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewTarget?.action === "approve" ? "Approve submission" : "Reject submission"}</DialogTitle>
            <DialogDescription>
              {reviewTarget?.submission.concept?.name} → "{reviewTarget?.submission.suggestedTranslation}" (
              {reviewTarget?.submission.language?.name})
            </DialogDescription>
          </DialogHeader>

          {reviewTarget && (
            <Card className="bg-muted/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Submission details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 pt-0 text-sm">
                <p>
                  <span className="text-muted-foreground">Submitted by: </span>
                  {reviewTarget.submission.submittedBy?.name} ({reviewTarget.submission.submittedBy?.email})
                </p>
                {reviewTarget.submission.notes && (
                  <p>
                    <span className="text-muted-foreground">Notes: </span>
                    {reviewTarget.submission.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reviewerNote">Reviewer note (optional)</Label>
            <Textarea
              id="reviewerNote"
              rows={3}
              placeholder="Add context for this decision…"
              value={reviewerNote}
              onChange={(e) => setReviewerNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)} disabled={reviewMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant={reviewTarget?.action === "reject" ? "destructive" : "default"}
              disabled={reviewMutation.isPending}
              onClick={() =>
                reviewTarget &&
                reviewMutation.mutate({ id: reviewTarget.submission.id, action: reviewTarget.action, note: reviewerNote })
              }
            >
              {reviewMutation.isPending ? "Submitting…" : reviewTarget?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
