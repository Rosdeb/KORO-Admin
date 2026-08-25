import { httpClient } from "./client";
import type { Concept, ConceptPayload } from "@/types/api";

export const conceptsApi = {
  async list(categoryId?: string): Promise<Concept[]> {
    const res = await httpClient.get<Concept[]>("/api/v1/concepts", {
      params: categoryId ? { categoryId } : undefined,
    });
    return res.data;
  },
  async get(id: string): Promise<Concept> {
    const res = await httpClient.get<Concept>(`/api/v1/concepts/${id}`);
    return res.data;
  },
  async create(payload: ConceptPayload): Promise<Concept> {
    const res = await httpClient.post<Concept>("/api/v1/admin/concepts", payload);
    return res.data;
  },
  async update(id: string, payload: ConceptPayload): Promise<Concept> {
    const res = await httpClient.put<Concept>(`/api/v1/admin/concepts/${id}`, payload);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/admin/concepts/${id}`);
  },
};
