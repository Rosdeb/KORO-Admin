import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, Volume2, Quote, StickyNote, Eye } from "lucide-react";
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
import type { SubmissionApproveResponse, TranslationSubmission } from "@/types/api";

type ReviewAction = "view" | "approve" | "reject";

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
  const [rejectionReason, setRejectionReason] = useState("");

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return data ?? [];
    const q = debouncedSearch.toLowerCase();
    return (data ?? []).filter(
      (s) =>
        s.sourceWord.toLowerCase().includes(q) ||
        s.banglaTranslation.toLowerCase().includes(q) ||
        s.englishTranslation.toLowerCase().includes(q) ||
        s.category?.name?.toLowerCase().includes(q) ||
        s.sourceLanguage?.name?.toLowerCase().includes(q) ||
        s.submittedBy?.name?.toLowerCase().includes(q),
    );
  }, [data, debouncedSearch]);

  const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(filtered, 10);

  const reviewMutation = useMutation<
    SubmissionApproveResponse | TranslationSubmission,
    unknown,
    { id: string; action: Exclude<ReviewAction, "view">; note: string; reason: string }
  >({
    mutationFn: ({ id, action, note, reason }) =>
      action === "approve"
        ? submissionsApi.approve(id, { reviewerNote: note || undefined })
        : submissionsApi.reject(id, { reviewerNote: note || undefined, rejectionReason: reason }),
    onSuccess: (result, variables) => {
      queryClient.setQueryData<TranslationSubmission[]>(queryKeys.pendingSubmissions, (prev) =>
        prev?.filter((s) => s.id !== variables.id),
      );
      if (variables.action === "approve" && "translationsSaved" in result) {
        const count = result.translationsSaved.length;
        toast.success(`Submission approved — ${count} dictionary ${count === 1 ? "entry" : "entries"} created.`, {
          description: result.translationsSaved.join(" · "),
        });
      } else {
        toast.success("Submission rejected.");
      }
      closeDialog();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to review submission"),
  });

  function openReview(submission: TranslationSubmission, action: ReviewAction) {
    setReviewTarget({ submission, action });
    setReviewerNote("");
    setRejectionReason("");
  }

  function closeDialog() {
    setReviewTarget(null);
    setReviewerNote("");
    setRejectionReason("");
  }

  function switchAction(action: ReviewAction) {
    setReviewTarget((prev) => (prev ? { ...prev, action } : prev));
  }

  const rejectReasonMissing = reviewTarget?.action === "reject" && !rejectionReason.trim();

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Translation Submissions"
        description="Community-submitted dictionary words waiting for review."
        actions={<RefreshButton onRefresh={() => refetch()} isRefreshing={isFetching} />}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by word, meaning, category, language, or submitter…"
        className="max-w-sm"
      />

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
                <TableHead>Source word</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Bangla</TableHead>
                <TableHead>English</TableHead>
                <TableHead>Submitted by</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{s.sourceWord}</span>
                      <Badge variant="outline">{s.sourceLanguage?.name}</Badge>
                    </div>
                    {s.pronunciation && <p className="text-xs text-muted-foreground">/{s.pronunciation}/</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.category?.name}</Badge>
                  </TableCell>
                  <TableCell>{s.banglaTranslation}</TableCell>
                  <TableCell>{s.englishTranslation}</TableCell>
                  <TableCell className="text-muted-foreground">{s.submittedBy?.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openReview(s, "view")}>
                        <Eye className="size-4" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-success/40 text-success hover:bg-success/10 hover:text-success"
                        onClick={() => openReview(s, "approve")}
                      >
                        <Check className="size-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => openReview(s, "reject")}
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

      <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reviewTarget?.action === "view"
                ? "Submission details"
                : reviewTarget?.action === "approve"
                  ? "Approve submission"
                  : "Reject submission"}
            </DialogTitle>
            <DialogDescription>
              {reviewTarget?.action === "view"
                ? "Full details of this pending submission."
                : reviewTarget?.action === "approve"
                  ? "This word will be published to the official dictionary immediately."
                  : "The contributor will see your rejection reason on their submission."}
            </DialogDescription>
          </DialogHeader>

          {reviewTarget && (
            <div className="space-y-3">
              <Card className="bg-muted/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Word information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-0 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p>{reviewTarget.submission.category?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Source language</p>
                    <p>{reviewTarget.submission.sourceLanguage?.name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Source word</p>
                    <p className="font-medium">{reviewTarget.submission.sourceWord}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Translation</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-0 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Bangla</p>
                    <p>{reviewTarget.submission.banglaTranslation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">English</p>
                    <p>{reviewTarget.submission.englishTranslation}</p>
                  </div>
                </CardContent>
              </Card>

              {(reviewTarget.submission.pronunciation ||
                reviewTarget.submission.exampleSentence ||
                reviewTarget.submission.notes) && (
                <Card className="bg-muted/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Additional information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 pt-0 text-sm">
                    {reviewTarget.submission.pronunciation && (
                      <p className="flex items-start gap-1.5">
                        <Volume2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        {reviewTarget.submission.pronunciation}
                      </p>
                    )}
                    {reviewTarget.submission.exampleSentence && (
                      <p className="flex items-start gap-1.5">
                        <Quote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        {reviewTarget.submission.exampleSentence}
                      </p>
                    )}
                    {reviewTarget.submission.notes && (
                      <p className="flex items-start gap-1.5">
                        <StickyNote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        {reviewTarget.submission.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground">
                Submitted by {reviewTarget.submission.submittedBy?.name} ({reviewTarget.submission.submittedBy?.email})
              </p>
            </div>
          )}

          {reviewTarget?.action === "reject" && (
            <div className="space-y-1.5">
              <Label htmlFor="rejectionReason">
                Rejection reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                rows={2}
                placeholder="e.g. Duplicate of an existing entry."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}

          {reviewTarget?.action !== "view" && (
            <div className="space-y-1.5">
              <Label htmlFor="reviewerNote">Reviewer note (optional)</Label>
              <Textarea
                id="reviewerNote"
                rows={2}
                placeholder="Add context for this decision…"
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            {reviewTarget?.action === "view" ? (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => switchAction("reject")}
                >
                  <X className="size-4" /> Reject
                </Button>
                <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => switchAction("approve")}>
                  <Check className="size-4" /> Approve
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={closeDialog} disabled={reviewMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  variant={reviewTarget?.action === "reject" ? "destructive" : "default"}
                  disabled={reviewMutation.isPending || rejectReasonMissing}
                  onClick={() =>
                    reviewTarget &&
                    reviewTarget.action !== "view" &&
                    reviewMutation.mutate({
                      id: reviewTarget.submission.id,
                      action: reviewTarget.action,
                      note: reviewerNote,
                      reason: rejectionReason,
                    })
                  }
                >
                  {reviewMutation.isPending ? "Submitting…" : reviewTarget?.action === "approve" ? "Approve" : "Reject"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
