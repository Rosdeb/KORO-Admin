import { useState, useEffect, useMemo, useRef } from "react";
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
  BookOpen,
  Printer,
  Eye,
  FileUp,
  Columns,
  LayoutGrid,
  BookMarked,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { dictionaryApi, downloadDictionaryExport } from "@/api/dictionary";
import { statisticsApi } from "@/api/statistics";
import { categoriesApi } from "@/api/categories";
import { languagesApi } from "@/api/languages";
import { queryKeys } from "@/lib/query-keys";
import { formatNumber } from "@/lib/utils";
import type { Language } from "@/types/api";
import {
  parseCsv,
  buildBookData,
  printDictionaryBook,
  type DictionaryBookData,
  type BookConfig,
  DEFAULT_BOOK_CONFIG,
} from "@/lib/dictionary-book";
import { BookPreviewModal } from "@/components/content/book-preview-modal";

export function DictionaryExportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export mode: "csv" | "book-pdf"
  const [exportMode, setExportMode] = useState<"csv" | "book-pdf">("csv");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
  const [hasInitializedLangs, setHasInitializedLangs] = useState(false);

  // Book Specific Configuration State
  const [bookConfig, setBookConfig] = useState<BookConfig>(DEFAULT_BOOK_CONFIG);
  const [bookData, setBookData] = useState<DictionaryBookData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const languages = useMemo(() => languagesQuery.data ?? [], [languagesQuery.data]);

  // Default languages: Koch, Bangla, English
  const defaultLanguageIds = useMemo(() => {
    if (languages.length === 0) return [];
    const preferredOrder = ["koch", "kdq", "bn", "ben", "en", "eng"];
    const defaults: string[] = [];

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

    if (defaults.length === 0) {
      return languages.filter((l) => l.active).map((l) => l.id);
    }
    return defaults;
  }, [languages]);

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

  // 1. Download CSV directly
  async function handleDownloadCsv() {
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

  // Helper to fetch CSV and convert to BookData
  async function fetchAndBuildBookData(): Promise<DictionaryBookData> {
    const { blob } = await dictionaryApi.exportCsv({
      categoryId: selectedCategoryId,
      languageIds: selectedLanguageIds,
    });
    const text = await blob.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      throw new Error("Export returned no dictionary rows to generate book.");
    }
    const primaryCandidate = bookConfig.primaryLanguage || selectedLanguagesList[0]?.name;
    const data = buildBookData(rows, primaryCandidate);
    setBookData(data);
    return data;
  }

  // 2. Open Live Book Preview Modal
  async function handlePreviewBook() {
    if (isGeneratingBook || selectedLanguageIds.length === 0) return;
    setIsGeneratingBook(true);
    try {
      const data = await fetchAndBuildBookData();
      setIsPreviewOpen(true);
      toast.success("Book compiled successfully", {
        description: `Ready to preview ${data.totalEntries} entries in ${data.languages.length} languages`,
      });
    } catch (err: unknown) {
      console.error("Book compilation failed:", err);
      const message = err instanceof Error ? err.message : "Failed to compile dictionary book";
      toast.error("Book compilation failed", { description: message });
    } finally {
      setIsGeneratingBook(false);
    }
  }

  // 3. Direct Print / PDF Download
  async function handlePrintBookDirectly() {
    if (isGeneratingBook || selectedLanguageIds.length === 0) return;
    setIsGeneratingBook(true);
    try {
      const data = await fetchAndBuildBookData();
      printDictionaryBook(data, {
        ...bookConfig,
        primaryLanguage: bookConfig.primaryLanguage || data.languages[0],
      });
      toast.success("Print dialog opened", {
        description: "Choose 'Save as PDF' in the print dialog to download vector PDF book.",
      });
    } catch (err: unknown) {
      console.error("Print failed:", err);
      const message = err instanceof Error ? err.message : "Failed to open print / PDF window";
      toast.error("PDF Export failed", { description: message });
    } finally {
      setIsGeneratingBook(false);
    }
  }

  // 4. File Upload: Import CSV from computer to generate Book
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        throw new Error("The selected CSV file has no data rows.");
      }
      const data = buildBookData(rows);
      setBookData(data);
      setIsPreviewOpen(true);
      toast.success("Imported CSV into Book", {
        description: `Loaded ${data.totalEntries} entries from "${file.name}"`,
      });
    } catch (err: unknown) {
      console.error("CSV import failed:", err);
      const message = err instanceof Error ? err.message : "Failed to read CSV file";
      toast.error("CSV Import Error", { description: message });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        title="Dictionary Export & Book System"
        description="Export filtered multilingual records as clean UTF-8 CSV or compile publication-ready A4 Dictionary Books (PDF)"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-1.5 text-xs h-9"
              title="Import an existing CSV file to generate a dictionary book"
            >
              <FileUp className="size-3.5" />
              <span className="hidden sm:inline">Import CSV to Book</span>
              <span className="sm:hidden">Import CSV</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="hidden sm:inline-flex gap-1.5 text-xs h-9"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back</span>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Export Configuration Card */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border/60">
            {/* Format Mode Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose Export Format
                </span>
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/30 bg-primary/10 text-primary font-medium text-[11px] px-2 py-0.5"
                >
                  <Sparkles className="size-3" />
                  Fast Direct MongoDB Pipeline
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Format 1: CSV */}
                <button
                  type="button"
                  onClick={() => setExportMode("csv")}
                  className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all outline-none ${
                    exportMode === "csv"
                      ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-sm"
                      : "bg-card border-border/70 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div
                    className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                      exportMode === "csv"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">CSV Spreadsheet</p>
                      {exportMode === "csv" && <CheckCircle2 className="size-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      Raw tabular dataset with UTF-8 BOM for Excel, Google Sheets & data analysis.
                    </p>
                  </div>
                </button>

                {/* Format 2: PDF Book */}
                <button
                  type="button"
                  onClick={() => setExportMode("book-pdf")}
                  className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border text-left transition-all outline-none ${
                    exportMode === "book-pdf"
                      ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-sm"
                      : "bg-card border-border/70 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <div
                    className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                      exportMode === "book-pdf"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <BookOpen className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">Dictionary Book (PDF)</p>
                      {exportMode === "book-pdf" && <CheckCircle2 className="size-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                      Publication-ready A4 lexicon book with Cover, Table of Contents & A-Z indexing.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* 1. Category Filter Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="category-select"
                  className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground"
                >
                  <FolderTree className="size-4 text-primary" />
                  Category Scope
                </Label>
                <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[200px]">
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
                  Languages Included in Book / Export
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
                  Please select at least one language.
                </p>
              )}
            </div>

            {/* 3. Conditional: Book PDF Settings vs CSV Summary */}
            {exportMode === "book-pdf" ? (
              <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookMarked className="size-4 text-primary" />
                    <span className="text-xs sm:text-sm font-bold text-foreground">
                      Book Layout & Publication Details
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    A4 Vector Print Engine
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="main-book-title" className="text-xs font-medium">
                      Book Title
                    </Label>
                    <Input
                      id="main-book-title"
                      value={bookConfig.title}
                      onChange={(e) =>
                        setBookConfig((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="h-9 text-xs bg-background"
                      placeholder="e.g. KOROT Multilingual Dictionary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="main-book-subtitle" className="text-xs font-medium">
                      Edition / Subtitle
                    </Label>
                    <Input
                      id="main-book-subtitle"
                      value={bookConfig.subtitle}
                      onChange={(e) =>
                        setBookConfig((prev) => ({ ...prev, subtitle: e.target.value }))
                      }
                      className="h-9 text-xs bg-background"
                      placeholder="e.g. Koch – Bangla – English Comprehensive Lexicon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Book Layout</Label>
                    <Select
                      value={bookConfig.layout}
                      onValueChange={(val: "two-column" | "grid" | "pocket") =>
                        setBookConfig((c) => ({ ...c, layout: val }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="two-column" className="text-xs">
                          <span className="flex items-center gap-2">
                            <Columns className="size-3.5" /> 2-Column Lexicon
                          </span>
                        </SelectItem>
                        <SelectItem value="grid" className="text-xs">
                          <span className="flex items-center gap-2">
                            <LayoutGrid className="size-3.5" /> Tabular Grid
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Primary Index Headword</Label>
                    <Select
                      value={bookConfig.primaryLanguage || selectedLanguagesList[0]?.name || ""}
                      onValueChange={(val) =>
                        setBookConfig((c) => ({ ...c, primaryLanguage: val }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="First Selected" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedLanguagesList.map((l) => (
                          <SelectItem key={l.id} value={l.name} className="text-xs">
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Font Sizing</Label>
                    <Select
                      value={bookConfig.fontSize}
                      onValueChange={(val: "sm" | "base" | "lg") =>
                        setBookConfig((c) => ({ ...c, fontSize: val }))
                      }
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm" className="text-xs">Compact (9pt)</SelectItem>
                        <SelectItem value="base" className="text-xs">Standard (10pt)</SelectItem>
                        <SelectItem value="lg" className="text-xs">Large (11pt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Switches */}
                <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="opt-cover"
                      checked={bookConfig.includeCover}
                      onCheckedChange={(checked) =>
                        setBookConfig((c) => ({ ...c, includeCover: checked }))
                      }
                    />
                    <Label htmlFor="opt-cover" className="text-xs cursor-pointer font-medium">
                      Cover Page
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="opt-toc"
                      checked={bookConfig.includeToc}
                      onCheckedChange={(checked) =>
                        setBookConfig((c) => ({ ...c, includeToc: checked }))
                      }
                    />
                    <Label htmlFor="opt-toc" className="text-xs cursor-pointer font-medium">
                      Table of Contents
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="opt-ids"
                      checked={bookConfig.includeId}
                      onCheckedChange={(checked) =>
                        setBookConfig((c) => ({ ...c, includeId: checked }))
                      }
                    />
                    <Label htmlFor="opt-ids" className="text-xs cursor-pointer font-medium">
                      Concept IDs
                    </Label>
                  </div>
                </div>
              </div>
            ) : (
              /* CSV Parameters Summary Box */
              <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/60">
                <div className="space-y-0.5 sm:space-y-1 text-center sm:text-left min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                    Format
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="size-1.5 sm:size-2 rounded-full bg-emerald-500 shrink-0" />
                    CSV Spreadsheet
                  </p>
                </div>

                <div className="space-y-0.5 sm:space-y-1 text-center sm:text-left min-w-0 border-x border-border/40 px-1 sm:px-0 sm:border-0">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                    Category Scope
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
            )}

            {/* 4. Columns & Target Preview */}
            <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Filter className="size-3.5 text-primary" />
                  Included Lexical Columns
                </span>
                <span className="text-[11px] text-muted-foreground font-mono self-start sm:self-auto">
                  {exportMode === "book-pdf" ? "application/pdf (A4 Print)" : "text/csv; charset=UTF-8"}
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
                {exportMode === "book-pdf"
                  ? "Book layout maps the selected languages side-by-side with phonetic clarity and Bengali / Koch native typographic conjunct support. Rendered with vector precision."
                  : "Export will stream records with the selected columns. Pre-configured with a UTF-8 Byte Order Mark (BOM) to preserve Bangla (বাংলা), Koch, and native scripts seamlessly across Microsoft Excel, Apple Numbers, and data tools."}
              </p>
            </div>

            {/* 5. Action Buttons */}
            <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {exportMode === "book-pdf" ? (
                <>
                  <Button
                    size="lg"
                    onClick={handlePreviewBook}
                    disabled={isGeneratingBook || selectedLanguageIds.length === 0}
                    variant="outline"
                    className="gap-2 px-5 font-semibold h-11 text-sm justify-center border-primary/40 hover:bg-primary/5 text-primary"
                  >
                    {isGeneratingBook ? (
                      <>
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                        Compiling Book...
                      </>
                    ) : (
                      <>
                        <Eye className="size-4" />
                        Preview Book
                      </>
                    )}
                  </Button>

                  <Button
                    size="lg"
                    onClick={handlePrintBookDirectly}
                    disabled={isGeneratingBook || selectedLanguageIds.length === 0}
                    className="gap-2 px-6 font-semibold shadow-sm h-11 text-sm justify-center bg-primary text-primary-foreground"
                  >
                    {isGeneratingBook ? (
                      <>
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Printer className="size-4" />
                        Download / Print PDF Book
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={handleDownloadCsv}
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
                      Download CSV ({selectedLanguageIds.length}{" "}
                      {selectedLanguageIds.length === 1 ? "language" : "languages"})
                    </>
                  )}
                </Button>
              )}
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

          {/* Book Features Guide Card */}
          <Card className="border-border bg-muted/20">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <BookOpen className="size-4 text-primary" />
                Book Publishing Features
              </CardTitle>
              <CardDescription className="text-xs">
                Standards compliant typography
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>
                  <strong>Full Bengali & Koch Unicode:</strong> Complete support for complex conjuncts (যুক্তাক্ষর) without missing glyphs.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>
                  <strong>A4 Print Paged Media:</strong> Configured with standard margins, running headers, and automatic page breaks.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>
                  <strong>Dual Layouts:</strong> Switch between classic 2-column lexicon dictionary and comparative tabular grid.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>
                  <strong>Instant Preview:</strong> Flip through and inspect book layout directly before saving as PDF.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Book Preview Dialog Modal */}
      <BookPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        data={bookData}
        categoryName={selectedCategoryName}
      />
    </div>
  );
}
