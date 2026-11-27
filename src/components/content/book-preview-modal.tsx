import { useState, useMemo } from "react";
import {
  Printer,
  BookOpen,
  LayoutGrid,
  Columns,
  Settings2,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type DictionaryBookData,
  type BookConfig,
  DEFAULT_BOOK_CONFIG,
  generateBookHtml,
  printDictionaryBook,
} from "@/lib/dictionary-book";

interface BookPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DictionaryBookData | null;
  categoryName?: string;
}

export function BookPreviewModal({
  open,
  onOpenChange,
  data,
  categoryName,
}: BookPreviewModalProps) {
  const [config, setConfig] = useState<BookConfig>(() => ({
    ...DEFAULT_BOOK_CONFIG,
    subtitle: categoryName && categoryName !== "All Categories"
      ? `${categoryName} Edition • Multilingual Lexicon`
      : DEFAULT_BOOK_CONFIG.subtitle,
  }));
  const [showSettings, setShowSettings] = useState(false);
  const [zoom, setZoom] = useState<number>(100);

  // Set primary language default if not set
  const effectiveConfig = useMemo(() => {
    if (!data || data.languages.length === 0) return config;
    const primary = config.primaryLanguage || data.languages[0];
    return { ...config, primaryLanguage: primary };
  }, [config, data]);

  const previewHtml = useMemo(() => {
    if (!data) return "";
    return generateBookHtml(data, effectiveConfig);
  }, [data, effectiveConfig]);

  if (!data) return null;

  function handlePrint() {
    if (!data) return;
    printDictionaryBook(data, effectiveConfig);
  }

  function handleResetSettings() {
    setConfig({
      ...DEFAULT_BOOK_CONFIG,
      subtitle: categoryName && categoryName !== "All Categories"
        ? `${categoryName} Edition • Multilingual Lexicon`
        : DEFAULT_BOOK_CONFIG.subtitle,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Modal Header */}
        <DialogHeader className="p-3 sm:p-4 border-b border-border bg-card shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="size-4.5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold flex items-center gap-2 truncate">
                  <span>Book PDF Preview</span>
                  <Badge variant="outline" className="text-[11px] font-mono px-1.5 py-0">
                    A4 Publication
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  {data.totalEntries} entries across {data.languages.length} languages ({data.letterGroups.length} sections)
                </DialogDescription>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button
                variant={showSettings ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="gap-1.5 text-xs h-8"
              >
                <Settings2 className="size-3.5" />
                <span>{showSettings ? "Hide Settings" : "Book Settings"}</span>
              </Button>

              <div className="hidden sm:flex items-center gap-1 border rounded-md px-1.5 py-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(60, z - 10))}
                  className="text-xs font-mono px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                  title="Zoom out"
                >
                  -
                </button>
                <span className="text-[11px] font-mono min-w-9 text-center text-muted-foreground">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(150, z + 10))}
                  className="text-xs font-mono px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                  title="Zoom in"
                >
                  +
                </button>
              </div>

              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground font-semibold shadow-sm"
              >
                <Printer className="size-3.5" />
                <span>Print / Save as PDF</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: Settings drawer + Preview viewport */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-muted/20">
          {/* Collapsible Settings Side Panel */}
          {showSettings && (
            <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-border bg-card p-4 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <Settings2 className="size-4 text-primary" />
                  Book Customization
                </span>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="book-title" className="text-xs font-medium">Book Title</Label>
                  <Input
                    id="book-title"
                    value={config.title}
                    onChange={(e) => setConfig((c) => ({ ...c, title: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="book-subtitle" className="text-xs font-medium">Subtitle / Edition Line</Label>
                  <Input
                    id="book-subtitle"
                    value={config.subtitle}
                    onChange={(e) => setConfig((c) => ({ ...c, subtitle: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="book-author" className="text-xs font-medium">Author / Publisher</Label>
                  <Input
                    id="book-author"
                    value={config.author}
                    onChange={(e) => setConfig((c) => ({ ...c, author: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Primary Headword Language</Label>
                  <Select
                    value={effectiveConfig.primaryLanguage}
                    onValueChange={(val) => setConfig((c) => ({ ...c, primaryLanguage: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Primary Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.languages.map((lang) => (
                        <SelectItem key={lang} value={lang} className="text-xs">
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Layout Style</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig((c) => ({ ...c, layout: "two-column" }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-left transition-colors ${
                        config.layout === "two-column"
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <Columns className="size-4" />
                      <span className="text-[11px]">2-Column Lexicon</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig((c) => ({ ...c, layout: "grid" }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-left transition-colors ${
                        config.layout === "grid"
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "border-border hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <LayoutGrid className="size-4" />
                      <span className="text-[11px]">Tabular Grid</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Font Size</Label>
                  <Select
                    value={config.fontSize}
                    onValueChange={(val: "sm" | "base" | "lg") =>
                      setConfig((c) => ({ ...c, fontSize: val }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Font Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm" className="text-xs">Compact (9pt)</SelectItem>
                      <SelectItem value="base" className="text-xs">Standard (10pt)</SelectItem>
                      <SelectItem value="lg" className="text-xs">Large (11pt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 border-t border-border/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inc-cover" className="text-xs cursor-pointer">
                      Include Cover Page
                    </Label>
                    <Switch
                      id="inc-cover"
                      checked={config.includeCover}
                      onCheckedChange={(checked) =>
                        setConfig((c) => ({ ...c, includeCover: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="inc-toc" className="text-xs cursor-pointer">
                      Include Table of Contents
                    </Label>
                    <Switch
                      id="inc-toc"
                      checked={config.includeToc}
                      onCheckedChange={(checked) =>
                        setConfig((c) => ({ ...c, includeToc: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="inc-id" className="text-xs cursor-pointer">
                      Include Concept IDs
                    </Label>
                    <Switch
                      id="inc-id"
                      checked={config.includeId}
                      onCheckedChange={(checked) =>
                        setConfig((c) => ({ ...c, includeId: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Iframe */}
          <div className="flex-1 flex flex-col items-center p-3 sm:p-6 overflow-auto">
            <div
              className="bg-white text-black shadow-xl rounded border border-border/80 transition-transform origin-top duration-150"
              style={{
                width: "210mm",
                minHeight: "297mm",
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
              }}
            >
              <iframe
                title="Book Preview"
                srcDoc={previewHtml}
                className="w-full h-[800px] border-none"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: "297mm",
                  background: "#ffffff",
                }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
