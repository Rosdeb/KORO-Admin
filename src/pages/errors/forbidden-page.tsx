import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ROLE_LABEL } from "@/components/shared/status-badge";

export function ForbiddenPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const currentRoles = user?.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-6 text-destructive" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">You don't have access to this page</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {user
            ? `${user.name}'s account (${currentRoles}) doesn't have permission for this section. The admin panel is limited to Admin, Moderator, and Language Reviewer accounts — and some pages are Admin-only.`
            : "This area requires an Admin, Moderator, or Language Reviewer account."}
        </p>
        {user && (
          <p className="max-w-sm text-xs text-muted-foreground">
            Just been granted a new role? Sign out and back in (or refresh) to pick it up.
          </p>
        )}
      </div>
      <Button variant="outline" onClick={handleLogout}>
        Sign out
      </Button>
    </div>
  );
}
