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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { languagesApi } from "@/api";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/hooks/use-auth";
import type { Language, LanguagePayload } from "@/types/api";

const languageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nativeName: z.string().min(1, "Native name is required"),
  code: z.string().min(1, "Code is required").max(10, "Keep the code short (e.g. bn, ccp)"),
  region: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean(),
});

type LanguageFormValues = z.infer<typeof languageSchema>;

export function LanguagesPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("ROLE_ADMIN");
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: queryKeys.languages, queryFn: languagesApi.list });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Language | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Language | null>(null);

  const form = useForm<LanguageFormValues>({
    resolver: zodResolver(languageSchema),
    defaultValues: { name: "", nativeName: "", code: "", region: "", description: "", active: true },
  });

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return data ?? [];
    const q = debouncedSearch.toLowerCase();
    return (data ?? []).filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q),
    );
  }, [data, debouncedSearch]);

  const saveMutation = useMutation({
    mutationFn: (payload: LanguagePayload) =>
      editing ? languagesApi.update(editing.id, payload) : languagesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.languages });
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to save language"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => languagesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.languages });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Failed to delete language"),
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", nativeName: "", code: "", region: "", description: "", active: true });
    setFormOpen(true);
  }

  function openEdit(language: Language) {
    setEditing(language);
    form.reset({
      name: language.name,
      nativeName: language.nativeName,
      code: language.code,
      region: language.region ?? "",
      description: language.description ?? "",
      active: language.active,
    });
    setFormOpen(true);
  }

  function onSubmit(values: LanguageFormValues) {
    saveMutation.mutate({
      name: values.name,
      nativeName: values.nativeName,
      code: values.code,
      region: values.region || null,
      description: values.description || null,
      active: values.active,
    });
  }

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Languages"
        description="Languages available across the Koro platform."
        actions={
          <>
            <RefreshButton onRefresh={() => refetch()} isRefreshing={isFetching} />
            {canManage && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Add language
              </Button>
            )}
          </>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search by name or code…" className="max-w-xs" />

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
              <EmptyState title="No languages found" description="Try a different search term." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Native name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lang) => (
                  <TableRow key={lang.id}>
                    <TableCell className="font-medium">{lang.name}</TableCell>
                    <TableCell>{lang.nativeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lang.code}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lang.region ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={lang.active ? "success" : "secondary"}>{lang.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(lang)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(lang)}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit language" : "Add language"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the details for this language." : "Register a new language for the platform."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Bangla" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nativeName">Native name</Label>
                <Input id="nativeName" placeholder="বাংলা" {...form.register("nativeName")} />
                {form.formState.errors.nativeName && (
                  <p className="text-xs text-destructive">{form.formState.errors.nativeName.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" placeholder="bn" {...form.register("code")} />
                {form.formState.errors.code && <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="region">Region</Label>
                <Input id="region" placeholder="Bangladesh" {...form.register("region")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} {...form.register("description")} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label htmlFor="active">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive languages are hidden from end users.</p>
              </div>
              <Switch
                id="active"
                checked={form.watch("active")}
                onCheckedChange={(checked) => form.setValue("active", checked)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
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
          description="This action cannot be undone. Any translations already recorded for this language will be orphaned."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteMutation.mutateAsync(pendingDelete.id)}
        />
      )}
    </div>
  );
}
