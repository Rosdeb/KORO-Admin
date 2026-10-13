import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";
const STORAGE_KEY = "koro_admin_theme";
const EVENT = "koro-admin-theme-change";
function getPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}
function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
    media.removeEventListener("change", callback);
  };
}
function getSnapshot() { return `${getPreference()}:${window.matchMedia("(prefers-color-scheme: dark)").matches}`; }
export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  const preference = snapshot.split(":")[0] as ThemePreference;
  const theme: Theme = preference === "system" ? snapshot.endsWith(":true") ? "dark" : "light" : preference;
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);
  const setTheme = useCallback((value: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  const toggleTheme = useCallback(() => { setTheme(theme === "dark" ? "light" : "dark"); }, [theme, setTheme]);
  return { theme, preference, setTheme, toggleTheme };
}
