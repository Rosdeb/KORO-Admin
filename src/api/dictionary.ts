import { httpClient } from "./client";

export interface DictionaryExportOptions {
  format?: string;
  categoryId?: string;
  languageIds?: string[];
}

export const dictionaryApi = {
  exportCsv: async (options?: DictionaryExportOptions): Promise<{ blob: Blob; filename: string }> => {
    const params = new URLSearchParams();
    params.set("format", options?.format ?? "csv");
    if (options?.categoryId && options.categoryId !== "ALL") {
      params.set("categoryId", options.categoryId);
    }
    if (options?.languageIds && options.languageIds.length > 0) {
      params.set("languageIds", options.languageIds.join(","));
    }

    const response = await httpClient.get<Blob>(`/api/v1/admin/dictionary/export?${params.toString()}`, {
      responseType: "blob",
    });

    const disposition = response.headers?.["content-disposition"] ?? "";
    let filename = `korot-dictionary-${new Date().toISOString().split("T")[0]}.csv`;
    const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
    if (match && match[1]) {
      filename = match[1];
    }

    return { blob: response.data, filename };
  },
};

export async function downloadDictionaryExport(options?: DictionaryExportOptions): Promise<string> {
  const { blob, filename } = await dictionaryApi.exportCsv(options);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  return filename;
}
