import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Globe,
  Database,
  Filter,
  Check,
  RotateCcw,
  Languages as LanguagesIcon,
  FolderTree,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { downloadDictionaryExport } from "@/api/dictionary";
import { statisticsApi } from "@/api/statistics";
import { categoriesApi } from "@/api/categories";
import { languagesApi } from "@/api/languages";
import { queryKeys } from "@/lib/query-keys";
import { formatNumber } from "@/lib/utils";
import type { Language } from "@/types/api";

export function DictionaryExportPage() {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
  const [hasInitializedLangs, setHasInitializedLangs] = useState(false);

  // Queries
  const statsQuery = useQuery({
    queryKey: queryKeys.adminStatistics,
    queryFn: statisticsApi.admin,
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoriesApi.list,
    staleTime: 60_000,
  });

  const languagesQuery = useQuery({
    queryKey: queryKeys.languages,
    queryFn: languagesApi.list,
    staleTime: 60_000,
  });

  const categories = categoriesQuery.data ?? [];
  const languages = languagesQuery.data ?? [];

  // Default languages: Koch, Bangla, English (or all active if missing)
  const defaultLanguageIds = useMemo(() => {
    if (languages.length === 0) return [];
    const preferredOrder = ["koch", "kdq", "bn", "ben", "en", "eng"];
    const defaults: string[] = [];

    // Prioritize standard Koch, Bangla, English
    for (const code of preferredOrder) {
      const found = languages.find(
        (l) =>
          (l.code && l.code.toLowerCase() === code) ||
          (l.name && l.name.toLowerCase().includes(code)),
      );
      if (found && !defaults.includes(found.id)) {
        defaults.push(found.id);
      }
    }

    // If none matched, select all active languages
    if (defaults.length === 0) {
      return languages.filter((l) => l.active).map((l) => l.id);
    }
    return defaults;
  }, [languages]);

  // Initialize selected languages once loaded
  useEffect(() => {
    if (!hasInitializedLangs && defaultLanguageIds.length > 0) {
      setSelectedLanguageIds(defaultLanguageIds);
      setHasInitializedLangs(true);
    }
  }, [defaultLanguageIds, hasInitializedLangs]);

  const totalConcepts =
    typeof statsQuery.data?.totalConcepts === "number" ? statsQuery.data.totalConcepts : null;
  const totalTranslations =
    typeof statsQuery.data?.totalTranslations === "number"
      ? statsQuery.data.totalTranslations
      : null;

  // Selected language entities in order
  const selectedLanguagesList = useMemo(() => {
    return selectedLanguageIds
      .map((id) => languages.find((l) => l.id === id))
      .filter((l): l is Language => Boolean(l));
  }, [selectedLanguageIds, languages]);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategoryId === "ALL") return "All Categories";
    const found = categories.find((c) => c.id === selectedCategoryId);
    return found ? found.name : "Selected Category";
  }, [selectedCategoryId, categories]);

  function handleToggleLanguage(id: string) {
    setSelectedLanguageIds((prev) =>
      prev.includes(id) ? prev.filter((langId) => langId !== id) : [...prev, id],
    );
  }

  function handleSelectAllLanguages() {
    setSelectedLanguageIds(languages.map((l) => l.id));
  }

  function handleResetDefaultLanguages() {
    setSelectedLanguageIds(defaultLanguageIds);
  }

  async function handleDownload() {
    if (isDownloading || selectedLanguageIds.length === 0) return;
    setIsDownloading(true);
    try {
      const filename = await downloadDictionaryExport({
        categoryId: selectedCategoryId,
        languageIds: selectedLanguageIds,
      });
      toast.success("Dictionary exported successfully", {
        description: `Downloaded ${filename}`,
      });
    } catch (err: unknown) {
      console.error("Export failed:", err);
      const message = err instanceof Error ? err.message : "Failed to export dictionary CSV";
      toast.error("Export failed", { description: message });
    } finally {
      setIsDownloading(false);
    }
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/content/translations");
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back navigation & breadcrumbs */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleBack}
        >
          <ArrowLeft className="size-4" />
          <span>Back</span>
        </Button>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <Link
          to="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs text-muted-foreground">Content</span>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs font-medium text-foreground">Dictionary Export</span>
      </div>

      <PageHeader
        title="Dictionary Export"
        description="Download customized dictionary records filtered by category and languages in standardized CSV format with UTF-8 BOM"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="hidden sm:inline-flex gap-1.5 text-xs h-9"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Export Configuration Card */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5 sm:mt-0">
                  <FileSpreadsheet className="size-5 sm:size-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
                      Export Dictionary
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="sm:hidden inline-flex gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] px-2 py-0.5"
                    >
                      <CheckCircle2 className="size-3" />
                      Dynamic
                    </Badge>
                  </div>
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    Custom Koch–Bangla–English & multilingual category-based dictionary export
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex shrink-0 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs px-2.5 py-1 self-start"
              >
                <CheckCircle2 className="size-3" />
                Dynamic Export
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-0 space-y-5 sm:space-y-6">
            {/* 1. Category Filter Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category-select" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <FolderTree className="size-4 text-primary" />
                  Category Scope
                </Label>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {selectedCategoryId === "ALL" ? "All concepts" : selectedCategoryName}
                </span>
              </div>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger id="category-select" className="w-full text-xs sm:text-sm h-10">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="ALL" className="font-medium">
                    All Categories (Complete Dictionary)
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Languages Selection Section */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <LanguagesIcon className="size-4 text-primary" />
                  Select Languages to Export
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                    {selectedLanguageIds.length} of {languages.length}
                  </Badge>
                </Label>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSelectAllLanguages}
                    className="text-[11px] font-medium text-primary hover:underline outline-none"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <button
                    type="button"
                    onClick={handleResetDefaultLanguages}
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 outline-none"
                  >
                    <RotateCcw className="size-3" />
                    Reset Default
                  </button>
                </div>
              </div>

              {/* Languages toggle list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {languages.map((lang) => {
                  const isChecked = selectedLanguageIds.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => handleToggleLanguage(lang.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isChecked
                          ? "bg-primary/5 border-primary/40 text-foreground"
                          : "bg-muted/20 border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleLanguage(lang.id)}
                          className="pointer-events-none"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate leading-tight">
                            {lang.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {lang.nativeName ? `${lang.nativeName} (${lang.code})` : lang.code}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedLanguageIds.length === 0 && (
                <p className="text-[11px] text-destructive font-medium">
                  Please select at least one language to export.
                </p>
              )}
            </div>

            {/* 3. Export Parameters Summary Box */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/60">
              <div className="space-y-0.5 sm:space-y-1 text-center sm:text-left min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Format
                </p>
                <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="size-1.5 sm:size-2 rounded-full bg-emerald-500 shrink-0" />
                  CSV
                </p>
              </div>

              <div className="space-y-0.5 sm:space-y-1 text-center sm:text-left min-w-0 border-x border-border/40 px-1 sm:px-0 sm:border-0">
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Category
                </p>
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate" title={selectedCategoryName}>
                  {selectedCategoryName}
                </p>
              </div>

              <div className="space-y-0.5 sm:space-y-1 text-center sm:text-left min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Encoding
                </p>
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                  UTF-8 BOM
                </p>
              </div>
            </div>

            {/* 4. Live CSV Header & Structure Preview */}
            <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Filter className="size-3.5 text-primary" />
                  Dynamic CSV Columns Output
                </span>
                <span className="text-[11px] text-muted-foreground font-mono self-start sm:self-auto">
                  text/csv; charset=UTF-8
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="inline-flex items-center rounded-md bg-muted px-2 sm:px-2.5 py-1 text-xs font-mono font-bold text-foreground border border-border">
                  ID
                </span>
                {selectedLanguagesList.map((lang) => (
                  <span
                    key={lang.id}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 sm:px-2.5 py-1 text-xs font-mono font-medium border border-primary/20"
                  >
                    <Check className="size-3 text-primary" />
                    {lang.name}
                  </span>
                ))}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed text-left">
                Export will stream records with the selected columns. Pre-configured with a UTF-8 Byte Order Mark (BOM) to preserve Bangla (বাংলা), Koch, and native scripts seamlessly across Microsoft Excel, Apple Numbers, and data tools.
              </p>
            </div>

            {/* 5. Primary Action Button */}
            <div className="pt-1 sm:pt-2">
              <Button
                size="lg"
                onClick={handleDownload}
                disabled={isDownloading || selectedLanguageIds.length === 0}
                className="w-full sm:w-auto gap-2 px-6 font-semibold shadow-sm h-11 text-sm sm:text-base justify-center"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    Generating CSV export...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Download CSV ({selectedLanguageIds.length} {selectedLanguageIds.length === 1 ? "language" : "languages"})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Summary Card */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm font-semibold">Dictionary Summary</CardTitle>
              <CardDescription className="text-xs">Live platform dataset metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Database className="size-3.5" /> Total Concepts
                </span>
                <span className="font-semibold text-foreground truncate">
                  {totalConcepts !== null ? formatNumber(totalConcepts) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Globe className="size-3.5" /> Total Translations
                </span>
                <span className="font-semibold text-foreground truncate">
                  {totalTranslations !== null ? formatNumber(totalTranslations) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <FolderTree className="size-3.5" /> Total Categories
                </span>
                <span className="font-semibold text-foreground truncate">
                  {categories.length > 0 ? categories.length : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <LanguagesIcon className="size-3.5" /> Total Languages
                </span>
                <span className="font-semibold text-foreground truncate">
                  {languages.length > 0 ? languages.length : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
