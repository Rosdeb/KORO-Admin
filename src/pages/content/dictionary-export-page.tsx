import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Loader2, CheckCircle2, Globe, Database, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { downloadDictionaryExport } from "@/api/dictionary";
import { statisticsApi } from "@/api/statistics";
import { queryKeys } from "@/lib/query-keys";
import { formatNumber } from "@/lib/utils";

export function DictionaryExportPage() {
  const [isDownloading, setIsDownloading] = useState(false);

  const statsQuery = useQuery({
    queryKey: queryKeys.adminStatistics,
    queryFn: statisticsApi.admin,
    staleTime: 60_000,
  });

  const totalConcepts = typeof statsQuery.data?.totalConcepts === "number" ? statsQuery.data.totalConcepts : null;
  const totalTranslations = typeof statsQuery.data?.totalTranslations === "number" ? statsQuery.data.totalTranslations : null;

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const filename = await downloadDictionaryExport();
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Dictionary Export"
        description="Download complete dictionary records in standardized CSV format with Unicode support"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Export Card */}
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
                      Ready
                    </Badge>
                  </div>
                  <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    Complete Koch–Bangla–English dictionary
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="hidden sm:inline-flex shrink-0 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs px-2.5 py-1 self-start"
              >
                <CheckCircle2 className="size-3" />
                Ready to Export
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
            {/* Parameters Grid */}
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
                  Export scope
                </p>
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                  All records
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

            {/* Structure info callout */}
            <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <span className="text-xs font-semibold text-foreground">CSV Columns Structure</span>
                <span className="text-[11px] text-muted-foreground font-mono self-start sm:self-auto">text/csv; charset=UTF-8</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {["ID", "Koch", "Bangla", "English"].map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center rounded-md bg-muted px-2 sm:px-2.5 py-1 text-xs font-mono font-medium text-foreground border border-border"
                  >
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed text-left">
                Includes all records and translations across Koch, Bangla, and English. Pre-configured with a UTF-8 Byte Order Mark (BOM) so Bangla and Koch scripts render natively without font corruption in Microsoft Excel, Google Sheets, LibreOffice, and data tools.
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="pt-1 sm:pt-2">
              <Button
                size="lg"
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full sm:w-auto gap-2 px-6 font-semibold shadow-sm h-11 text-sm sm:text-base justify-center"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    Generating CSV...
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    Download CSV
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar info card */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
              <CardTitle className="text-sm font-semibold">Dictionary Summary</CardTitle>
              <CardDescription className="text-xs">Current database records</CardDescription>
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs py-1.5 gap-1 sm:gap-2">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <ShieldCheck className="size-3.5" /> Supported Languages
                </span>
                <span className="font-semibold text-foreground">Koch, Bangla, English</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
