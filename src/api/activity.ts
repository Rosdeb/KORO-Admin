import { httpClient } from "./client";
import type { ActivityLog, PageResponse } from "@/types/api";

interface ActivityListParams {
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export const activityApi = {
  /**
   * Scoped to the authenticated user's OWN activity for every role, admin included
   * (per doc/API_MAPPING.md's permission matrix: "own" for user/reviewer/admin alike).
   * There is no endpoint to list another user's activity or a platform-wide feed —
   * see docs/BACKEND_GAPS.md.
   */
  async list(params?: ActivityListParams): Promise<PageResponse<ActivityLog>> {
    const res = await httpClient.get<PageResponse<ActivityLog>>("/api/v1/activity", { params });
    return res.data;
  },
};
