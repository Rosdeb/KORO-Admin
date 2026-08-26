import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge, UserStatusBadge } from "@/components/shared/status-badge";
import { adminUsersApi } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { initials } from "@/lib/utils";

export function AdminUsersPage() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey: queryKeys.adminUsers, queryFn: adminUsersApi.list });

  const elevated = useMemo(
    () =>
      (data ?? []).filter(
        (u) => u.roles.includes("ROLE_ADMIN") || u.roles.includes("ROLE_LANGUAGE_REVIEWER") || u.roles.includes("ROLE_MODERATOR"),
      ),
    [data],
  );

  if (error) return <ErrorState error={error} onRetry={() => refetch()} className="mt-10" />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin Users"
        description="Accounts holding elevated (Admin, Reviewer, or Moderator) roles. Manage grants from a user's detail page."
        actions={<RefreshButton onRefresh={() => refetch()} isRefreshing={isFetching} />}
      />

      <Card className="overflow-hidden">
      <CardContent className="p-0">
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : elevated.length === 0 ? (
        <div className="p-4">
          <EmptyState title="No elevated accounts" description="No users currently hold Admin, Reviewer, or Moderator roles." />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {elevated.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
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
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/users/${user.id}`}>
                      <Eye className="size-4" /> Manage
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      </CardContent>
      </Card>
    </div>
  );
}
