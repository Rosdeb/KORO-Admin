import { getAdminPreferences } from "@/lib/admin-preferences";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Database, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { translationsApi, conceptsApi, languagesApi } from "@/api";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import type { TranslationResponse } from "@/types/api";

const translationSchema = z.object({
  conceptId: z.string().min(1, "Choose a concept"),
  languageId: z.string().min(1, "Choose a language"),
  text: z.string().min(1, "Translation text is required"),
  pronunciation: z.string().optional(),
  notes: z.string().optional(),
});
type TranslationFormValues = z.infer<typeof translationSchema>;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TranslationsPage() {
  const { hasRole } = useAuth();
  // Moderators get the backend's "limited dictionary edit" — PUT only, no create/delete (see docs/backend_api §4).
  const canEdit = hasRole("ROLE_ADMIN", "ROLE_MODERATOR");
  const canManage = hasRole("ROLE_ADMIN");
  const queryClient = useQueryClient();

  // ── Filters & server-side pagination state ──────────────────────────────────
  const [conceptFilter, setConceptFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getAdminPreferences().pageSize ?? 20);

  // Reset to page 1 whenever a filter changes
  function handleConceptFilter(v: string) { setConceptFilter(v); setPage(1); }
  function handleLanguageFilter(v: string) { setLanguageFilter(v); setPage(1); }
  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handlePageSizeChange(v: number) { setPageSize(v); setPage(1); }

  const trimmedSearch = debouncedSearch.trim();

  // ── Support data ─────────────────────────────────────────────────────────────
  const conceptsQuery = useQuery({
    queryKey: queryKeys.concepts({ page: 0, size: 100 }),
    queryFn: () => conceptsApi.list({ page: 0, size: 100 }),
  });
  const languagesQuery = useQuery({ queryKey: queryKeys.languages, queryFn: languagesApi.list });

  // ── Main data: server-side paginated translations ─────────────────────────────
  // When the user is actively searching we hit the search endpoint (POST) and paginate
  // the results client-side (search endpoint returns an array, no page params supported).
  // For the normal (non-search) view we drive pagination entirely from the backend.
  const isSearchMode = trimmedSearch.length > 0;
  const searchTargetLanguageId = languageFilter === "ALL" ? undefined : languageFilter;

  // Normal paginated list (no search term)
  const translationsQuery = useQuery({
    queryKey: queryKeys.translations({
      conceptId: conceptFilter === "ALL" ? undefined : conceptFilter,
      languageId: languageFilter === "ALL" ? undefined : languageFilter,
      page: page - 1, // backend is 0-indexed
      size: pageSize,
    }),
    queryFn: () =>
      translationsApi.list({
        conceptId: conceptFilter === "ALL" ? undefined : conceptFilter,
        languageId: languageFilter === "ALL" ? undefined : languageFilter,
        page: page - 1,
        size: pageSize,
      }),
    enabled: !isSearchMode,
    placeholderData: (prev) => prev, // keep previous page visible while next loads
  });

  // Search mode: fetch from search endpoint, apply concept filter client-side
  const searchQuery = useQuery({
    queryKey: queryKeys.translationsSearch(trimmedSearch, searchTargetLanguageId),
    queryFn: () =>
      translationsApi.search({ query: trimmedSearch, targetLanguageId: searchTargetLanguageId }),
    enabled: isSearchMode,
    staleTime: 60_000,
  });

  // ── Derive rows & pagination metadata for the current view ───────────────────
  let rows: TranslationResponse[];
  let totalElements: number;
  let totalPages: number;
  let isLoading: boolean;

  if (isSearchMode) {
    // Client-side slice for search results
    let allResults = searchQuery.data ?? [];
    if (conceptFilter !== "ALL") allResults = allResults.filter((t) => t.conceptId === conceptFilter);
    totalElements = allResults.length;
    totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
    const clampedPage = Math.min(page, totalPages);
    const start = (clampedPage - 1) * pageSize;
    rows = allResults.slice(start, start + pageSize);
    isLoading = searchQuery.isFetching && !searchQuery.data;
  } else {
    rows = translationsQuery.data?.content ?? [];
    totalElements = translationsQuery.data?.totalElements ?? 0;
    totalPages = translationsQuery.data?.totalPages ?? 1;
    isLoading = translationsQuery.isLoading;
  }

  // ── Form state ───────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TranslationResponse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TranslationResponse | null>(null);

  const form = useForm<TranslationFormValues>({
    resolver: zodResolver(translationSchema),
    defaultValues: { conceptId: "", languageId: "", text: "", pronunciation: "", notes: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: TranslationFormValues) =>
      editing ? translationsApi.update(editing.id, payload) : translationsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["translations"] });
      setFormOpen(false);
      form.reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to save translation"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => translationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["translations"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete translation"),
  });

  const reindexMutation = useMutation({
    mutationFn: () => translationsApi.reindex(),
    onSuccess: (data) => {
      toast.success(data.message || "Search index rebuilt", {
        description: `Successfully indexed ${data.totalIndexed.toLocaleString()} translation entries into memory.`,
      });
      void translationsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to rebuild search index");
    },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ conceptId: "", languageId: "", text: "", pronunciation: "", notes: "" });
    setFormOpen(true);
  }

  function openEdit(t: TranslationResponse) {
    setEditing(t);
    form.reset({
      conceptId: t.conceptId,
      languageId: t.languageId,
      text: t.text,
      pronunciation: t.pronunciation ?? "",
      notes: t.notes ?? "",
    });
    setFormOpen(true);
  }

  if (translationsQuery.error && !isSearchMode) {
    return <ErrorState error={translationsQuery.error} onRetry={() => translationsQuery.refetch()} className="mt-10" />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title=""
        description="Verified translations linking concepts to languages."
        actions={
          <>
            <RefreshButton
              onRefresh={() => {
                void translationsQuery.refetch();
                void conceptsQuery.refetch();
                void languagesQuery.refetch();
              }}
              isRefreshing={translationsQuery.isFetching || conceptsQuery.isFetching || languagesQuery.isFetching}
            />
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5"
              title="Export complete dictionary in CSV format"
            >
              <Link to="/content/export">
                <Download className="size-3.5" />
                Export CSV
              </Link>
            </Button>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reindexMutation.mutate()}
                disabled={reindexMutation.isPending}
                className="gap-1.5"
                title="Rebuild in-memory search index from live database"
              >
                <Database className={`size-3.5 ${reindexMutation.isPending ? "animate-spin text-primary" : ""}`} />
                {reindexMutation.isPending ? "Rebuilding index…" : "Rebuild Index"}
              </Button>
            )}
            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Add translation
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={handleSearch} placeholder="Search translations…" className="sm:max-w-xs" />
        <Select value={conceptFilter} onValueChange={handleConceptFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All concepts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All concepts</SelectItem>
            {(conceptsQuery.data?.content ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={handleLanguageFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="All languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All languages</SelectItem>
            {(languagesQuery.data ?? []).map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isSearchMode && (
        <p className="text-xs text-muted-foreground">
          Showing {totalElements} server-side result{totalElements === 1 ? "" : "s"} for &ldquo;{trimmedSearch}&rdquo;
        </p>
      )}
      {isSearchMode && searchQuery.error && (
        <p className="text-xs text-destructive">
          {searchQuery.error instanceof ApiError ? searchQuery.error.message : "Server search failed."}
        </p>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No translations found"
                description={
                  trimmedSearch
                    ? "Nothing matched this search."
                    : "Try a different filter combination."
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concept</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Translation</TableHead>
                    <TableHead>Pronunciation</TableHead>
                    <TableHead>Verified</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.conceptName}</TableCell>
                      <TableCell className="text-muted-foreground">{t.categoryName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.languageName}</Badge>
                      </TableCell>
                      <TableCell>{t.text}</TableCell>
                      <TableCell className="text-muted-foreground">{t.pronunciation ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={t.verified ? "success" : "secondary"}>{t.verified ? "Verified" : "Unverified"}</Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(t)}>
                              <Pencil className="size-4" />
                            </Button>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive hover:text-destructive"
                                onClick={() => setPendingDelete(t)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-border p-3">
                <Pagination
                  page={isSearchMode ? Math.min(page, totalPages) : page}
                  pageSize={pageSize}
                  total={totalElements}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit translation" : "Add translation"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this translation's details." : "Link a concept to a language with its verified translation."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="conceptId">Concept</Label>
                <Select value={form.watch("conceptId")} onValueChange={(v) => form.setValue("conceptId", v, { shouldValidate: true })}>
                  <SelectTrigger id="conceptId">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {(conceptsQuery.data?.content ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.conceptId && (
                  <p className="text-xs text-destructive">{form.formState.errors.conceptId.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="languageId">Language</Label>
                <Select value={form.watch("languageId")} onValueChange={(v) => form.setValue("languageId", v, { shouldValidate: true })}>
                  <SelectTrigger id="languageId">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {(languagesQuery.data ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.languageId && (
                  <p className="text-xs text-destructive">{form.formState.errors.languageId.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="text">Translation text</Label>
              <Input id="text" {...form.register("text")} />
              {form.formState.errors.text && <p className="text-xs text-destructive">{form.formState.errors.text.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pronunciation">Pronunciation</Label>
              <Input id="pronunciation" {...form.register("pronunciation")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...form.register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {pendingDelete && (
        <ConfirmDialog
          open={!!pendingDelete}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={`Delete this translation?`}
          description={`"${pendingDelete.text}" (${pendingDelete.languageName}) for ${pendingDelete.conceptName}. This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(pendingDelete.id)}
        />
      )}
    </div>
  );
}
