export const queryKeys = {
  leaderboardPublic: (type: string, period: string, limit: number) => ["leaderboard", "public", type, period, limit] as const,
  leaderboardAdmin: (status?: string, from?: string, to?: string, limit?: number) => ["leaderboard", "admin", status ?? "all", from ?? "", to ?? "", limit ?? 50] as const,
  leaderboardDetail: (userId: string) => ["leaderboard", "detail", userId] as const,
  adminUsers: ["admin", "users"] as const,
  adminStatistics: ["admin", "statistics"] as const,
  activity: ["activity"] as const,
  activityStatistics: ["activity", "statistics"] as const,
  languages: ["languages"] as const,
  languagesAdmin: ["languages", "admin"] as const,
  categories: ["categories"] as const,
  concepts: (params?: { categoryId?: string; page?: number; size?: number }) =>
    ["concepts", params?.categoryId ?? "all", params?.page ?? 0, params?.size ?? 20] as const,
  translations: (params?: { conceptId?: string; languageId?: string; page?: number; size?: number }) =>
    ["translations", params?.conceptId ?? "all", params?.languageId ?? "all", params?.page ?? 0, params?.size ?? 20] as const,
  translationsCount: ["translations", "count"] as const,
  translationsSearch: (query: string, targetLanguageId?: string) =>
    ["translations", "search", query, targetLanguageId ?? "all"] as const,
  pendingSubmissions: (page = 0, size = 20) => ["submissions", "pending", page, size] as const,
  contactMessages: (params?: { status?: string; page?: number; size?: number; search?: string }) =>
    ["contact-messages", params?.status ?? "all", params?.page ?? 0, params?.size ?? 20, params?.search ?? ""] as const,
  contactMessageDetail: (id: string) => ["contact-messages", "detail", id] as const,
  contactMessageStats: ["contact-messages", "statistics"] as const,
};
