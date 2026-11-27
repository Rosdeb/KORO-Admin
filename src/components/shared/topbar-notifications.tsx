import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCheck,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  FileCheck2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submissionsApi } from "@/api/submissions";
import { contactMessagesApi } from "@/api/contact-messages";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import type { TranslationSubmission, ContactMessage } from "@/types/api";

export function TopbarNotifications() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"submissions" | "messages">("submissions");

  // Query pending submissions
  const pendingSubmissionsQuery = useQuery({
    queryKey: ["submissions", "pending", "topbar"],
    queryFn: () => submissionsApi.listPending({ page: 0, size: 6 }),
    refetchInterval: 30000, // Auto-poll every 30 seconds
  });

  // Query pending contact messages
  const pendingMessagesQuery = useQuery({
    queryKey: ["contact-messages", "pending", "topbar"],
    queryFn: () => contactMessagesApi.list({ page: 0, size: 6, status: "PENDING" }),
    refetchInterval: 30000,
  });

  const pendingSubmissionsCount = pendingSubmissionsQuery.data?.totalElements ?? 0;
  const submissionsList: TranslationSubmission[] = pendingSubmissionsQuery.data?.content ?? [];

  const rawMessages = pendingMessagesQuery.data;
  const messagesList: ContactMessage[] = Array.isArray(rawMessages)
    ? rawMessages
    : (rawMessages?.content ?? []);
  const pendingMessagesCount = Array.isArray(rawMessages)
    ? rawMessages.length
    : (rawMessages?.totalElements ?? 0);

  const totalPending = pendingSubmissionsCount + pendingMessagesCount;
  const isRefreshing = pendingSubmissionsQuery.isFetching || pendingMessagesQuery.isFetching;

  function refreshAll() {
    void pendingSubmissionsQuery.refetch();
    void pendingMessagesQuery.refetch();
  }

  // Quick Approve submission directly from notification popover
  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      submissionsApi.approve(id, { reviewerNote: "Quick approved via notifications" }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["concepts"] });
      void queryClient.invalidateQueries({ queryKey: ["translations"] });
      toast.success("Submission approved and added to dictionary!", {
        description: "translationsSaved" in result ? result.translationsSaved?.join(" · ") : undefined,
      });
    },
    onError: () => {
      toast.error("Could not approve submission. Try from the queue page.");
    },
  });

  // Mark contact message read directly from notification popover
  const markReadMutation = useMutation({
    mutationFn: (id: string) => contactMessagesApi.get(id, true),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast.success("Message marked as read");
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Pending works and notifications (${totalPending} pending)`}
          title={`Pending works: ${totalPending} items waiting for review`}
          className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <Bell className="size-4" />
          {totalPending > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75">
              {totalPending > 99 ? "99+" : totalPending}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] sm:w-[400px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">Pending Review Queue</span>
            {totalPending > 0 ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400">
                {totalPending} waiting
              </Badge>
            ) : (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">
                0 pending
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={refreshAll}
            disabled={isRefreshing}
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh pending items"
          >
            <RefreshCw className={`size-3 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-border bg-muted/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("submissions")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "submissions"
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCheck2 className="size-3.5" />
            <span>Submissions</span>
            {pendingSubmissionsCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                {pendingSubmissionsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("messages")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "messages"
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="size-3.5" />
            <span>Messages</span>
            {pendingMessagesCount > 0 && (
              <span className="ml-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 text-[10px] font-mono font-semibold">
                {pendingMessagesCount}
              </span>
            )}
          </button>
        </div>

        {/* List Content */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {activeTab === "submissions" ? (
            submissionsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="size-8 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-2">
                  <CheckCheck className="size-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">All Submissions Reviewed!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No pending user submissions waiting for review.
                </p>
              </div>
            ) : (
              submissionsList.map((item) => (
                <div key={item.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {item.sourceWord}
                        </span>
                        {item.sourceLanguage?.name && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted/30">
                            {item.sourceLanguage.name}
                          </Badge>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        <span className="text-foreground/90 font-medium">{item.banglaTranslation}</span>
                        {item.englishTranslation && (
                          <span className="ml-1 text-muted-foreground/80">({item.englishTranslation})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        <span className="truncate">By {item.submittedBy?.name || "Community User"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 shrink-0">
                          <Clock className="size-2.5" />
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Approve Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(item.id)}
                      className="h-7 px-2 text-[11px] gap-1 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30 cursor-pointer"
                      title="Quick approve submission"
                    >
                      <Check className="size-3" />
                      <span>Approve</span>
                    </Button>
                  </div>
                </div>
              ))
            )
          ) : (
            messagesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="size-8 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center mb-2">
                  <CheckCheck className="size-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">Inbox is Clear</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  No unread contact or feedback messages.
                </p>
              </div>
            ) : (
              messagesList.map((msg) => (
                <div key={msg.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {msg.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {msg.email}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-foreground/90 mt-0.5 truncate">
                        {msg.subject || "No Subject"}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {msg.message}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Clock className="size-2.5" />
                        {formatRelativeTime(msg.createdAt)}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate(msg.id)}
                      className="h-7 px-2 text-[10px] shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Mark as read"
                    >
                      Mark read
                    </Button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-2 bg-muted/20 flex items-center justify-between text-xs">
          <Link
            to={activeTab === "submissions" ? "/submissions" : "/contact-messages"}
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <span>{activeTab === "submissions" ? "Open Full Submissions Queue" : "Open Full Messages Inbox"}</span>
            <ExternalLink className="size-3" />
          </Link>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <Sparkles className="size-3 text-amber-500" />
            Live Sync
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
