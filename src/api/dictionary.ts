import { httpClient } from "./client";

export const dictionaryApi = {
  exportCsv: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await httpClient.get<Blob>("/api/v1/admin/dictionary/export?format=csv", {
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

export async function downloadDictionaryExport(): Promise<string> {
  const { blob, filename } = await dictionaryApi.exportCsv();
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
