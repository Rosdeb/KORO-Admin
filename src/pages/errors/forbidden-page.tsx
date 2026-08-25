import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function ForbiddenPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-6 text-destructive" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">You don't have access to the admin panel</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {user
            ? `${user.name} only has the standard ROLE_USER account. The admin panel is limited to Admin and Language Reviewer accounts.`
            : "This area requires an Admin or Language Reviewer account."}
        </p>
      </div>
      <Button variant="outline" onClick={handleLogout}>
        Sign out
      </Button>
    </div>
  );
}
