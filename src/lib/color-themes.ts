import { getCookie, setCookie, deleteCookie } from "./cookie-utils";

export interface ColorTheme {
  id: string;
  name: string;
  description: string;
  category: "Warm Gold" | "Earthy & Pastel" | "Nature & Ocean" | "Jewel & Ruby" | "Dark & Minimal" | "Custom";
  sidebarBg: string;
  sidebarFg: string;
  sidebarMuted: string;
  sidebarActiveBg: string;
  sidebarActiveFg: string;
  sidebarBorder: string;
  sidebarAccent: string;
  previewColors: [string, string, string]; // [sidebarBg, activeBg, accent]
  isCustom?: boolean;
}

export const COLOR_THEMES: ColorTheme[] = [
  // ─── USER REQUESTED COMBINATIONS: EARTHY & PASTEL ─────────────────────────
  {
    id: "sage-linen",
    name: "Sage, Celadon & Linen",
    description: "Botanical sage (#94A684), soft celadon (#AEC3AE), and warm linen (#E4E4D0).",
    category: "Earthy & Pastel",
    sidebarBg: "#202A1E",
    sidebarFg: "#F2F5ED",
    sidebarMuted: "#AEC3AE",
    sidebarActiveBg: "#94A684",
    sidebarActiveFg: "#162014",
    sidebarBorder: "rgba(148, 166, 132, 0.28)",
    sidebarAccent: "rgba(174, 195, 174, 0.2)",
    previewColors: ["#94A684", "#AEC3AE", "#E4E4D0"],
  },
  {
    id: "linen-sage-light",
    name: "Linen & Sage (Light)",
    description: "Light warm linen (#E4E4D0) sidebar with herbal sage (#94A684) badges.",
    category: "Earthy & Pastel",
    sidebarBg: "#E4E4D0",
    sidebarFg: "#212B1E",
    sidebarMuted: "#607459",
    sidebarActiveBg: "#94A684",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(148, 166, 132, 0.4)",
    sidebarAccent: "rgba(174, 195, 174, 0.35)",
    previewColors: ["#E4E4D0", "#94A684", "#AEC3AE"],
  },
  {
    id: "pine-taupe-cream",
    name: "Pine Jade, Taupe & Cream",
    description: "Forest jade (#5D866C), warm taupe sand (#C2A68C), and almond cream (#E6D8C3).",
    category: "Earthy & Pastel",
    sidebarBg: "#19281F",
    sidebarFg: "#FBF7F0",
    sidebarMuted: "#C2A68C",
    sidebarActiveBg: "#5D866C",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(194, 166, 140, 0.26)",
    sidebarAccent: "rgba(230, 216, 195, 0.18)",
    previewColors: ["#5D866C", "#C2A68C", "#E6D8C3"],
  },
  {
    id: "azure-sky-mist",
    name: "Azure & Sky Mist",
    description: "Nordic maritime blue (#619DC6) with soft sky cloud (#A6C8E2) accents.",
    category: "Nature & Ocean",
    sidebarBg: "#0F202F",
    sidebarFg: "#F0F8FF",
    sidebarMuted: "#A6C8E2",
    sidebarActiveBg: "#619DC6",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(97, 157, 198, 0.28)",
    sidebarAccent: "rgba(166, 200, 226, 0.2)",
    previewColors: ["#0F202F", "#619DC6", "#A6C8E2"],
  },
  {
    id: "meadow-leaf-sage",
    name: "Meadow & Leaf Sage",
    description: "Calm meadow celadon (#B8CFB3) and earthy leaf sage (#84A282).",
    category: "Earthy & Pastel",
    sidebarBg: "#172619",
    sidebarFg: "#F3FAF1",
    sidebarMuted: "#B8CFB3",
    sidebarActiveBg: "#84A282",
    sidebarActiveFg: "#0F1A10",
    sidebarBorder: "rgba(132, 162, 130, 0.28)",
    sidebarAccent: "rgba(184, 207, 179, 0.2)",
    previewColors: ["#172619", "#84A282", "#B8CFB3"],
  },

  // ─── USER REQUESTED COMBINATIONS: WARM GOLD (#E5CD82 & #FFF2B4) ────────────
  {
    id: "golden-sand",
    name: "Golden Sand & Cream",
    description: "Rich dark amber with warm wheat gold (#E5CD82) and soft butter cream (#FFF2B4).",
    category: "Warm Gold",
    sidebarBg: "#231B10",
    sidebarFg: "#FFFDF5",
    sidebarMuted: "#C7B898",
    sidebarActiveBg: "#E5CD82",
    sidebarActiveFg: "#231B10",
    sidebarBorder: "rgba(229, 205, 130, 0.22)",
    sidebarAccent: "rgba(255, 242, 180, 0.15)",
    previewColors: ["#231B10", "#E5CD82", "#FFF2B4"],
  },
  {
    id: "midnight-gold",
    name: "Midnight Obsidian & Gold",
    description: "Deep obsidian dark with striking gold (#E5CD82) active highlights.",
    category: "Warm Gold",
    sidebarBg: "#101114",
    sidebarFg: "#FAF8F2",
    sidebarMuted: "#9E9684",
    sidebarActiveBg: "#E5CD82",
    sidebarActiveFg: "#101114",
    sidebarBorder: "rgba(229, 205, 130, 0.18)",
    sidebarAccent: "rgba(255, 242, 180, 0.12)",
    previewColors: ["#101114", "#E5CD82", "#FFF2B4"],
  },
  {
    id: "champagne-light",
    name: "Champagne & Ivory (Light)",
    description: "Elegant warm ivory (#FFF2B4) background with wheat gold (#E5CD82) badges.",
    category: "Warm Gold",
    sidebarBg: "#F7F2DF",
    sidebarFg: "#261D0C",
    sidebarMuted: "#7D6C47",
    sidebarActiveBg: "#E5CD82",
    sidebarActiveFg: "#231804",
    sidebarBorder: "rgba(164, 137, 72, 0.22)",
    sidebarAccent: "rgba(229, 205, 130, 0.3)",
    previewColors: ["#F7F2DF", "#E5CD82", "#261D0C"],
  },

  // ─── NATURE & OCEAN PALETTES ──────────────────────────────────────────────
  {
    id: "forest-moss",
    name: "Forest Moss (Original)",
    description: "Classic deep forest green with sage and moss active badges.",
    category: "Nature & Ocean",
    sidebarBg: "#15370D",
    sidebarFg: "#F4F7F3",
    sidebarMuted: "#9DB49A",
    sidebarActiveBg: "#728E6D",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(114, 142, 109, 0.22)",
    sidebarAccent: "rgba(114, 142, 109, 0.18)",
    previewColors: ["#15370D", "#728E6D", "#9DB49A"],
  },
  {
    id: "royal-sapphire",
    name: "Royal Sapphire & Ice",
    description: "Deep oceanic navy paired with vivid sapphire blue and ice cyan.",
    category: "Nature & Ocean",
    sidebarBg: "#0C192E",
    sidebarFg: "#F0F6FF",
    sidebarMuted: "#8DAACF",
    sidebarActiveBg: "#2563EB",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(59, 130, 246, 0.25)",
    sidebarAccent: "rgba(59, 130, 246, 0.15)",
    previewColors: ["#0C192E", "#2563EB", "#93C5FD"],
  },
  {
    id: "nordic-teal",
    name: "Nordic Teal & Slate",
    description: "Abyssal slate balanced by modern Nordic teal highlights.",
    category: "Nature & Ocean",
    sidebarBg: "#0B1E24",
    sidebarFg: "#EDFBFB",
    sidebarMuted: "#88B2BA",
    sidebarActiveBg: "#0D9488",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(13, 148, 136, 0.25)",
    sidebarAccent: "rgba(20, 184, 166, 0.15)",
    previewColors: ["#0B1E24", "#0D9488", "#5EEAD4"],
  },
  {
    id: "cyber-emerald",
    name: "Cyber Emerald & Mint",
    description: "Deep obsidian green with high-contrast electric mint highlights.",
    category: "Nature & Ocean",
    sidebarBg: "#051A14",
    sidebarFg: "#F0FDF4",
    sidebarMuted: "#72B99C",
    sidebarActiveBg: "#059669",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(16, 185, 129, 0.25)",
    sidebarAccent: "rgba(52, 211, 153, 0.15)",
    previewColors: ["#051A14", "#059669", "#6EE7B7"],
  },

  // ─── JEWEL & RUBY PALETTES ───────────────────────────────────────────────
  {
    id: "deep-crimson",
    name: "Imperial Crimson & Rose",
    description: "Velvet wine dark base paired with vivid ruby rose active states.",
    category: "Jewel & Ruby",
    sidebarBg: "#260E15",
    sidebarFg: "#FFF1F3",
    sidebarMuted: "#CD96A2",
    sidebarActiveBg: "#BE123C",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(225, 29, 72, 0.22)",
    sidebarAccent: "rgba(225, 29, 72, 0.15)",
    previewColors: ["#260E15", "#BE123C", "#FDA4AF"],
  },
  {
    id: "amethyst-violet",
    name: "Imperial Amethyst",
    description: "Royal midnight plum with brilliant violet purple navigation.",
    category: "Jewel & Ruby",
    sidebarBg: "#1B102E",
    sidebarFg: "#FAF5FF",
    sidebarMuted: "#AC95C9",
    sidebarActiveBg: "#7C3AED",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(124, 58, 237, 0.25)",
    sidebarAccent: "rgba(124, 58, 237, 0.15)",
    previewColors: ["#1B102E", "#7C3AED", "#C4B5FD"],
  },

  // ─── DARK & MINIMAL PALETTES ─────────────────────────────────────────────
  {
    id: "espresso-caramel",
    name: "Espresso & Warm Caramel",
    description: "Roasted espresso brown with warm terracotta caramel.",
    category: "Dark & Minimal",
    sidebarBg: "#1A120B",
    sidebarFg: "#FFF7ED",
    sidebarMuted: "#BFA48E",
    sidebarActiveBg: "#C2410C",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(194, 65, 12, 0.22)",
    sidebarAccent: "rgba(234, 88, 12, 0.15)",
    previewColors: ["#1A120B", "#C2410C", "#FED7AA"],
  },
  {
    id: "sunset-amber",
    name: "Sunset Amber & Orange",
    description: "Dark mahogany with vibrant sunset amber and radiant orange.",
    category: "Dark & Minimal",
    sidebarBg: "#2A1308",
    sidebarFg: "#FFFBEB",
    sidebarMuted: "#CBA37E",
    sidebarActiveBg: "#EA580C",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(234, 88, 12, 0.25)",
    sidebarAccent: "rgba(245, 158, 11, 0.15)",
    previewColors: ["#2A1308", "#EA580C", "#FDE68A"],
  },
  {
    id: "monochrome-carbon",
    name: "Monochrome Carbon",
    description: "Industrial dark carbon with clean neutral zinc and silver.",
    category: "Dark & Minimal",
    sidebarBg: "#141517",
    sidebarFg: "#F4F4F5",
    sidebarMuted: "#94959E",
    sidebarActiveBg: "#3F3F46",
    sidebarActiveFg: "#FFFFFF",
    sidebarBorder: "rgba(255, 255, 255, 0.1)",
    sidebarAccent: "rgba(255, 255, 255, 0.08)",
    previewColors: ["#141517", "#3F3F46", "#D4D4D8"],
  },
];

export const DEFAULT_THEME_ID = "sage-linen";

export const CUSTOM_THEMES_COOKIE = "koro_custom_color_themes";
export const ACTIVE_THEME_COOKIE = "koro_color_theme_id";

// --- Color Helpers ---
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }
  return null;
}

export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const a = [rgb.r, rgb.g, rgb.b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastColor(hex: string): string {
  return getLuminance(hex) > 0.45 ? "#111827" : "#FFFFFF";
}

export function createCustomTheme(options: {
  id?: string;
  name: string;
  sidebarBg: string;
  sidebarActiveBg: string;
  sidebarFg?: string;
}): ColorTheme {
  const sidebarBg = options.sidebarBg.startsWith("#") ? options.sidebarBg : `#${options.sidebarBg}`;
  const sidebarActiveBg = options.sidebarActiveBg.startsWith("#") ? options.sidebarActiveBg : `#${options.sidebarActiveBg}`;
  
  const bgLuminance = getLuminance(sidebarBg);
  const isDarkBg = bgLuminance < 0.45;

  const sidebarFg = options.sidebarFg
    ? options.sidebarFg.startsWith("#") ? options.sidebarFg : `#${options.sidebarFg}`
    : isDarkBg ? "#F9FAFB" : "#111827";

  const sidebarActiveFg = getContrastColor(sidebarActiveBg);
  const activeRgb = hexToRgb(sidebarActiveBg) ?? { r: 120, g: 120, b: 120 };

  const sidebarBorder = `rgba(${activeRgb.r}, ${activeRgb.g}, ${activeRgb.b}, 0.28)`;
  const sidebarAccent = `rgba(${activeRgb.r}, ${activeRgb.g}, ${activeRgb.b}, ${isDarkBg ? "0.18" : "0.12"})`;

  const fgRgb = hexToRgb(sidebarFg) ?? (isDarkBg ? { r: 240, g: 240, b: 240 } : { r: 30, g: 30, b: 30 });
  const sidebarMuted = isDarkBg
    ? `rgba(${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b}, 0.65)`
    : `rgba(${fgRgb.r}, ${fgRgb.g}, ${fgRgb.b}, 0.65)`;

  const id = options.id || `custom-${Date.now()}`;

  return {
    id,
    name: options.name.trim() || "My Custom Theme",
    description: `Custom cookie-stored palette (${sidebarBg}, ${sidebarActiveBg})`,
    category: "Custom",
    sidebarBg,
    sidebarFg,
    sidebarMuted,
    sidebarActiveBg,
    sidebarActiveFg,
    sidebarBorder,
    sidebarAccent,
    previewColors: [sidebarBg, sidebarActiveBg, sidebarFg],
    isCustom: true,
  };
}

// --- Cookie Storage Functions ---

export function getStoredCustomThemes(): ColorTheme[] {
  if (typeof window === "undefined") return [];
  try {
    const rawCookie = getCookie(CUSTOM_THEMES_COOKIE);
    const rawLocal = localStorage.getItem(CUSTOM_THEMES_COOKIE);
    const raw = rawCookie || rawLocal;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is ColorTheme => Boolean(t && t.id && t.sidebarBg));
    }
    return [];
  } catch {
    return [];
  }
}

export function saveCustomTheme(theme: ColorTheme): void {
  if (typeof window === "undefined") return;
  const current = getStoredCustomThemes();
  const filtered = current.filter((t) => t.id !== theme.id);
  const updated = [theme, ...filtered];
  const serialized = JSON.stringify(updated);
  setCookie(CUSTOM_THEMES_COOKIE, serialized, 365);
  try {
    localStorage.setItem(CUSTOM_THEMES_COOKIE, serialized);
  } catch {
    // Ignore localStorage quota errors
  }
}

export function deleteStoredCustomTheme(id: string): void {
  if (typeof window === "undefined") return;
  const current = getStoredCustomThemes();
  const updated = current.filter((t) => t.id !== id);
  const serialized = JSON.stringify(updated);
  if (updated.length === 0) {
    deleteCookie(CUSTOM_THEMES_COOKIE);
    try {
      localStorage.removeItem(CUSTOM_THEMES_COOKIE);
    } catch {
      // Ignore
    }
  } else {
    setCookie(CUSTOM_THEMES_COOKIE, serialized, 365);
    try {
      localStorage.setItem(CUSTOM_THEMES_COOKIE, serialized);
    } catch {
      // Ignore
    }
  }
}

export function getAllThemes(): ColorTheme[] {
  const custom = getStoredCustomThemes();
  return [...custom, ...COLOR_THEMES];
}

export function getThemeById(id: string): ColorTheme {
  const all = getAllThemes();
  return all.find((t) => t.id === id) ?? COLOR_THEMES[0];
}

export function applyColorTheme(theme: ColorTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--sidebar", theme.sidebarBg);
  root.style.setProperty("--sidebar-foreground", theme.sidebarFg);
  root.style.setProperty("--sidebar-muted", theme.sidebarMuted);
  root.style.setProperty("--sidebar-active-bg", theme.sidebarActiveBg);
  root.style.setProperty("--sidebar-active-fg", theme.sidebarActiveFg);
  root.style.setProperty("--sidebar-border", theme.sidebarBorder);
  root.style.setProperty("--sidebar-accent", theme.sidebarAccent);
  root.dataset.colorTheme = theme.id;
}
