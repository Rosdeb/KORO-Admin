export const queryKeys = {
  adminUsers: ["admin", "users"] as const,
  adminStatistics: ["admin", "statistics"] as const,
  activity: ["activity"] as const,
  activityStatistics: ["activity", "statistics"] as const,
  languages: ["languages"] as const,
  languagesAdmin: ["languages", "admin"] as const,
  categories: ["categories"] as const,
  concepts: (categoryId?: string) => ["concepts", categoryId ?? "all"] as const,
  translations: (params?: { conceptId?: string; languageId?: string }) =>
    ["translations", params?.conceptId ?? "all", params?.languageId ?? "all"] as const,
  pendingSubmissions: ["submissions", "pending"] as const,
};
