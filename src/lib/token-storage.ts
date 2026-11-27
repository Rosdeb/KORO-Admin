/** Centralizes JWT storage so no other module touches localStorage directly. */

const ACCESS_TOKEN_KEY = "koro_admin_access_token";
const REFRESH_TOKEN_KEY = "koro_admin_refresh_token";

export function getTokenExpirationMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const parsed = JSON.parse(jsonPayload);
    return typeof parsed.exp === "number" ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Returns true if the token is already expired or expiring within `bufferMs` (default 60 seconds = 1 minute). */
export function isTokenExpiringSoon(token: string | null, bufferMs = 60_000): boolean {
  if (!token) return true;
  const exp = getTokenExpirationMs(token);
  if (!exp) return false;
  return exp - Date.now() <= bufferMs;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  setAccessToken(accessToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  isCurrentTokenExpiringSoon(bufferMs = 60_000): boolean {
    return isTokenExpiringSoon(this.getAccessToken(), bufferMs);
  },
};
