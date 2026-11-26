import { httpClient } from "./client";
import type {
  AiModelRosterConfig,
  SearchRateLimitConfig,
  UserRateLimitDto,
  UserRateLimitUpdateRequest,
} from "@/types/api";

export const platformConfigApi = {
  /**
   * Get current search rate limit configuration.
   * Access: ROLE_ADMIN
   */
  async getSearchRateLimits(): Promise<SearchRateLimitConfig> {
    const res = await httpClient.get<SearchRateLimitConfig>("/api/v1/admin/rate-limits/search");
    return res.data;
  },

  /**
   * Update search rate limit configuration at runtime.
   * Access: ROLE_ADMIN
   */
  async updateSearchRateLimits(payload: SearchRateLimitConfig): Promise<SearchRateLimitConfig> {
    const res = await httpClient.put<SearchRateLimitConfig>("/api/v1/admin/rate-limits/search", payload);
    return res.data;
  },

  /**
   * Get the prioritized AI model roster for fallback searches.
   * Access: ROLE_ADMIN
   */
  async getAiModels(): Promise<AiModelRosterConfig> {
    const res = await httpClient.get<AiModelRosterConfig>("/api/v1/admin/ai/models");
    return res.data;
  },

  /**
   * Update AI models failover roster and toggle status at runtime.
   * Access: ROLE_ADMIN
   */
  async updateAiModels(payload: AiModelRosterConfig): Promise<AiModelRosterConfig> {
    const res = await httpClient.put<AiModelRosterConfig>("/api/v1/admin/ai/models", payload);
    return res.data;
  },

  /**
   * Inspect a specific user's search rate limits and usage quotas.
   * Access: ROLE_ADMIN
   */
  async getUserRateLimits(userId: string): Promise<UserRateLimitDto> {
    const res = await httpClient.get<UserRateLimitDto>(`/api/v1/admin/rate-limits/users/${userId}`);
    return res.data;
  },

  /**
   * Update a specific user's custom limits or reset usage counts.
   * Access: ROLE_ADMIN
   */
  async updateUserRateLimits(
    userId: string,
    payload: UserRateLimitUpdateRequest,
  ): Promise<UserRateLimitDto> {
    const res = await httpClient.put<UserRateLimitDto>(
      `/api/v1/admin/rate-limits/users/${userId}`,
      payload,
    );
    return res.data;
  },
};
