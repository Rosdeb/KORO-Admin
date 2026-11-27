import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "@/lib/token-storage";
import { authStorage } from "@/lib/auth-storage";
import type { ApiErrorBody, TokenRefreshResponse } from "@/types/api";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://api.korot.site";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | undefined;

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<TokenRefreshResponse>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    const { accessToken, refreshToken: newRefreshToken } = res.data;
    tokenStorage.setTokens(accessToken, newRefreshToken ?? refreshToken);
    return accessToken;
  } catch {
    return null;
  }
}

function clearSessionAndRedirect() {
  tokenStorage.clear();
  authStorage.clear();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    const isAuthEndpoint = original?.url?.includes("/api/v1/auth/");

    if (status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return httpClient(original);
      }
      clearSessionAndRedirect();
    }

    let message = error.message || "Something went wrong. Please try again.";
    const body = error.response?.data;
    if (body instanceof Blob && body.type?.includes("json")) {
      try {
        const text = await body.text();
        const json = JSON.parse(text);
        if (json.message) message = json.message;
      } catch {
        // ignore
      }
    } else if (body && typeof body === "object" && "message" in body) {
      const candidate = (body as ApiErrorBody).message;
      if (candidate) message = candidate;
    }
    return Promise.reject(new ApiError(message, status ?? 0, body as ApiErrorBody | undefined));
  },
);
