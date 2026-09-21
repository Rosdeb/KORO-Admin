import { httpClient } from "./client";
import type {
  TranslationRequest,
  TranslationResponse,
  TranslationSearchRequest,
  PageResponse,
} from "@/types/api";

interface TranslationListParams {
  conceptId?: string;
  languageId?: string;
  page?: number;
  size?: number;
}

export const translationsApi = {
  async list(params?: TranslationListParams): Promise<PageResponse<TranslationResponse>> {
    const res = await httpClient.get<PageResponse<TranslationResponse>>("/api/v1/translations", { params });
    return res.data;
  },
  /** Fast total count — use this on dashboards instead of fetching the full list.
   *  Endpoint: GET /api/v1/translations/count — returns a raw number. */
  async count(): Promise<number> {
    const res = await httpClient.get<number>("/api/v1/translations/count");
    return res.data;
  },
  /** Server-side search — matches text, pronunciation and concept name, Unicode-normalized.
   *  Used as a fallback when the locally-fetched page has no match for the query. */
  async search(payload: TranslationSearchRequest): Promise<TranslationResponse[]> {
    const res = await httpClient.post<TranslationResponse[]>("/api/v1/translations/search", payload);
    return res.data;
  },
  async create(payload: TranslationRequest): Promise<TranslationResponse> {
    const res = await httpClient.post<TranslationResponse>("/api/v1/admin/translations", payload);
    return res.data;
  },
  async update(id: string, payload: TranslationRequest): Promise<TranslationResponse> {
    const res = await httpClient.put<TranslationResponse>(`/api/v1/admin/translations/${id}`, payload);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/admin/translations/${id}`);
  },
};
