import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { tokenStorage, isTokenExpiringSoon } from "@/lib/token-storage";
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

let refreshPromise: Promise<string | null> | null = null;
let lastRefreshTime = 0;

export async function refreshAccessToken(): Promise<string | null> {
  const now = Date.now();
  // Cooldown: Avoid hammering the refresh endpoint multiple times within 10 seconds
  if (now - lastRefreshTime < 10_000) {
    return tokenStorage.getAccessToken();
  }

  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    lastRefreshTime = now;
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

// Proactive refresh before outgoing requests: only refresh if the access token will expire within 1 minute
httpClient.interceptors.request.use(async (config) => {
  let token = tokenStorage.getAccessToken();
  if (token) {
    // Only refresh if token will expire in less than 60 seconds (1 minute)
    if (isTokenExpiringSoon(token, 60_000)) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshed = await refreshPromise;
      if (refreshed) {
        token = refreshed;
      }
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function clearSessionAndRedirect() {
  tokenStorage.clear();
  authStorage.clear();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// Response interceptor: handles unexpected 401s
httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    const isAuthEndpoint = original?.url?.includes("/api/v1/auth/");

    // Only attempt refresh on 401 if not an auth endpoint, not already retried,
    // and the token is actually expiring or expired
    if (status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      const currentToken = tokenStorage.getAccessToken();

      // Only call refresh if token is actually expiring or expired
      if (isTokenExpiringSoon(currentToken, 60_000)) {
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
