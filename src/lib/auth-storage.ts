import type { Role } from "@/types/api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
}

const USER_KEY = "koro_admin_user";

export const authStorage = {
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  setUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(USER_KEY);
  },
};
