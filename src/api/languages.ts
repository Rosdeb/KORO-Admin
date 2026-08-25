import { httpClient } from "./client";
import type { Language, LanguagePayload } from "@/types/api";

export const languagesApi = {
  async list(): Promise<Language[]> {
    const res = await httpClient.get<Language[]>("/api/v1/languages");
    return res.data;
  },
  async create(payload: LanguagePayload): Promise<Language> {
    const res = await httpClient.post<Language>("/api/v1/admin/languages", payload);
    return res.data;
  },
  async update(id: string, payload: LanguagePayload): Promise<Language> {
    const res = await httpClient.put<Language>(`/api/v1/admin/languages/${id}`, payload);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/admin/languages/${id}`);
  },
};
