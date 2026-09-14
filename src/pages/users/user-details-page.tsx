import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Info, Mail, Calendar, Clock, Globe } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { UserStatusBadge, RoleBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { adminUsersApi, activityApi } from "@/api";
import { ApiError } from "@/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { initials } from "@/lib/utils";
import type { Role, UserResponse } from "@/types/api";

const ASSIGNABLE_ROLES: { role: Role; label: string; description: string }[] = [
  {
    role: "ROLE_LANGUAGE_REVIEWER",
    label: "Language Reviewer",
    description: "Can review the submission queue (approve/reject) and see their own review history. No content editing.",
  },
  {
    role: "ROLE_MODERATOR",
    label: "Moderator",
    description:
      "Everything a Reviewer can do, plus limited dictionary editing — can fix an existing concept or translation, but can't create or delete them.",
  },
  { role: "ROLE_ADMIN", label: "Admin", description: "Full platform control" },
];

export function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentAdmin } = useAuth();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({ queryKey: queryKeys.adminUsers, queryFn: adminUsersApi.list });
  const user = useMemo(() => usersQuery.data?.find((u) => u.id === id), [usersQuery.data, id]);

  const isOwnAccount = currentAdmin?.id === id;
  const activityQuery = useQuery({
    queryKey: queryKeys.activity,
    queryFn: () => activityApi.list(),
    enabled: isOwnAccount,
  });

  const [pendingRoles, setPendingRoles] = useState<Role[] | null>(null);
  const [draftRoles, setDraftRoles] = useState<Role[]>([]);

  const rolesMutation = useMutation({
    mutationFn: (roles: Role[]) => adminUsersApi.updateRoles(id!, roles),
    onSuccess: (updated) => {
      queryClient.setQueryData<UserResponse[]>(queryKeys.adminUsers, (prev) =>
        prev?.map((u) => (u.id === updated.id ? updated : u)),
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update roles");
    },
  });

  function openRoleEditor() {
    if (!user) return;
    setDraftRoles(user.roles);
  }

  function toggleDraftRole(role: Role, checked: boolean) {
    setDraftRoles((prev) => (checked ? [...prev, role] : prev.filter((r) => r !== role)));
  }

  if (usersQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (usersQuery.error) {
    return <ErrorState error={usersQuery.error} onRetry={() => usersQuery.refetch()} className="mt-10" />;
  }

  if (!user) {
    return (
      <EmptyState
        title="User not found"
        description="This account may have been removed, or the link is incorrect."
        action={
          <Button variant="outline" size="sm" onClick={() => navigate("/users")}>
            Back to all users
          </Button>
        }
        className="mt-10"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link to="/users">
          <ArrowLeft className="size-4" /> Back to users
        </Link>
      </Button>

      <PageHeader title={user.name} description={user.email} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="items-center text-center">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-2 text-base">{user.name}</CardTitle>
            <div className="flex flex-wrap justify-center gap-1">
              {user.roles.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex min-w-0 items-center gap-2 break-all text-muted-foreground">
              <Mail className="size-3.5" /> {user.email}
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-3.5" /> Registered
              </span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-3.5" /> Last activity
              </span>
              <span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never signed in"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Globe className="size-3.5" /> Native language
              </span>
              <span>{user.nativeLanguage ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Globe className="size-3.5" /> Learning language
              </span>
              <span>{user.preferredLanguage ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Account status</span>
              <UserStatusBadge status={user.status} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Roles &amp; Permissions</CardTitle>
            <CardDescription>
              Grants replace the account's full role set. ROLE_USER is always retained by the backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {draftRoles.length === 0 ? (
              <Button variant="outline" size="sm" onClick={openRoleEditor}>
                Edit roles
              </Button>
            ) : (
              <div className="space-y-4">
                {ASSIGNABLE_ROLES.map(({ role, label, description }) => (
                  <div key={role} className="flex items-start gap-3">
                    <Checkbox
                      id={role}
                      checked={draftRoles.includes(role)}
                      onCheckedChange={(checked) => toggleDraftRole(role, checked === true)}
                    />
                    <div>
                      <Label htmlFor={role}>{label}</Label>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => setPendingRoles(draftRoles)}>
                    Save changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDraftRoles([])}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            {isOwnAccount
              ? "Your recent actions, from GET /api/v1/activity"
              : "Not available for other accounts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isOwnAccount ? (
            <div className="flex items-start gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                The Koro API's activity endpoint (<code className="text-xs">GET /api/v1/activity</code>) is scoped
                to the signed-in account only — there is no endpoint to fetch another user's activity log. See
                docs/BACKEND_GAPS.md for the suggested endpoint to add.
              </span>
            </div>
          ) : activityQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activityQuery.error ? (
            <ErrorState error={activityQuery.error} onRetry={() => activityQuery.refetch()} />
          ) : (activityQuery.data?.length ?? 0) === 0 ? (
            <EmptyState title="No activity recorded" description="Actions you take will appear here." />
          ) : (
            <ol className="space-y-3 border-l border-border pl-4">
              {activityQuery.data!.slice(0, 20).map((log) => (
                <li key={log.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
                  <p className="font-medium">{log.description ?? log.activityType}</p>
                  <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {pendingRoles && (
        <ConfirmDialog
          open={!!pendingRoles}
          onOpenChange={(open) => !open && setPendingRoles(null)}
          title={`Update roles for ${user.name}?`}
          description={`New role set: ${pendingRoles.map((r) => r.replace("ROLE_", "")).join(", ") || "USER only"}. This takes effect immediately.`}
          confirmLabel="Save roles"
          onConfirm={async () => {
            await rolesMutation.mutateAsync(pendingRoles);
            setDraftRoles([]);
          }}
        />
      )}
    </div>
  );
}
