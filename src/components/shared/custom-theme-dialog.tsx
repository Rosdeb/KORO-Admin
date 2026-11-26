import { useState } from "react";
import { Paintbrush, Cookie, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColorTheme } from "@/hooks/use-color-theme";
import { createCustomTheme, getContrastColor } from "@/lib/color-themes";
import { toast } from "sonner";

interface CustomThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_INSPIRATIONS = [
  { name: "Gold & Sand", bg: "#231B10", active: "#E5CD82", fg: "#FFFDF5" },
  { name: "Sage & Linen", bg: "#202A1E", active: "#94A684", fg: "#E4E4D0" },
  { name: "Pine & Almond", bg: "#19281F", active: "#5D866C", fg: "#E6D8C3" },
  { name: "Azure Mist", bg: "#0F202F", active: "#619DC6", fg: "#F0F8FF" },
  { name: "Leaf Sage", bg: "#172619", active: "#84A282", fg: "#B8CFB3" },
  { name: "Deep Charcoal", bg: "#121316", active: "#3B82F6", fg: "#F9FAFB" },
];

export function CustomThemeDialog({ open, onOpenChange }: CustomThemeDialogProps) {
  const { addCustomTheme } = useColorTheme();

  const [themeName, setThemeName] = useState("My Custom Palette");
  const [sidebarBg, setSidebarBg] = useState("#1A202C");
  const [sidebarActiveBg, setSidebarActiveBg] = useState("#94A684");
  const [sidebarFg, setSidebarFg] = useState("#F7FAFC");

  const activeFg = getContrastColor(sidebarActiveBg);

  function handleSave() {
    if (!themeName.trim()) {
      toast.error("Please enter a name for your custom palette");
      return;
    }

    try {
      const customTheme = createCustomTheme({
        name: themeName.trim(),
        sidebarBg,
        sidebarActiveBg,
        sidebarFg,
      });

      addCustomTheme(customTheme);
      toast.success("Custom palette saved!", {
        description: `"${customTheme.name}" is stored in your browser cookies and activated.`,
      });
      onOpenChange(false);
    } catch {
      toast.error("Could not save custom theme. Please check the color values.");
    }
  }

  function applyPreset(preset: typeof PRESET_INSPIRATIONS[0]) {
    setThemeName(preset.name);
    setSidebarBg(preset.bg);
    setSidebarActiveBg(preset.active);
    setSidebarFg(preset.fg);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Paintbrush className="size-4 text-primary" />
            Create Custom Color Palette
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pick your custom sidebar colors. Saved locally in your browser cookies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Theme Name */}
          <div className="space-y-1.5">
            <Label htmlFor="custom-theme-name" className="text-xs font-medium">
              Palette Name
            </Label>
            <Input
              id="custom-theme-name"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="e.g. My Studio Dark"
              className="h-8 text-xs"
            />
          </div>

          {/* Quick Inspirations */}
          <div className="space-y-1.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="size-3" /> Quick Presets & Inspirations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_INSPIRATIONS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] transition-colors hover:bg-muted"
                >
                  <span
                    className="size-2.5 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: preset.active }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Pickers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Sidebar Background */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground block truncate">
                1. Background
              </Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={sidebarBg}
                  onChange={(e) => setSidebarBg(e.target.value)}
                  className="size-8 cursor-pointer rounded-md border border-border p-0.5 bg-background shadow-xs shrink-0"
                  aria-label="Pick sidebar background color"
                />
                <Input
                  value={sidebarBg}
                  onChange={(e) => setSidebarBg(e.target.value)}
                  className="h-8 text-[11px] font-mono px-2"
                />
              </div>
            </div>

            {/* Active / Highlight */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground block truncate">
                2. Active Accent
              </Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={sidebarActiveBg}
                  onChange={(e) => setSidebarActiveBg(e.target.value)}
                  className="size-8 cursor-pointer rounded-md border border-border p-0.5 bg-background shadow-xs shrink-0"
                  aria-label="Pick active button color"
                />
                <Input
                  value={sidebarActiveBg}
                  onChange={(e) => setSidebarActiveBg(e.target.value)}
                  className="h-8 text-[11px] font-mono px-2"
                />
              </div>
            </div>

            {/* Foreground / Text */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground block truncate">
                3. Text & Icons
              </Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={sidebarFg}
                  onChange={(e) => setSidebarFg(e.target.value)}
                  className="size-8 cursor-pointer rounded-md border border-border p-0.5 bg-background shadow-xs shrink-0"
                  aria-label="Pick text foreground color"
                />
                <Input
                  value={sidebarFg}
                  onChange={(e) => setSidebarFg(e.target.value)}
                  className="h-8 text-[11px] font-mono px-2"
                />
              </div>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Live Sidebar Preview
            </Label>
            <div
              className="rounded-xl p-3 border shadow-xs transition-colors"
              style={{
                backgroundColor: sidebarBg,
                borderColor: `${sidebarActiveBg}40`,
                color: sidebarFg,
              }}
            >
              <div className="flex items-center justify-between border-b pb-2 mb-2" style={{ borderColor: `${sidebarActiveBg}25` }}>
                <div className="flex items-center gap-2">
                  <div
                    className="size-5 rounded-md flex items-center justify-center font-bold text-[10px]"
                    style={{ backgroundColor: sidebarActiveBg, color: activeFg }}
                  >
                    K
                  </div>
                  <span className="text-xs font-semibold">{themeName || "Custom Preview"}</span>
                </div>
                <span className="text-[10px] opacity-70 font-mono">Live</span>
              </div>

              <div className="space-y-1">
                {/* Inactive Item */}
                <div
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs opacity-75 hover:opacity-100"
                >
                  <span className="size-1.5 rounded-full opacity-60" style={{ backgroundColor: sidebarFg }} />
                  <span>Dashboard Overview</span>
                </div>

                {/* Active Item */}
                <div
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-xs"
                  style={{
                    backgroundColor: sidebarActiveBg,
                    color: activeFg,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: activeFg }} />
                    <span>Dictionary & Content</span>
                  </div>
                  <Check className="size-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Cookie Notice */}
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border/50">
            <Cookie className="size-4 shrink-0 text-amber-500" />
            <span>
              Saved in your browser’s <strong>cookies</strong>. Your custom palette stays active across sessions and tabs without changing server data.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <Check className="size-3.5" />
            Save & Apply Custom Theme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
