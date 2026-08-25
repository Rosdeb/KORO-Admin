import { httpClient } from "./client";

/**
 * The backend declares these responses as a bare `object` in its OpenAPI spec (no schema),
 * so field names aren't contractually documented. The UI renders whatever keys come back
 * instead of assuming names, and cross-checks totals against list endpoints where possible.
 */
export type RawStats = Record<string, unknown>;

export const statisticsApi = {
  async admin(): Promise<RawStats> {
    const res = await httpClient.get<RawStats>("/api/v1/admin/statistics");
    return res.data;
  },
  /** Scoped to the authenticated admin's OWN activity — there is no platform-wide variant. */
  async activity(): Promise<RawStats> {
    const res = await httpClient.get<RawStats>("/api/v1/activity/statistics");
    return res.data;
  },
};
