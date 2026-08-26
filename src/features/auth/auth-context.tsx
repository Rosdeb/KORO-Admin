import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, httpClient, ApiError } from "@/api";
import { tokenStorage } from "@/lib/token-storage";
import { authStorage, type AuthUser } from "@/lib/auth-storage";
import type { Role, UserResponse } from "@/types/api";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authStorage.getUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const token = tokenStorage.getAccessToken();
      const storedUser = authStorage.getUser();
      if (!token || !storedUser) {
        tokenStorage.clear();
        authStorage.clear();
        if (!cancelled) setUser(null);
        if (!cancelled) setIsBootstrapping(false);
        return;
      }
      try {
        // Also refreshes roles/status from the server on every load — a role grant made
        // by an admin while this browser had a cached session (e.g. ROLE_USER -> ROLE_MODERATOR)
        // would otherwise stay invisible here until the user explicitly logged out and back in,
        // even though the backend and JWT already reflect the change.
        const res = await httpClient.get<UserResponse>("/api/v1/users/profile");
        const freshUser: AuthUser = { id: res.data.id, name: res.data.name, email: res.data.email, roles: res.data.roles };
        authStorage.setUser(freshUser);
        if (!cancelled) setUser(freshUser);
      } catch (err) {
        if (err instanceof ApiError && err.status !== 401) {
          // Network/server hiccup, not an auth failure — keep the session optimistically.
          if (!cancelled) setUser(storedUser);
        } else {
          tokenStorage.clear();
          authStorage.clear();
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    tokenStorage.setTokens(res.token.access_token, res.token.refresh_token);
    const authUser: AuthUser = { id: res.id, name: res.name, email: res.email, roles: res.roles };
    authStorage.setUser(authUser);
    setUser(authUser);
    return authUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort — clear the local session regardless of server outcome.
    } finally {
      tokenStorage.clear();
      authStorage.clear();
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => !!user && roles.some((r) => user.roles.includes(r)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, isBootstrapping, login, logout, hasRole }),
    [user, isBootstrapping, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
