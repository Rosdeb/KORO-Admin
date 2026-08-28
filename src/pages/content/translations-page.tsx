import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { usePagination } from "@/hooks/use-pagination";
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

export function TranslationsPage() {
  const { hasRole } = useAuth();
  // Moderators get the backend's "limited dictionary edit" — PUT only, no create/delete (see docs/backend_api §4).
  const canEdit = hasRole("ROLE_ADMIN", "ROLE_MODERATOR");
  const canManage = hasRole("ROLE_ADMIN");
  const queryClient = useQueryClient();

  const conceptsQuery = useQuery({ queryKey: queryKeys.concepts(), queryFn: () => conceptsApi.list() });
  const languagesQuery = useQuery({ queryKey: queryKeys.languages, queryFn: languagesApi.list });

  const [conceptFilter, setConceptFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const translationsQuery = useQuery({
    queryKey: queryKeys.translations({
      conceptId: conceptFilter === "ALL" ? undefined : conceptFilter,
      languageId: languageFilter === "ALL" ? undefined : languageFilter,
    }),
    queryFn: () =>
      translationsApi.list({
        conceptId: conceptFilter === "ALL" ? undefined : conceptFilter,
        languageId: languageFilter === "ALL" ? undefined : languageFilter,
      }),
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TranslationResponse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TranslationResponse | null>(null);

  const form = useForm<TranslationFormValues>({
    resolver: zodResolver(translationSchema),
    defaultValues: { conceptId: "", languageId: "", text: "", pronunciation: "", notes: "" },
  });

  const trimmedSearch = debouncedSearch.trim();

  const localFiltered = useMemo(() => {
    if (!trimmedSearch) return translationsQuery.data ?? [];
    const q = trimmedSearch.toLowerCase();
    return (translationsQuery.data ?? []).filter(
      (t) =>
        t.text.toLowerCase().includes(q) ||
        t.conceptName.toLowerCase().includes(q) ||
        (t.pronunciation?.toLowerCase().includes(q) ?? false),
    );
  }, [translationsQuery.data, trimmedSearch]);

  // When the already-fetched page has no match for the query, fall back to the backend's
  // search endpoint (Unicode-normalized, also matches pronunciation + concept name) rather
  // than fetching and caching the entire dictionary just to filter it client-side.
  const needsServerSearch =
    !!trimmedSearch && !translationsQuery.isLoading && localFiltered.length === 0;
  const searchTargetLanguageId = languageFilter === "ALL" ? undefined : languageFilter;

  const searchQuery = useQuery({
    queryKey: queryKeys.translationsSearch(trimmedSearch, searchTargetLanguageId),
    queryFn: () =>
      translationsApi.search({ query: trimmedSearch, targetLanguageId: searchTargetLanguageId }),
    enabled: needsServerSearch,
    staleTime: 60_000,
  });

  const usingServerSearch = needsServerSearch && (searchQuery.data?.length ?? 0) > 0;

  const rows = useMemo(() => {
    if (!usingServerSearch) return localFiltered;
    const byId = new Map((translationsQuery.data ?? []).map((t) => [t.id, t]));
    let result = (searchQuery.data ?? []).map((t) => byId.get(t.id) ?? t);
    // The search endpoint filters by language, not concept — keep the concept filter honoured.
    if (conceptFilter !== "ALL") result = result.filter((t) => t.conceptId === conceptFilter);
    return result;
  }, [usingServerSearch, localFiltered, searchQuery.data, translationsQuery.data, conceptFilter]);

  const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(rows, 10);

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

  if (translationsQuery.error) {
    return <ErrorState error={translationsQuery.error} onRetry={() => translationsQuery.refetch()} className="mt-10" />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Translations"
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
            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Add translation
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search translations…" className="sm:max-w-xs" />
        <Select value={conceptFilter} onValueChange={setConceptFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All concepts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All concepts</SelectItem>
            {(conceptsQuery.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={languageFilter} onValueChange={setLanguageFilter}>
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

      {usingServerSearch && (
        <p className="text-xs text-muted-foreground">
          No match on the loaded page — showing {searchQuery.data?.length ?? 0} result
          {(searchQuery.data?.length ?? 0) === 1 ? "" : "s"} from a server-side search instead.
        </p>
      )}
      {needsServerSearch && searchQuery.error && (
        <p className="text-xs text-destructive">
          {searchQuery.error instanceof ApiError ? searchQuery.error.message : "Server search failed."}
        </p>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {translationsQuery.isLoading || (needsServerSearch && searchQuery.isFetching && !searchQuery.data) ? (
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
                    ? "Nothing matched this search on the loaded page or on the server."
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
                  {pageItems.map((t) => (
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
                <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="conceptId">Concept</Label>
                <Select value={form.watch("conceptId")} onValueChange={(v) => form.setValue("conceptId", v, { shouldValidate: true })}>
                  <SelectTrigger id="conceptId">
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {(conceptsQuery.data ?? []).map((c) => (
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
