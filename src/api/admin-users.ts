import { httpClient } from "./client";
import type { Role, UserResponse, UserStatus } from "@/types/api";

export const adminUsersApi = {
  /** No pagination/search/sort on the backend — returns the full list; the UI paginates client-side. */
  async list(): Promise<UserResponse[]> {
    const res = await httpClient.get<UserResponse[]>("/api/v1/admin/users");
    return res.data;
  },
  async updateStatus(id: string, status: UserStatus): Promise<UserResponse> {
    const res = await httpClient.put<UserResponse>(`/api/v1/admin/users/${id}/status`, null, {
      params: { status },
    });
    return res.data;
  },
  /** Grants/revokes roles — replaces the account's full role set (ROLE_USER always kept
   *  by the backend). Confirmed live in /v3/api-docs (operationId: updateUserRoles). */
  async updateRoles(id: string, roles: Role[]): Promise<UserResponse> {
    const res = await httpClient.put<UserResponse>(`/api/v1/admin/users/${id}/roles`, roles);
    return res.data;
  },
};
