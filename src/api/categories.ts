import { httpClient } from "./client";
import type { Category, CategoryPayload } from "@/types/api";

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const res = await httpClient.get<Category[]>("/api/v1/categories");
    return res.data;
  },
  async create(payload: CategoryPayload): Promise<Category> {
    const res = await httpClient.post<Category>("/api/v1/admin/categories", payload);
    return res.data;
  },
  async update(id: string, payload: CategoryPayload): Promise<Category> {
    const res = await httpClient.put<Category>(`/api/v1/admin/categories/${id}`, payload);
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await httpClient.delete(`/api/v1/admin/categories/${id}`);
  },
};
