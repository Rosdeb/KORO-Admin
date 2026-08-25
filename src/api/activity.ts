import { httpClient } from "./client";
import type { ActivityLog } from "@/types/api";

export const activityApi = {
  /**
   * Scoped to the authenticated user's OWN activity for every role, admin included
   * (per doc/API_MAPPING.md's permission matrix: "own" for user/reviewer/admin alike).
   * There is no endpoint to list another user's activity or a platform-wide feed —
   * see docs/BACKEND_GAPS.md.
   */
  async list(range?: { from?: string; to?: string }): Promise<ActivityLog[]> {
    const res = await httpClient.get<ActivityLog[]>("/api/v1/activity", { params: range });
    return res.data;
  },
};
