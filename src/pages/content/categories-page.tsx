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
import { categoriesApi } from "@/api";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import type { Category } from "@/types/api";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

export function CategoriesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("ROLE_ADMIN");
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: queryKeys.categories, queryFn: categoriesApi.list });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return data ?? [];
    const q = debouncedSearch.toLowerCase();
    return (data ?? []).filter((c) => c.name.toLowerCase().includes(q));
  }, [data, debouncedSearch]);

  const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(filtered, 10);

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; description: string | null }) =>
      editing ? categoriesApi.update(editing.id, payload) : categoriesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      setFormOpen(false);
      form.reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to save category"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete category"),
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", description: "" });
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    form.reset({ name: category.name, description: category.description ?? "" });
    setFormOpen(true);
  }

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categories"
        description="Groupings that organize concepts (e.g. Animals, Food, Greetings)."
        actions={
          <>
            <RefreshButton onRefresh={() => refetch()} isRefreshing={isFetching} />
            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Add category
              </Button>
            )}
          </>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search categories…" className="max-w-xs" />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No categories found" description="Try a different search term." />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.description ?? "—"}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(c)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              onClick={() => setPendingDelete(c)}
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
            <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this grouping's details." : "Create a new grouping for concepts."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((v) => saveMutation.mutate({ name: v.name, description: v.description || null }))}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Animals" {...form.register("name")} />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} {...form.register("description")} />
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
          description="This action cannot be undone. Concepts in this category will be left uncategorized."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(pendingDelete.id)}
        />
      )}
    </div>
  );
}
