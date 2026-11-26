import { useCallback, useEffect, useSyncExternalStore } from "react";
import { COLOR_THEMES, DEFAULT_THEME_ID, getThemeById, applyColorTheme } from "@/lib/color-themes";

const STORAGE_KEY = "koro_admin_color_theme";
const EVENT = "koro-admin-color-theme-change";

function getStoredThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && COLOR_THEMES.some((t) => t.id === stored)) {
    return stored;
  }
  return DEFAULT_THEME_ID;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function useColorTheme() {
  const themeId = useSyncExternalStore(subscribe, getStoredThemeId, () => DEFAULT_THEME_ID);
  const currentTheme = getThemeById(themeId);

  useEffect(() => {
    applyColorTheme(currentTheme);
  }, [currentTheme]);

  const setColorTheme = useCallback((id: string) => {
    const target = getThemeById(id);
    localStorage.setItem(STORAGE_KEY, target.id);
    applyColorTheme(target);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return {
    themeId,
    currentTheme,
    setColorTheme,
    themes: COLOR_THEMES,
  };
}
