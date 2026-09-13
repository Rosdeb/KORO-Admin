import { httpClient } from "./client";
import type { Role, SubmissionStatus, UserStatus } from "@/types/api";

export type LeaderboardType = "OVERALL" | "SUBMISSIONS" | "TRANSLATIONS";
export type LeaderboardPeriod = "ALL_TIME" | "MONTHLY" | "WEEKLY";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  profileImage: string | null;
  nativeLanguage: string | null;
  submissionsCount: number;
  translationsCount: number;
  score: number;
  badge: string | null;
}
export interface LeaderboardResponse {
  type: LeaderboardType;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
}
export interface AdminLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  profileImage: string | null;
  status: UserStatus;
  roles: Role[];
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  totalSubmissions: number;
  translationActivities: number;
  score: number;
  createdAt: string;
}
export interface AdminLeaderboardDetail {
  userId: string;
  name: string;
  email: string;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  activityTypeBreakdown: Record<string, number>;
  calculatedScore: number;
}
export interface AdminLeaderboardParams {
  status?: SubmissionStatus;
  from?: string;
  to?: string;
  limit?: number;
}
export const leaderboardApi = {
  async public(type: LeaderboardType, period: LeaderboardPeriod, limit = 20): Promise<LeaderboardResponse> {
    const path = type === "OVERALL" ? "/api/v1/leaderboard" : `/api/v1/leaderboard/${type.toLowerCase()}`;
    const res = await httpClient.get<LeaderboardResponse>(path, { params: { ...(type === "OVERALL" ? { type } : {}), period, limit } });
    return res.data;
  },
  async admin(params: AdminLeaderboardParams): Promise<AdminLeaderboardEntry[]> {
    const res = await httpClient.get<AdminLeaderboardEntry[]>("/api/v1/admin/leaderboard", { params });
    return res.data;
  },
  async detail(userId: string): Promise<AdminLeaderboardDetail> {
    const res = await httpClient.get<AdminLeaderboardDetail>(`/api/v1/admin/leaderboard/users/${encodeURIComponent(userId)}`);
    return res.data;
  },
};
