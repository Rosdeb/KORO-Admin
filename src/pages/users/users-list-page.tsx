import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Download, Eye, MoreHorizontal, ShieldCheck, UserX, UserCheck2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserStatusBadge, RoleBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminUsersApi } from "@/api";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/query-keys";
import { usePagination } from "@/hooks/use-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { downloadCsv, initials, formatNumber } from "@/lib/utils";
import type { UserResponse, UserStatus } from "@/types/api";

const STATUS_OPTIONS: (UserStatus | "ALL")[] = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"];

export function UsersListPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: queryKeys.adminUsers, queryFn: adminUsersApi.list });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [pendingStatusChange, setPendingStatusChange] = useState<{ user: UserResponse; status: UserStatus } | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus; name: string }) =>
      adminUsersApi.updateStatus(id, status),
    onSuccess: (updated, variables) => {
      // Merge by the id/status we sent rather than trusting the response body's shape —
      // some backends return a partial or empty body for this endpoint, which previously
      // left the list showing the stale status until a manual reload refetched it.
      queryClient.setQueryData<UserResponse[]>(queryKeys.adminUsers, (prev) =>
        prev?.map((u) =>
          u.id === variables.id ? { ...u, ...updated, status: updated?.status ?? variables.status } : u,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status");
    },
  });

  const allRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const u of data ?? []) for (const r of u.roles) roles.add(r);
    return Array.from(roles);
  }, [data]);

  const filtered = useMemo(() => {
    let items = data ?? [];
    if (statusFilter !== "ALL") items = items.filter((u) => u.status === statusFilter);
    if (roleFilter !== "ALL") items = items.filter((u) => (u.roles as string[]).includes(roleFilter));
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return items;
  }, [data, statusFilter, roleFilter, debouncedSearch]);

  const { page, pageSize, pageItems, total, setPage, setPageSize } = usePagination(filtered, 10);

  function handleExport() {
    downloadCsv(
      "koro-users.csv",
      filtered.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        status: u.status,
        roles: u.roles.join("|"),
        nativeLanguage: u.nativeLanguage ?? "",
        preferredLanguage: u.preferredLanguage ?? "",
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt ?? "",
      })),
    );
  }

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="All Users"
        description={data ? `${formatNumber(data.length)} registered accounts` : "Loading…"}
        actions={
          <>
            <RefreshButton onRefresh={() => refetch()} isRefreshing={isFetching} />
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" className="sm:max-w-xs" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UserStatus | "ALL")}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {allRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {r.replace("ROLE_", "")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== "ALL" || roleFilter !== "ALL" || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("ALL");
              setRoleFilter("ALL");
              setSearch("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
      <CardContent className="p-0">
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No users found"
            description="Try adjusting your search or filters."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("ALL");
                  setRoleFilter("ALL");
                  setSearch("");
                }}
              >
                Reset filters
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Link to={`/users/${user.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <RoleBadge key={r} role={r} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge status={user.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/users/${user.id}`}>
                            <Eye /> View details
                          </Link>
                        </DropdownMenuItem>
                        {user.status !== "ACTIVE" && (
                          <DropdownMenuItem onClick={() => setPendingStatusChange({ user, status: "ACTIVE" })}>
                            <UserCheck2 /> Activate
                          </DropdownMenuItem>
                        )}
                        {user.status !== "SUSPENDED" && (
                          <DropdownMenuItem onClick={() => setPendingStatusChange({ user, status: "SUSPENDED" })}>
                            <UserX /> Suspend
                          </DropdownMenuItem>
                        )}
                        {user.status !== "INACTIVE" && (
                          <DropdownMenuItem onClick={() => setPendingStatusChange({ user, status: "INACTIVE" })}>
                            <ShieldCheck /> Mark inactive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      {pendingStatusChange && (
        <ConfirmDialog
          open={!!pendingStatusChange}
          onOpenChange={(open) => !open && setPendingStatusChange(null)}
          title={`${pendingStatusChange.status === "SUSPENDED" ? "Suspend" : "Update"} ${pendingStatusChange.user.name}?`}
          description={`This changes the account status to ${pendingStatusChange.status}. The user's access to the platform will be affected immediately.`}
          confirmLabel={pendingStatusChange.status === "SUSPENDED" ? "Suspend account" : "Confirm"}
          variant={pendingStatusChange.status === "SUSPENDED" ? "destructive" : "default"}
          onConfirm={async () => {
            await statusMutation.mutateAsync({
              id: pendingStatusChange.user.id,
              status: pendingStatusChange.status,
              name: pendingStatusChange.user.name,
            });
          }}
        />
      )}
    </div>
  );
}
