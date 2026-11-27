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
    <div className="space-y-6">
      <PageHeader
        title="Dictionary Export"
        description="Download complete dictionary records in standardized CSV format with Unicode support"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Export Card */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileSpreadsheet className="size-5.5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Export Dictionary</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-0.5">
                    Complete Koch–Bangla–English dictionary
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                <CheckCircle2 className="size-3" />
                Ready to Export
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/40 border border-border/60">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Format
                </p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  CSV
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Export scope
                </p>
                <p className="text-sm font-semibold text-foreground">
                  All records
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Encoding
                </p>
                <p className="text-sm font-semibold text-foreground">
                  UTF-8 BOM
                </p>
              </div>
            </div>

            {/* Structure info callout */}
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">CSV Columns Structure</span>
                <span className="text-[11px] text-muted-foreground font-mono">text/csv; charset=UTF-8</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["ID", "Koch", "Bangla", "English"].map((col) => (
                  <span
                    key={col}
                    className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-mono font-medium text-foreground border border-border"
                  >
                    {col}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Includes all records and translations across Koch, Bangla, and English. Pre-configured with a UTF-8 Byte Order Mark (BOM) so Bangla and Koch scripts render natively without font corruption in Microsoft Excel, Google Sheets, LibreOffice, and data tools.
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2 flex items-center gap-3">
              <Button
                size="lg"
                onClick={handleDownload}
                disabled={isDownloading}
                className="gap-2 px-6 font-semibold shadow-sm"
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
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Dictionary Summary</CardTitle>
              <CardDescription className="text-xs">Current database records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Database className="size-3.5" /> Total Concepts
                </span>
                <span className="font-semibold text-foreground">
                  {totalConcepts !== null ? formatNumber(totalConcepts) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5" /> Total Translations
                </span>
                <span className="font-semibold text-foreground">
                  {totalTranslations !== null ? formatNumber(totalTranslations) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5">
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
