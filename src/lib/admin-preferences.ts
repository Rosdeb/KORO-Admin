import { useSyncExternalStore } from "react";

export type AdminPreferences = {
  compactTables: boolean;
  reducedMotion: boolean;
  pageSize: number | null;
  startPage: string;
};
const KEY = "koro_admin_preferences";
const EVENT = "koro-admin-preferences-change";
const DEFAULTS: AdminPreferences = { compactTables: false, reducedMotion: false, pageSize: null, startPage: "/dashboard" };
export const START_PAGES = [{ value: "/dashboard", label: "Overview" }, { value: "/analytics", label: "Analytics" }, { value: "/users", label: "Users" }, { value: "/submissions", label: "Submission queue" }];
function snapshot() { return localStorage.getItem(KEY) ?? ""; }
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(EVENT, callback); };
}
function parse(raw: string): AdminPreferences {
  try {
    const data = JSON.parse(raw);
    return {
      compactTables: data?.compactTables === true,
      reducedMotion: data?.reducedMotion === true,
      pageSize: [10, 25, 50, 100].includes(data?.pageSize) ? data.pageSize : null,
      startPage: START_PAGES.some((page) => page.value === data?.startPage) ? data.startPage : DEFAULTS.startPage,
    };
  } catch { return DEFAULTS; }
}
export function getAdminPreferences() { return parse(snapshot()); }
export function setAdminPreferences(update: Partial<AdminPreferences>) {
  localStorage.setItem(KEY, JSON.stringify({ ...getAdminPreferences(), ...update }));
  window.dispatchEvent(new Event(EVENT));
}
export function resetAdminPreferences() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}
export function useAdminPreferences() { return parse(useSyncExternalStore(subscribe, snapshot)); }
