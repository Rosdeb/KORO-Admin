import { Info } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE_URL } from "@/api/client";
import { useAuth } from "@/hooks/use-auth";

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Admin panel preferences and environment configuration." />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Applies only to your browser — stored locally, not synced across devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="dark-mode">Dark mode</Label>
              <p className="text-xs text-muted-foreground">Switch between light and dark themes.</p>
            </div>
            <Switch id="dark-mode" checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Signed in as</span>
            <span className="font-medium">{user?.name} ({user?.email})</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Roles</span>
            <span className="font-medium">{user?.roles.map((r) => r.replace("ROLE_", "")).join(", ")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">API base URL</span>
            <span className="font-mono text-xs">{API_BASE_URL}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <CardTitle>No platform settings API</CardTitle>
            <CardDescription className="mt-1">
              The backend doesn't expose a settings/configuration endpoint, so there's nothing here to edit for the
              platform itself (feature flags, email templates, etc.) — only this browser's local preferences above.
              See docs/BACKEND_GAPS.md if platform-level settings become a requirement.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
