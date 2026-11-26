import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_ID,
  ACTIVE_THEME_COOKIE,
  getAllThemes,
  getStoredCustomThemes,
  saveCustomTheme,
  deleteStoredCustomTheme,
  getThemeById,
  applyColorTheme,
  type ColorTheme,
} from "@/lib/color-themes";
import { getCookie, setCookie } from "@/lib/cookie-utils";

const STORAGE_KEY = "koro_admin_color_theme";
const EVENT = "koro-admin-color-theme-change";

function getStoredThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  const cookieVal = getCookie(ACTIVE_THEME_COOKIE);
  const stored = cookieVal || localStorage.getItem(STORAGE_KEY);
  const allThemes = getAllThemes();
  if (stored && allThemes.some((t) => t.id === stored)) {
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
  const themes = getAllThemes();
  const customThemes = getStoredCustomThemes();

  useEffect(() => {
    applyColorTheme(currentTheme);
  }, [currentTheme]);

  const setColorTheme = useCallback((id: string) => {
    const target = getThemeById(id);
    setCookie(ACTIVE_THEME_COOKIE, target.id, 365);
    try {
      localStorage.setItem(STORAGE_KEY, target.id);
    } catch {
      // Ignore
    }
    applyColorTheme(target);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const addCustomTheme = useCallback((theme: ColorTheme) => {
    saveCustomTheme(theme);
    setColorTheme(theme.id);
    window.dispatchEvent(new Event(EVENT));
  }, [setColorTheme]);

  const deleteCustomTheme = useCallback((id: string) => {
    deleteStoredCustomTheme(id);
    if (themeId === id) {
      setColorTheme(DEFAULT_THEME_ID);
    } else {
      window.dispatchEvent(new Event(EVENT));
    }
  }, [themeId, setColorTheme]);

  return {
    themeId,
    currentTheme,
    setColorTheme,
    addCustomTheme,
    deleteCustomTheme,
    themes,
    customThemes,
  };
}
