import { useState, type ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palette, Table2, ShieldCheck, RefreshCw, Download, RotateCcw, LogOut, Copy, Check, Sun, Moon, Monitor, SlidersHorizontal, ExternalLink, Paintbrush, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustomThemeDialog } from "@/components/shared/custom-theme-dialog";
import { ROLE_LABEL } from "@/components/shared/status-badge";
import { useTheme } from "@/hooks/use-theme";
import { useColorTheme } from "@/hooks/use-color-theme";
import { DEFAULT_THEME_ID } from "@/lib/color-themes";
import { API_BASE_URL } from "@/api/client";
import { useAuth } from "@/hooks/use-auth";
import { getAdminPreferences, setAdminPreferences, resetAdminPreferences, useAdminPreferences, START_PAGES } from "@/lib/admin-preferences";

function SectionTitle({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <CardHeader className="flex-row items-start gap-3 p-4 sm:p-5 pb-2 sm:pb-3 shrink-0 min-h-[76px]">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
    <div className="space-y-1"><CardTitle className="leading-snug">{title}</CardTitle><CardDescription className="text-xs">{description}</CardDescription></div>
  </CardHeader>;
}
function SettingRow({ id, title, description, children }: { id?: string; title: string; description: string; children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors shadow-2xs">
    <div className="min-w-0 flex-1"><Label htmlFor={id} className="text-xs font-semibold text-foreground cursor-pointer">{title}</Label><p className="mt-0.5 text-xs text-muted-foreground leading-normal">{description}</p></div>
    <div className="shrink-0">{children}</div>
  </div>;
}
const selectStyle = "h-8 max-w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs";

export function SettingsPage() {
  const { preference, setTheme } = useTheme();
  const { themeId, setColorTheme, deleteCustomTheme, themes, currentTheme } = useColorTheme();
  const preferences = useAdminPreferences();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [dialog, setDialog] = useState<"reset" | "logout" | null>(null);

  async function refreshData() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({}, { throwOnError: true });
      toast.success("Data refreshed", { description: "Open views reloaded. Other pages will fetch fresh data when opened." });
    } catch { toast.error("Some data could not be refreshed. Please try again."); }
    finally { setRefreshing(false); }
  }
  function exportPreferences() {
    const file = new Blob([JSON.stringify({ version: 1, theme: preference, colorTheme: themeId, ...getAdminPreferences() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "korot-admin-preferences.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Preferences exported");
  }
  async function copyApiUrl() {
    try { await navigator.clipboard.writeText(API_BASE_URL); toast.success("API address copied"); }
    catch { toast.error("Could not copy. Select and copy the address manually."); }
  }
  async function confirmAction() {
    if (dialog === "reset") {
      resetAdminPreferences();
      setTheme("system");
      setColorTheme(DEFAULT_THEME_ID);
      toast.success("Preferences reset to defaults");
    } else if (dialog === "logout") {
      await queryClient.cancelQueries();
      await logout();
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  }

  return <div className="space-y-4">
    <PageHeader title="" description="Set up your workspace and manage your admin session." actions={<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="size-3.5 text-primary" />Preferences save automatically</span>} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
      {/* 1. Appearance Card */}
      <Card className="flex flex-col h-full border-0 shadow-sm bg-card">
        <SectionTitle icon={Palette} title="Appearance" description="Make the workspace comfortable to use." />
        <CardContent className="flex flex-col flex-1 justify-between p-4 sm:p-5 pt-0 space-y-4">
          <div className="space-y-4 flex-1">
            <fieldset>
              <legend className="mb-2 text-xs font-medium">Theme</legend>
              <div className="grid grid-cols-3 gap-2">
                {([{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: Monitor }] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={preference === option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border-0 px-2 py-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                      preference === option.value
                        ? "bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs"
                        : "bg-muted/30 shadow-2xs text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <option.icon className="size-4" />
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">System follows your device’s appearance.</p>
            </fieldset>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="text-xs font-medium">Sidebar & Accent Palettes ({themes.length} Combos)</legend>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                    Active: {currentTheme.name}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setCustomDialogOpen(true)}
                    className="h-7 text-xs gap-1.5 cursor-pointer border border-input shadow-xs"
                  >
                    <Paintbrush className="size-3 text-primary" />
                    <span>Create Custom</span>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {themes.map((t) => {
                  const isActive = themeId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setColorTheme(t.id)}
                      className={`group relative flex items-start justify-between gap-2.5 rounded-xl border-0 p-2.5 text-left text-xs transition-all outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive
                          ? "bg-primary/10 shadow-xs ring-2 ring-primary/20"
                          : "bg-muted/30 shadow-2xs hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="flex items-center -space-x-1.5 pt-0.5 shrink-0">
                          {t.previewColors.map((color, idx) => (
                            <span
                              key={idx}
                              className="size-4 rounded-full ring-2 ring-background shadow-xs"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate text-foreground">{t.name}</span>
                            {t.isCustom && (
                              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono font-medium shrink-0">
                                Cookie
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {t.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {isActive && <Check className="size-3.5 text-primary shrink-0" />}
                        {t.isCustom && (
                          <button
                            type="button"
                            title="Delete custom palette"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCustomTheme(t.id);
                              toast.success(`Removed "${t.name}" from cookies`);
                            }}
                            className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 mt-auto">
            <SettingRow id="compact-tables" title="Compact tables" description="Use tighter rows to fit more information on screen.">
              <Switch id="compact-tables" checked={preferences.compactTables} onCheckedChange={(compactTables) => setAdminPreferences({ compactTables })} />
            </SettingRow>
            <SettingRow id="reduced-motion" title="Reduce motion" description="Minimize animations and transitions in the admin panel.">
              <Switch id="reduced-motion" checked={preferences.reducedMotion} onCheckedChange={(reducedMotion) => setAdminPreferences({ reducedMotion })} />
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      {/* 2. Data & preferences Card */}
      <Card className="flex flex-col h-full border-0 shadow-sm bg-card">
        <SectionTitle icon={SlidersHorizontal} title="Data & preferences" description="Refresh your workspace or keep a copy of your preferences." />
        <CardContent className="flex flex-col flex-1 justify-between p-4 sm:p-5 pt-0 space-y-3">
          <div className="space-y-2.5 flex-1">
            <SettingRow title="AI & search limits" description="Manage multi-model failover roster and search rate limits.">
              <Button variant="outline" size="sm" asChild className="border border-input shadow-xs">
                <Link to="/administration/ai-limits">Configure <ExternalLink className="size-3.5 ml-1" /></Link>
              </Button>
            </SettingRow>
            <SettingRow title="Refresh admin data" description="Reload open views and refresh other pages when you visit them.">
              <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing} className="border border-input shadow-xs">
                <RefreshCw className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
            </SettingRow>
            <SettingRow title="Export preferences" description="Download your browser preferences as a JSON file.">
              <Button variant="outline" size="sm" onClick={exportPreferences} className="border border-input shadow-xs">
                <Download />Export
              </Button>
            </SettingRow>
            <SettingRow title="Restore defaults" description="Reset appearance and workspace preferences.">
              <Button variant="ghost" size="sm" onClick={() => setDialog("reset")}>
                <RotateCcw />Reset
              </Button>
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      {/* 3. Workspace defaults Card */}
      <Card className="flex flex-col h-full border-0 shadow-sm bg-card">
        <SectionTitle icon={Table2} title="Workspace defaults" description="Spend less time adjusting your daily views." />
        <CardContent className="flex flex-col flex-1 justify-start p-4 sm:p-5 pt-0 space-y-2.5">
          <SettingRow id="default-page-size" title="Rows per page" description="Applied when you open paginated lists.">
            <select id="default-page-size" className={selectStyle} value={preferences.pageSize ?? "default"} onChange={(event) => setAdminPreferences({ pageSize: event.target.value === "default" ? null : Number(event.target.value) })}>
              <option value="default">Page default</option>
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size} rows</option>)}
            </select>
          </SettingRow>
          <SettingRow id="start-page" title="Landing page" description="Where you start after signing in or opening the admin home.">
            <select id="start-page" className={selectStyle} value={preferences.startPage} onChange={(event) => setAdminPreferences({ startPage: event.target.value })}>
              {START_PAGES.map((page) => <option key={page.value} value={page.value}>{page.label}</option>)}
            </select>
          </SettingRow>
        </CardContent>
      </Card>

      {/* 4. Account & session Card */}
      <Card className="flex flex-col h-full border-0 shadow-sm bg-card">
        <SectionTitle icon={ShieldCheck} title="Account & session" description="Your current account and access level." />
        <CardContent className="flex flex-col flex-1 justify-between p-4 sm:p-5 pt-0 space-y-3">
          <div className="space-y-3 flex-1">
            <div className="rounded-xl border-0 bg-muted/30 p-3.5 shadow-2xs">
              <p className="break-words text-sm font-medium">{user?.name}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{user?.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user?.roles.map((role) => <Badge key={role} variant="outline" className="border border-input shadow-2xs">{ROLE_LABEL[role] ?? role}</Badge>)}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/administration/roles-permissions">View permissions <ExternalLink /></Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDialog("logout")} className="border border-input shadow-xs">
                <LogOut />Sign out
              </Button>
            </div>
            <details className="rounded-xl border-0 bg-muted/30 p-3.5 text-xs shadow-2xs">
              <summary className="cursor-pointer font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Connection details
              </summary>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-muted-foreground">API address</p>
                  <code className="mt-1 block select-text break-all">{API_BASE_URL}</code>
                </div>
                <Button variant="ghost" size="icon" aria-label="Copy API address" onClick={copyApiUrl}>
                  <Copy />
                </Button>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
    <p className="text-xs leading-5 text-muted-foreground">Preferences are saved in this browser and apply to your admin workspace.</p>
    <ConfirmDialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }} title={dialog === "logout" ? "Sign out of this session?" : "Restore default preferences?"} description={dialog === "logout" ? "You’ll need to sign in again to access the admin panel." : "Your theme and workspace preferences will return to their defaults. Your account and platform data stay unchanged."} confirmLabel={dialog === "logout" ? "Sign out" : "Restore defaults"} onConfirm={confirmAction} />
    <CustomThemeDialog open={customDialogOpen} onOpenChange={setCustomDialogOpen} />
  </div>;
}
