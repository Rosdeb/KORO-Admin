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
import { conceptsApi, categoriesApi } from "@/api";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import type { Concept } from "@/types/api";

const conceptSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Choose a category"),
  referenceImage: z.string().optional(),
});
type ConceptFormValues = z.infer<typeof conceptSchema>;

export function ConceptsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("ROLE_ADMIN");
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: categoriesApi.list });
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const conceptsQuery = useQuery({
    queryKey: queryKeys.concepts(categoryFilter === "ALL" ? undefined : categoryFilter),
    queryFn: () => conceptsApi.list(categoryFilter === "ALL" ? undefined : categoryFilter),
  });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Concept | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Concept | null>(null);

  const form = useForm<ConceptFormValues>({
    resolver: zodResolver(conceptSchema),
    defaultValues: { name: "", description: "", categoryId: "", referenceImage: "" },
  });

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return conceptsQuery.data ?? [];
    const q = debouncedSearch.toLowerCase();
    return (conceptsQuery.data ?? []).filter((c) => c.name.toLowerCase().includes(q));
  }, [conceptsQuery.data, debouncedSearch]);

  const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(filtered, 10);

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; description: string | null; category: { id: string } | null; referenceImage: string | null }) =>
      editing ? conceptsApi.update(editing.id, payload) : conceptsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concepts"] });
      setFormOpen(false);
      form.reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to save concept"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => conceptsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["concepts"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete concept"),
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", description: "", categoryId: "", referenceImage: "" });
    setFormOpen(true);
  }

  function openEdit(concept: Concept) {
    setEditing(concept);
    form.reset({
      name: concept.name,
      description: concept.description ?? "",
      categoryId: concept.category?.id ?? "",
      referenceImage: concept.referenceImage ?? "",
    });
    setFormOpen(true);
  }

  function onSubmit(values: ConceptFormValues) {
    saveMutation.mutate({
      name: values.name,
      description: values.description || null,
      category: { id: values.categoryId },
      referenceImage: values.referenceImage || null,
    });
  }

  if (conceptsQuery.error) {
    return <ErrorState error={conceptsQuery.error} onRetry={() => conceptsQuery.refetch()} className="mt-10" />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Concepts"
        description="The vocabulary items that get translated across languages."
        actions={
          <>
            <RefreshButton
              onRefresh={() => {
                void conceptsQuery.refetch();
                void categoriesQuery.refetch();
              }}
              isRefreshing={conceptsQuery.isFetching || categoriesQuery.isFetching}
            />
            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Add concept
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search concepts…" className="sm:max-w-xs" />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {(categoriesQuery.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {conceptsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No concepts found" description="Try a different search or category filter." />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((concept) => (
                    <TableRow key={concept.id}>
                      <TableCell className="font-medium">{concept.name}</TableCell>
                      <TableCell>
                        {concept.category ? <Badge variant="outline">{concept.category.name}</Badge> : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{concept.description ?? "—"}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(concept)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setPendingDelete(concept)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
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
            <DialogTitle>{editing ? "Edit concept" : "Add concept"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this vocabulary item's details." : "Create a new vocabulary item for translation."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Tiger" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select value={form.watch("categoryId")} onValueChange={(v) => form.setValue("categoryId", v, { shouldValidate: true })}>
                <SelectTrigger id="categoryId">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {(categoriesQuery.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} {...form.register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referenceImage">Reference image URL</Label>
              <Input id="referenceImage" placeholder="https://…" {...form.register("referenceImage")} />
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
          title={`Delete "${pendingDelete.name}"?`}
          description="This action cannot be undone. Any translations recorded for this concept will be orphaned."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(pendingDelete.id)}
        />
      )}
    </div>
  );
}
