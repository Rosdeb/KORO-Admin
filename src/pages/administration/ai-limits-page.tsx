import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bot,
  Gauge,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  AlertTriangle,
  Info,
  Users,
  Globe,
  Database,
  CheckCircle2,
  Zap,
  Clock,
  Search,
  Check,
  Languages,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { platformConfigApi, translationsApi, aiCacheApi } from "@/api";
import { queryKeys } from "@/lib/query-keys";
import { ApiError } from "@/api/client";
import type { AiModelRosterConfig, SearchRateLimitConfig, AiCacheEntry } from "@/types/api";

const DEFAULT_MODELS_PRESET = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-2.5-flash",
];

const COMMON_MODEL_SUGGESTIONS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-exp-1206",
];

const RATE_LIMIT_PRESETS: {
  label: string;
  config: Omit<SearchRateLimitConfig, "enabled">;
}[] = [
  {
    label: "Standard (Recommended)",
    config: {
      userDailyLimit: 100,
      userMonthlyLimit: 1500,
      anonDailyLimit: 25,
      anonMonthlyLimit: 250,
    },
  },
  {
    label: "High Capacity",
    config: {
      userDailyLimit: 250,
      userMonthlyLimit: 5000,
      anonDailyLimit: 50,
      anonMonthlyLimit: 500,
    },
  },
  {
    label: "Strict Protection",
    config: {
      userDailyLimit: 50,
      userMonthlyLimit: 750,
      anonDailyLimit: 10,
      anonMonthlyLimit: 100,
    },
  },
];

export function AiLimitsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "cache" ? "cache" : "config";

  // Tab change handler
  const handleTabChange = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "config") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
      }
      return next;
    });
  };

  // ─── QUERIES ─────────────────────────────────────────────────────────────
  const {
    data: aiConfigData,
    isLoading: isAiLoading,
    isFetching: isAiFetching,
    error: aiError,
    refetch: refetchAi,
  } = useQuery({
    queryKey: queryKeys.aiModels,
    queryFn: platformConfigApi.getAiModels,
  });

  const {
    data: rateLimitsData,
    isLoading: isLimitsLoading,
    isFetching: isLimitsFetching,
    error: limitsError,
    refetch: refetchLimits,
  } = useQuery({
    queryKey: queryKeys.searchRateLimits,
    queryFn: platformConfigApi.getSearchRateLimits,
  });

  const {
    data: cacheEntries = [],
    isLoading: isCacheLoading,
    isFetching: isCacheFetching,
    refetch: refetchCache,
  } = useQuery({
    queryKey: queryKeys.aiCache,
    queryFn: aiCacheApi.list,
  });

  // ─── LOCAL STATE FOR CONFIG ──────────────────────────────────────────────
  const [editedModels, setEditedModels] = useState<string[] | null>(null);
  const [editedAiEnabled, setEditedAiEnabled] = useState<boolean | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [editedRateLimits, setEditedRateLimits] = useState<SearchRateLimitConfig | null>(null);

  // Effective values
  const models = editedModels ?? aiConfigData?.models ?? DEFAULT_MODELS_PRESET;
  const aiEnabled = editedAiEnabled ?? aiConfigData?.enabled ?? true;
  const rateLimits = editedRateLimits ?? rateLimitsData ?? {
    enabled: true,
    userDailyLimit: 100,
    userMonthlyLimit: 1500,
    anonDailyLimit: 25,
    anonMonthlyLimit: 250,
  };

  // ─── LOCAL STATE FOR CACHE FILTERING & ACTIONS ───────────────────────────
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CACHED" | "PROMOTED">("ALL");
  const [entryToPurge, setEntryToPurge] = useState<AiCacheEntry | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  // ─── MUTATIONS ───────────────────────────────────────────────────────────
  const updateAiMutation = useMutation({
    mutationFn: (payload: AiModelRosterConfig) => platformConfigApi.updateAiModels(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.aiModels, updated);
      setEditedModels(null);
      setEditedAiEnabled(null);
      toast.success("AI model roster updated successfully", {
        description: `${updated.models.length} model(s) active in failover chain.`,
      });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update AI model roster");
    },
  });

  const updateLimitsMutation = useMutation({
    mutationFn: (payload: SearchRateLimitConfig) => platformConfigApi.updateSearchRateLimits(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.searchRateLimits, updated);
      setEditedRateLimits(null);
      toast.success("Search rate limits updated successfully", {
        description: updated.enabled ? "Limits enforced dynamically." : "Rate limiting temporarily disabled.",
      });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to update rate limits");
    },
  });

  const reindexMutation = useMutation({
    mutationFn: () => translationsApi.reindex(),
    onSuccess: (data) => {
      toast.success(data.message || "Search index rebuilt", {
        description: `Successfully indexed ${data.totalIndexed.toLocaleString()} translation entries into memory.`,
      });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to rebuild search index");
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (id: string) => aiCacheApi.promote(id),
    onMutate: (id) => setPromotingId(id),
    onSuccess: (data) => {
      toast.success(data?.message || "Translation promoted to official dictionary!", {
        description: "Sentence and vocabulary are now marked verified: true in MongoDB.",
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiCache });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to promote AI translation");
    },
    onSettled: () => setPromotingId(null),
  });

  const purgeMutation = useMutation({
    mutationFn: (id: string) => aiCacheApi.purge(id),
    onSuccess: () => {
      toast.success("AI cache entry purged successfully");
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiCache });
      setEntryToPurge(null);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Failed to purge cache entry");
    },
  });

  // ─── AI ROSTER HANDLERS ──────────────────────────────────────────────────
  function moveModel(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= models.length) return;
    const next = [...models];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setEditedModels(next);
  }

  function removeModel(index: number) {
    if (models.length <= 1) {
      toast.warning("Keep at least one model in the roster so searches have a fallback.");
      return;
    }
    setEditedModels(models.filter((_, i) => i !== index));
  }

  function addModel(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (models.includes(trimmed)) {
      toast.info(`"${trimmed}" is already present in the roster.`);
      return;
    }
    setEditedModels([...models, trimmed]);
    setNewModelName("");
  }

  function handleSaveAi() {
    if (models.length === 0) {
      toast.error("Please add at least one AI model to the roster.");
      return;
    }
    updateAiMutation.mutate({
      models,
      enabled: aiEnabled,
    });
  }

  function handleSaveLimits() {
    if (
      rateLimits.userDailyLimit <= 0 ||
      rateLimits.userMonthlyLimit <= 0 ||
      rateLimits.anonDailyLimit <= 0 ||
      rateLimits.anonMonthlyLimit <= 0
    ) {
      toast.error("Limits must be positive numbers greater than 0.");
      return;
    }
    updateLimitsMutation.mutate(rateLimits);
  }

  function handleRefreshAll() {
    void refetchAi();
    void refetchLimits();
    void refetchCache();
  }

  // ─── FILTERED CACHE DATA & METRICS ───────────────────────────────────────
  const filteredCacheEntries = useMemo(() => {
    return cacheEntries.filter((entry) => {
      if (statusFilter === "PROMOTED" && !entry.promoted) return false;
      if (statusFilter === "CACHED" && entry.promoted) return false;
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        entry.query?.toLowerCase().includes(q) ||
        entry.translation?.toLowerCase().includes(q) ||
        entry.pronunciation?.toLowerCase().includes(q) ||
        entry.notes?.toLowerCase().includes(q) ||
        entry.model?.toLowerCase().includes(q)
      );
    });
  }, [cacheEntries, searchFilter, statusFilter]);

  const totalCachedCount = cacheEntries.length;
  const totalSearchHits = cacheEntries.reduce((acc, curr) => acc + (curr.hitCount || 1), 0);
  const totalPromotedCount = cacheEntries.filter((e) => e.promoted).length;

  const isRefreshing = isAiFetching || isLimitsFetching || isCacheFetching;
  const anyError = aiError || limitsError;

  if (anyError && !aiConfigData && !rateLimitsData) {
    return <ErrorState error={anyError} onRetry={handleRefreshAll} className="mt-10" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI & Rate Limits"
        description="Manage multi-model failover, search rate limiting quotas, and the Sub-5ms AI Query Cache with dictionary promotion moderation."
        actions={
          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={handleRefreshAll} isRefreshing={isRefreshing} />
          </div>
        }
      />

      {/* Tabs navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="config" className="gap-2 text-xs font-medium">
            <Bot className="size-3.5" />
            <span>Models & Search Limits</span>
          </TabsTrigger>
          <TabsTrigger value="cache" className="gap-2 text-xs font-medium">
            <Sparkles className="size-3.5" />
            <span>AI Translation Cache</span>
            {totalCachedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] font-mono">
                {totalCachedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: CONFIGURATION (MODELS, LIMITS, RAM SEARCH INDEX)
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="config" className="space-y-6 mt-0">
          {/* Overview Stat Badges */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Failover System</span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight">
                  {aiEnabled ? "Active" : "Disabled"}
                </span>
                <Badge variant={aiEnabled ? "success" : "secondary"} className="text-[10px]">
                  {aiEnabled ? "Auto-Failover" : "Off"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {models.length} model{models.length === 1 ? "" : "s"} in priority chain
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Primary Model</span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight truncate">
                {models[0] || "None"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">First model called on fallback</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Search Quotas</span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Gauge className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-tight">
                  {rateLimits.enabled ? "Enforced" : "Disabled"}
                </span>
                <Badge variant={rateLimits.enabled ? "default" : "outline"} className="text-[10px]">
                  {rateLimits.enabled ? "Live" : "Bypassed"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Daily & monthly request caps</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">User Search Cap</span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight">
                {rateLimits.userDailyLimit}{" "}
                <span className="text-xs font-normal text-muted-foreground">/ day</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {rateLimits.userMonthlyLimit} searches / month
              </p>
            </Card>
          </div>

          {/* Main Grid: AI Models Roster & Search Rate Limits */}
          <div className="grid items-start gap-6 xl:grid-cols-2">
            {/* SECTION 1: AI MULTI-MODEL FAILOVER */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bot className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg">AI Model Failover Roster</CardTitle>
                      <CardDescription className="text-xs">
                        Prioritized sequence for AI-powered translation searches
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ai-toggle" className="text-xs font-medium text-muted-foreground cursor-pointer">
                      {aiEnabled ? "Failover On" : "Failover Off"}
                    </Label>
                    <Switch
                      id="ai-toggle"
                      checked={aiEnabled}
                      onCheckedChange={(checked) => setEditedAiEnabled(checked)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 p-4 sm:p-5">
                {/* Info Notice */}
                <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-xs leading-relaxed text-muted-foreground">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">How Automatic Multi-Model Failover works</p>
                    <p className="mt-0.5">
                      When a search has no database match, it queries the <strong>Primary</strong> model. If that model hits a rate limit / quota (HTTP 429) or times out, the backend automatically tries the next model in this roster without erroring out to the user.
                    </p>
                  </div>
                </div>

                {/* Model List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Model Priority Chain ({models.length})
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setEditedModels([...DEFAULT_MODELS_PRESET])}
                    >
                      <RotateCcw className="size-3 mr-1" /> Reset to Recommended
                    </Button>
                  </div>

                  {isAiLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  ) : models.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      <AlertTriangle className="mx-auto size-6 text-warning mb-1" />
                      <p className="font-medium text-foreground">No models configured</p>
                      <p className="mt-1">Add models below to activate automatic failover.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {models.map((model, index) => {
                        const isPrimary = index === 0;
                        return (
                          <div
                            key={`${model}-${index}`}
                            className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors ${
                              isPrimary
                                ? "border-emerald-500/40 bg-emerald-500/[0.04] dark:border-emerald-500/30"
                                : "border-border bg-card hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                  isPrimary
                                    ? "bg-emerald-600 text-white dark:bg-emerald-500"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs font-semibold text-foreground break-all">
                                    {model}
                                  </code>
                                  {isPrimary ? (
                                    <Badge variant="success" className="text-[10px] py-0 px-1.5 h-4">
                                      Primary
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                      Failover #{index}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                disabled={index === 0}
                                onClick={() => moveModel(index, "up")}
                                title="Move up in priority"
                              >
                                <ArrowUp className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-foreground"
                                disabled={index === models.length - 1}
                                onClick={() => moveModel(index, "down")}
                                title="Move down in priority"
                              >
                                <ArrowDown className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive hover:bg-destructive/10"
                                onClick={() => removeModel(index)}
                                title="Remove from roster"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Add Model Form */}
                <div className="space-y-2 rounded-lg border border-dashed border-border p-3 bg-muted/20">
                  <Label className="text-xs font-medium">Add Model to Failover Roster</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. gemini-2.0-flash"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addModel(newModelName);
                        }
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      className="h-8 shrink-0 text-xs gap-1"
                      onClick={() => addModel(newModelName)}
                      disabled={!newModelName.trim()}
                    >
                      <Plus className="size-3.5" /> Add
                    </Button>
                  </div>

                  {/* Suggestions chips */}
                  <div className="pt-1">
                    <p className="text-[11px] text-muted-foreground mb-1.5">Quick suggestions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_MODEL_SUGGESTIONS.map((preset) => {
                        const alreadyAdded = models.includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => addModel(preset)}
                            disabled={alreadyAdded}
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-mono transition-colors ${
                              alreadyAdded
                                ? "border-transparent bg-muted/60 text-muted-foreground/60 cursor-not-allowed"
                                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            +{preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Save AI Button */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Applies immediately to live searches without restart
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSaveAi}
                    disabled={updateAiMutation.isPending || isAiLoading}
                    className="gap-1.5"
                  >
                    <Save className="size-4" />
                    {updateAiMutation.isPending ? "Updating Roster…" : "Save AI Roster"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: SEARCH RATE LIMITS */}
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Gauge className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg">Search Rate Limits</CardTitle>
                      <CardDescription className="text-xs">
                        Dynamic search quotas for registered users and anonymous visitors
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="limits-toggle" className="text-xs font-medium text-muted-foreground cursor-pointer">
                      {rateLimits.enabled ? "Limits On" : "Limits Off"}
                    </Label>
                    <Switch
                      id="limits-toggle"
                      checked={rateLimits.enabled}
                      onCheckedChange={(checked) =>
                        setEditedRateLimits((prev) => ({
                          ...(prev ?? rateLimits),
                          enabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 p-4 sm:p-5">
                {/* Presets Bar */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Preset Configurations
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {RATE_LIMIT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setEditedRateLimits((prev) => ({
                            ...(prev ?? rateLimits),
                            ...preset.config,
                          }))
                        }
                        className="flex flex-col rounded-lg border border-border bg-card p-2.5 text-left text-xs transition-colors hover:border-primary/50 hover:bg-muted/20 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="font-semibold text-foreground">{preset.label}</span>
                        <span className="mt-1 text-[11px] text-muted-foreground">
                          User: {preset.config.userDailyLimit}/d · {preset.config.userMonthlyLimit}/m
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Anon: {preset.config.anonDailyLimit}/d · {preset.config.anonMonthlyLimit}/m
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inputs: Registered Users */}
                <div className="rounded-lg border border-border p-3.5 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Users className="size-4 text-blue-500" />
                    <span>Registered Users Limits</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="user-daily" className="text-xs text-muted-foreground">
                        Daily Limit (searches / day)
                      </Label>
                      <Input
                        id="user-daily"
                        type="number"
                        min="1"
                        value={rateLimits.userDailyLimit}
                        onChange={(e) =>
                          setEditedRateLimits((prev) => ({
                            ...(prev ?? rateLimits),
                            userDailyLimit: Math.max(1, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="user-monthly" className="text-xs text-muted-foreground">
                        Monthly Limit (searches / month)
                      </Label>
                      <Input
                        id="user-monthly"
                        type="number"
                        min="1"
                        value={rateLimits.userMonthlyLimit}
                        onChange={(e) =>
                          setEditedRateLimits((prev) => ({
                            ...(prev ?? rateLimits),
                            userMonthlyLimit: Math.max(1, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Inputs: Anonymous Visitors */}
                <div className="rounded-lg border border-border p-3.5 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Globe className="size-4 text-emerald-500" />
                    <span>Anonymous Visitors Limits (IP-based)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="anon-daily" className="text-xs text-muted-foreground">
                        Daily Limit (searches / day)
                      </Label>
                      <Input
                        id="anon-daily"
                        type="number"
                        min="1"
                        value={rateLimits.anonDailyLimit}
                        onChange={(e) =>
                          setEditedRateLimits((prev) => ({
                            ...(prev ?? rateLimits),
                            anonDailyLimit: Math.max(1, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="anon-monthly" className="text-xs text-muted-foreground">
                        Monthly Limit (searches / month)
                      </Label>
                      <Input
                        id="anon-monthly"
                        type="number"
                        min="1"
                        value={rateLimits.anonMonthlyLimit}
                        onChange={(e) =>
                          setEditedRateLimits((prev) => ({
                            ...(prev ?? rateLimits),
                            anonMonthlyLimit: Math.max(1, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Information Callout */}
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                  <Info className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <p>
                    When a user or IP exceeds their limit, the API returns HTTP 429 Too Many Requests until the window resets (midnight UTC for daily, 1st of month for monthly).
                  </p>
                </div>

                {/* Save Limits Button */}
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">
                    Updates in-memory rate limiter immediately
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSaveLimits}
                    disabled={updateLimitsMutation.isPending || isLimitsLoading}
                    className="gap-1.5"
                  >
                    <Save className="size-4" />
                    {updateLimitsMutation.isPending ? "Updating Limits…" : "Save Rate Limits"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 3: IN-MEMORY SEARCH INDEX & MONGODB SYNC */}
          <Card className="overflow-hidden border-border">
            <CardHeader className="border-b border-border bg-muted/20 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Database className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Search Engine In-Memory Index
                    </CardTitle>
                    <CardDescription className="text-xs">
                      RAM binary-search and sentence token cache for lightning-fast vocabulary searches
                    </CardDescription>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reindexMutation.mutate()}
                  disabled={reindexMutation.isPending}
                  className="gap-1.5 shadow-sm"
                >
                  <Database className={`size-3.5 ${reindexMutation.isPending ? "animate-spin text-primary" : ""}`} />
                  {reindexMutation.isPending ? "Rebuilding Index…" : "Rebuild Search Index"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Auto-Sync on Approval</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Approving single submissions or bulk submissions automatically syncs the RAM index instantly.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Live Database Fallback</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Searches query MongoDB in real time so newly inserted words appear with zero delay.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Manual Admin Reindex</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Trigger an on-demand rebuild anytime bulk imports or raw MongoDB database modifications occur.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: SUB-5MS AI QUERY CACHE & DICTIONARY PROMOTION
           ═══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="cache" className="space-y-6 mt-0">
          {/* Cache Metrics Banner */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Cached Sentences</span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Database className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight">
                {totalCachedCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Persisted in MongoDB ai_db_search</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Search Cache Hits</span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Zap className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight">
                {totalSearchHits.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Gemini API calls saved</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Response Latency</span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Clock className="size-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">&lt; 5 ms</span>
                <span className="text-xs text-muted-foreground">instant</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Sub-millisecond DB/RAM retrieval</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Promoted to Dict</span>
                <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight">
                {totalPromotedCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Permanent verified translations</p>
            </Card>
          </div>

          {/* Table Container Card */}
          <Card className="overflow-hidden border-border">
            <CardHeader className="border-b border-border bg-muted/10 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span>Cached Sentence Translations</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {filteredCacheEntries.length} / {totalCachedCount}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Sentence-aware AI translations cached from live searches. Review and promote them directly into the verified dictionary.
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filter queries, translations…"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  <Select
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as "ALL" | "CACHED" | "PROMOTED")}
                  >
                    <SelectTrigger className="h-8 w-[130px] text-xs">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">All Entries</SelectItem>
                      <SelectItem value="CACHED" className="text-xs">Cached Only</SelectItem>
                      <SelectItem value="PROMOTED" className="text-xs">Promoted Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isCacheLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : filteredCacheEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
                    <Languages className="size-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">No cached translations found</h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    {searchFilter
                      ? "No entries match your current search criteria. Try a different query or clear the filter."
                      : "When users search sentence phrases, the Gemini AI engine creates authentic Koch translations and automatically caches them here."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Source Search Query</TableHead>
                      <TableHead className="w-[35%]">Koch Translation</TableHead>
                      <TableHead className="w-[10%] text-center">Hits</TableHead>
                      <TableHead className="w-[12%]">AI Model</TableHead>
                      <TableHead className="w-[13%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCacheEntries.map((entry) => {
                      const isPromoting = promotingId === entry.id;
                      return (
                        <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                          {/* Query text */}
                          <TableCell className="align-top py-3 font-medium">
                            <div className="space-y-1">
                              <span className="text-xs sm:text-sm text-foreground select-text font-medium">
                                {entry.query}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span>{entry.sourceLanguage || "English"}</span>
                                <span>→</span>
                                <span>{entry.targetLanguage || "Koch"}</span>
                                {entry.createdAt && (
                                  <>
                                    <span className="text-muted-foreground/40">·</span>
                                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Koch Translation */}
                          <TableCell className="align-top py-3">
                            <div className="space-y-1">
                              <div className="text-xs sm:text-sm font-semibold text-foreground select-text">
                                {entry.translation}
                              </div>
                              {entry.pronunciation && (
                                <div className="text-[11px] font-mono text-muted-foreground">
                                  /{entry.pronunciation}/
                                </div>
                              )}
                              {entry.notes && (
                                <div className="text-[11px] text-muted-foreground line-clamp-1 italic">
                                  {entry.notes}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Hit Count */}
                          <TableCell className="align-top py-3 text-center">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs gap-1 border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                            >
                              <Zap className="size-3 fill-amber-500/30" />
                              {entry.hitCount ?? 1}
                            </Badge>
                          </TableCell>

                          {/* AI Model */}
                          <TableCell className="align-top py-3">
                            <Badge variant="secondary" className="font-mono text-[10px] truncate max-w-[120px]">
                              {entry.model || "gemini-1.5-flash"}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="align-top py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {entry.promoted ? (
                                <Badge
                                  variant="success"
                                  className="text-[10px] h-7 px-2 gap-1 font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                >
                                  <Check className="size-3" />
                                  Promoted
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                                  onClick={() => promoteMutation.mutate(entry.id)}
                                  disabled={isPromoting}
                                  title="Promote directly into verified official dictionary"
                                >
                                  <Sparkles className={`size-3 ${isPromoting ? "animate-spin" : ""}`} />
                                  {isPromoting ? "Promoting…" : "Promote"}
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setEntryToPurge(entry)}
                                title="Purge entry from cache"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Purging AI Cache Entry */}
      <ConfirmDialog
        open={Boolean(entryToPurge)}
        onOpenChange={(open) => {
          if (!open) setEntryToPurge(null);
        }}
        title="Purge Cached AI Translation"
        description={`Are you sure you want to delete the cached translation for "${entryToPurge?.query}"? The system will query the Gemini API if someone searches this sentence again.`}
        confirmLabel="Purge Entry"
        variant="destructive"
        onConfirm={async () => {
          if (entryToPurge) {
            await purgeMutation.mutateAsync(entryToPurge.id);
          }
        }}
      />
    </div>
  );
}
