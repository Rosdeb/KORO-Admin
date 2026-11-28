import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/utils";
import {
  Mail,
  Inbox,
  Clock,
  CheckCircle2,
  MailCheck,
  Archive,
  Download,
  Eye,
  Reply,
  Trash2,
  MoreHorizontal,
  Send,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatCard } from "@/components/shared/stat-card";
import { ContactMessageStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contactMessagesApi } from "@/api/contact-messages";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import { downloadCsv } from "@/lib/utils";
import type {
  ContactMessage,
  ContactMessageReplyRequest,
  ContactMessageStatus,
} from "@/types/api";

const STATUS_TABS: { label: string; value: ContactMessageStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Read", value: "READ" },
  { label: "Replied", value: "REPLIED" },
  { label: "Archived", value: "ARCHIVED" },
];

export function ContactMessagesPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ROLE_ADMIN");
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<ContactMessageStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  // Detail Modal State
  const [viewingMessageId, setViewingMessageId] = useState<string | null>(null);

  // Reply Modal State
  const [replyTarget, setReplyTarget] = useState<ContactMessage | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessageText, setReplyMessageText] = useState("");

  // Delete Confirmation State
  const [pendingDelete, setPendingDelete] = useState<ContactMessage | null>(null);

  // Fetch Statistics
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: queryKeys.contactMessageStats,
    queryFn: contactMessagesApi.getStatistics,
  });

  // Fetch Messages List
  const {
    data: listData,
    isLoading: isListLoading,
    isFetching: isListFetching,
    error: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: queryKeys.contactMessages({
      status: statusFilter,
      search: debouncedSearch,
    }),
    queryFn: () =>
      contactMessagesApi.list({
        status: statusFilter,
        search: debouncedSearch.trim() || undefined,
      }),
  });

  // Fetch single message detail when modal is active (and automatically mark read if pending)
  const {
    data: activeDetail,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: queryKeys.contactMessageDetail(viewingMessageId ?? ""),
    queryFn: () => contactMessagesApi.get(viewingMessageId!, true),
    enabled: Boolean(viewingMessageId),
  });

  // Handle both array or PageResponse responses gracefully
  const rawItems = useMemo<ContactMessage[]>(() => {
    if (!listData) return [];
    if (Array.isArray(listData)) return listData;
    if ("content" in listData && Array.isArray(listData.content)) return listData.content;
    return [];
  }, [listData]);

  // Client-side filtering fallback for smooth UX
  const filteredItems = useMemo(() => {
    let items = rawItems;
    if (statusFilter !== "ALL") {
      items = items.filter((m) => m.status === statusFilter);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q),
      );
    }
    return items;
  }, [rawItems, statusFilter, debouncedSearch]);

  const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(filteredItems, 10);

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ContactMessageReplyRequest }) =>
      contactMessagesApi.reply(id, payload),
    onSuccess: (res) => {
      toast.success(res.message || "Reply sent successfully!");
      setReplyTarget(null);
      setReplySubject("");
      setReplyMessageText("");
      void queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to send reply email");
    },
  });

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactMessageStatus }) =>
      contactMessagesApi.updateStatus(id, status),
    onSuccess: (updated) => {
      toast.success(`Status updated to ${updated.status}`);
      void queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactMessagesApi.remove(id),
    onSuccess: (res) => {
      toast.success(res.message || "Contact message deleted successfully");
      setPendingDelete(null);
      if (viewingMessageId) setViewingMessageId(null);
      void queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete message");
    },
  });

  function handleOpenReply(msg: ContactMessage) {
    setReplyTarget(msg);
    setReplySubject(msg.subject.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`);
    setReplyMessageText("");
  }

  function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyTarget) return;
    if (!replySubject.trim()) {
      toast.error("Reply subject is required");
      return;
    }
    if (!replyMessageText.trim()) {
      toast.error("Reply message body cannot be empty");
      return;
    }
    replyMutation.mutate({
      id: replyTarget.id,
      payload: {
        subject: replySubject.trim(),
        message: replyMessageText.trim(),
      },
    });
  }

  function handleExportCsv() {
    downloadCsv(
      "contact-messages.csv",
      filteredItems.map((m) => ({
        ID: m.id,
        Name: m.name,
        Email: m.email,
        Subject: m.subject,
        Message: m.message,
        Status: m.status,
        "Replied By": m.repliedBy ?? "",
        "Replied At": m.repliedAt ?? "",
        "Reply Subject": m.replySubject ?? "",
        "Reply Message": m.replyMessage ?? "",
        "Created At": m.createdAt,
      })),
    );
  }

  const isRefreshing = isListFetching;

  const handleRefetchAll = () => {
    void refetchList();
    void refetchStats();
  };

  if (listError) {
    return <ErrorState error={listError} onRetry={handleRefetchAll} className="mt-10" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title=""
        description="View and reply to public inquiries submitted through the contact form."
        actions={
          <>
            <RefreshButton onRefresh={handleRefetchAll} isRefreshing={isRefreshing} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredItems.length === 0}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Inquiries"
          value={stats?.total ?? rawItems.length}
          icon={Inbox}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Pending Review"
          value={stats?.pending ?? null}
          icon={Clock}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Read"
          value={stats?.read ?? null}
          icon={CheckCircle2}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Replied"
          value={stats?.replied ?? null}
          icon={MailCheck}
          isLoading={isStatsLoading}
        />
        <StatCard
          label="Archived"
          value={stats?.archived ?? null}
          icon={Archive}
          isLoading={isStatsLoading}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as ContactMessageStatus | "ALL")}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-5 w-full sm:w-auto">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by sender, email, subject, or message…"
          className="sm:max-w-xs"
        />
      </div>

      {/* Messages Table */}
      <Card>
        <CardContent className="p-0">
          {isListLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title={
                debouncedSearch || statusFilter !== "ALL"
                  ? "No matching contact messages"
                  : "No contact messages found"
              }
              description={
                debouncedSearch || statusFilter !== "ALL"
                  ? "Try adjusting your search query or status filter."
                  : "Inquiries submitted via the contact form will appear here."
              }
              icon={Mail}
              className="py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Sender</TableHead>
                    <TableHead className="min-w-[240px]">Subject & Message</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[150px]">Received</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((msg) => (
                    <TableRow
                      key={msg.id}
                      className={msg.status === "PENDING" ? "bg-primary/[0.02] font-medium" : undefined}
                    >
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">{msg.name}</p>
                          <p className="text-xs text-muted-foreground">{msg.email}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1 max-w-md">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{msg.subject}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{msg.message}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <ContactMessageStatusBadge status={msg.status} />
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(msg.createdAt, "MMM d, yyyy h:mm a")}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Message Details"
                            onClick={() => setViewingMessageId(msg.id)}
                          >
                            <Eye className="size-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reply via Email"
                            onClick={() => handleOpenReply(msg)}
                          >
                            <Reply className="size-4 text-primary" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => setViewingMessageId(msg.id)}>
                                <Eye className="mr-2 size-4" />
                                View Details
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleOpenReply(msg)}>
                                <Reply className="mr-2 size-4" />
                                Reply via Email
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {msg.status !== "READ" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    statusMutation.mutate({ id: msg.id, status: "READ" })
                                  }
                                >
                                  <CheckCircle2 className="mr-2 size-4" />
                                  Mark as Read
                                </DropdownMenuItem>
                              )}

                              {msg.status !== "PENDING" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    statusMutation.mutate({ id: msg.id, status: "PENDING" })
                                  }
                                >
                                  <Clock className="mr-2 size-4" />
                                  Mark as Pending
                                </DropdownMenuItem>
                              )}

                              {msg.status !== "ARCHIVED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    statusMutation.mutate({ id: msg.id, status: "ARCHIVED" })
                                  }
                                >
                                  <Archive className="mr-2 size-4" />
                                  Archive
                                </DropdownMenuItem>
                              )}

                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setPendingDelete(msg)}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredItems.length > 0 && (
            <div className="border-t p-4">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Message Detail Dialog */}
      <Dialog
        open={Boolean(viewingMessageId)}
        onOpenChange={(open) => {
          if (!open) setViewingMessageId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 pr-6">
              <DialogTitle className="text-lg font-semibold">Contact Message Details</DialogTitle>
              {activeDetail && <ContactMessageStatusBadge status={activeDetail.status} />}
            </div>
            <DialogDescription>
              Inquiry submitted via public contact form
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading || !activeDetail ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Sender info box */}
              <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground">{activeDetail.name}</span>
                    <span className="text-xs text-muted-foreground">({activeDetail.email})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {formatDateTime(activeDetail.createdAt, "PPpp")}
                  </div>
                </div>
                {activeDetail.userId && (
                  <p className="text-xs text-muted-foreground">
                    Registered User ID: <code className="bg-muted px-1 rounded">{activeDetail.userId}</code>
                  </p>
                )}
              </div>

              {/* Subject & Message Content */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Subject
                </Label>
                <p className="text-base font-medium text-foreground bg-background border rounded-md p-2.5">
                  {activeDetail.subject}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Message
                </Label>
                <div className="rounded-md border bg-muted/20 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {activeDetail.message}
                </div>
              </div>

              {/* Reply Section if already replied */}
              {activeDetail.status === "REPLIED" && activeDetail.replyMessage && (
                <div className="rounded-lg border border-success/30 bg-success/[0.04] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-success/20 pb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-success">
                      <MailCheck className="size-4" />
                      Reply Sent by {activeDetail.repliedBy || "Admin"}
                    </div>
                    {activeDetail.repliedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(activeDetail.repliedAt, "PPpp")}
                      </span>
                    )}
                  </div>

                  {activeDetail.replySubject && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Subject:</p>
                      <p className="text-sm font-medium text-foreground">{activeDetail.replySubject}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Response:</p>
                    <p className="text-sm whitespace-pre-wrap text-foreground mt-1">
                      {activeDetail.replyMessage}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Management Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Set status:</Label>
                  {(["PENDING", "READ", "ARCHIVED"] as ContactMessageStatus[]).map((st) => (
                    <Button
                      key={st}
                      variant={activeDetail.status === st ? "secondary" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      disabled={activeDetail.status === st || statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({ id: activeDetail.id, status: st })
                      }
                    >
                      {st}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setPendingDelete(activeDetail)}
                    >
                      <Trash2 className="size-4 mr-1.5" />
                      Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      const msg = activeDetail;
                      setViewingMessageId(null);
                      handleOpenReply(msg);
                    }}
                  >
                    <Reply className="size-4 mr-1.5" />
                    Reply via Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply to Message Modal */}
      <Dialog open={Boolean(replyTarget)} onOpenChange={(open) => !open && setReplyTarget(null)}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleSendReply}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Reply className="size-5 text-primary" />
                Reply to Inquiry
              </DialogTitle>
              <DialogDescription>
                Sends a formatted email directly to the sender via Resend and updates status to REPLIED.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Recipient Name</Label>
                  <Input value={replyTarget?.name ?? ""} disabled className="bg-muted text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Recipient Email</Label>
                  <Input value={replyTarget?.email ?? ""} disabled className="bg-muted text-xs" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reply-subject" className="text-xs">
                  Email Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reply-subject"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Re: Inquiry Subject"
                  required
                />
              </div>

              {/* Quoted Message Reference */}
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <AlertCircle className="size-3.5" />
                  Original Message from {replyTarget?.name}:
                </div>
                <p className="text-xs text-muted-foreground italic line-clamp-3">
                  "{replyTarget?.message}"
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reply-message" className="text-xs">
                  Reply Content (HTML & Plain Text formatted) <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reply-message"
                  value={replyMessageText}
                  onChange={(e) => setReplyMessageText(e.target.value)}
                  placeholder="Type your response to the user here..."
                  rows={5}
                  required
                  className="resize-y"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReplyTarget(null)}
                disabled={replyMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={replyMutation.isPending}>
                <Send className="size-4 mr-1.5" />
                {replyMutation.isPending ? "Sending Reply…" : "Send Email Reply"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete Contact Message?"
        description={
          pendingDelete
            ? `Are you sure you want to permanently delete the contact message from "${pendingDelete.name}" (${pendingDelete.email}) with subject "${pendingDelete.subject}"? This action cannot be undone.`
            : ""
        }
        confirmLabel={deleteMutation.isPending ? "Deleting…" : "Delete Message"}
        variant="destructive"
        onConfirm={() => {
          if (pendingDelete) {
            deleteMutation.mutate(pendingDelete.id);
          }
        }}
      />
    </div>
  );
}
