import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Moon, Sun, LogOut, User as UserIcon, Settings, Palette, Check, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Breadcrumbs } from "./breadcrumbs";
import { SidebarContent } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useColorTheme } from "@/hooks/use-color-theme";
import { CustomThemeDialog } from "@/components/shared/custom-theme-dialog";
import { TopbarNotifications } from "@/components/shared/topbar-notifications";
import { cn, initials } from "@/lib/utils";

export function Topbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { themeId, setColorTheme, themes, currentTheme } = useColorTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const userInitials = user ? initials(user.name) : "?";

  return (
    <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Mobile menu trigger */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Open navigation menu">
            <Menu className="size-4.5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(18rem,calc(100vw-2rem))] p-0">
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Breadcrumbs */}
      <div className="hidden lg:flex min-w-0 flex-1 items-center">
        <Breadcrumbs />
      </div>

      {/* Mobile title spacer */}
      <div className="flex-1 lg:hidden" />

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Color Palette Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Sidebar and accent color combinations"
              title={`Sidebar color: ${currentTheme.name}`}
              className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Palette className="size-4" />
              <span
                className="absolute bottom-1.5 right-1.5 size-2 rounded-full ring-1 ring-background shadow-xs"
                style={{ backgroundColor: currentTheme.sidebarActiveBg }}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 max-h-[75vh] overflow-y-auto">
            <DropdownMenuLabel className="pb-1.5">
              <div className="text-xs font-semibold text-foreground">Color Scheme ({themes.length} Combos)</div>
              <p className="text-[11px] font-normal text-muted-foreground mt-0.5">
                Customize sidebar & accent palette
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-1 space-y-1">
              {themes.map((t) => {
                const isActive = themeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setColorTheme(t.id)}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors text-left",
                      isActive
                        ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center -space-x-1 shrink-0">
                        {t.previewColors.map((color, idx) => (
                          <span
                            key={idx}
                            className="size-3.5 rounded-full ring-1 ring-background shadow-xs"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="truncate">{t.name}</span>
                    </div>
                    {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
            <DropdownMenuSeparator />
            <div className="p-1">
              <button
                type="button"
                onClick={() => setCustomDialogOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Paintbrush className="size-3.5 text-primary" />
                <span>Create Custom Palette…</span>
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <CustomThemeDialog open={customDialogOpen} onOpenChange={setCustomDialogOpen} />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="size-8 text-muted-foreground hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* Real-time Notifications Popover */}
        <TopbarNotifications />

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full pl-0.5 pr-2.5 py-0.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium leading-none truncate max-w-28">
                {user?.name?.split(" ")[0] ?? "User"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="pb-2">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">{user?.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="size-4" />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
