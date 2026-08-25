import { httpClient } from "./client";
import type { LoginRequest, LoginResponse } from "@/types/api";

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const res = await httpClient.post<LoginResponse>("/api/v1/auth/login", payload);
    return res.data;
  },
  async logout(): Promise<void> {
    await httpClient.post("/api/v1/auth/logout");
  },
  async forgotPassword(email: string): Promise<void> {
    await httpClient.post("/api/v1/auth/forgot-password", { email });
  },
};
