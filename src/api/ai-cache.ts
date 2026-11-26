import { httpClient } from "./client";
import type { AiCacheEntry } from "@/types/api";

export interface AiCachePageResponse {
  content: AiCacheEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const aiCacheApi = {
  /**
   * List all cached AI queries, translations, and search hit counts.
   * Access: ROLE_ADMIN
   */
  async list(page = 0, size = 100): Promise<AiCacheEntry[]> {
    const res = await httpClient.get<AiCachePageResponse | AiCacheEntry[]>("/api/v1/admin/ai-cache", {
      params: { page, size },
    });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data && Array.isArray((res.data as AiCachePageResponse).content)) {
      return (res.data as AiCachePageResponse).content;
    }
    return [];
  },

  /**
   * Purge any unwanted or obsolete cached AI translation.
   * Access: ROLE_ADMIN
   */
  async purge(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/admin/ai-cache/${id}`);
  },

  /**
   * Promote the cached sentence into the official verified Concept & Translation dictionary with verified: true.
   * Access: ROLE_ADMIN
   */
  async promote(id: string): Promise<{ message?: string }> {
    const res = await httpClient.post<{ message?: string }>(`/api/v1/admin/ai-cache/${id}/promote`);
    return res.data;
  },
};
