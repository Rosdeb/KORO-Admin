import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { Globe2, LogOut, Loader2 } from "lucide-react";
import { NAV_SECTIONS } from "./nav-config";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/api";

function panelLabel(hasRole: (...roles: Role[]) => boolean): string {
  if (hasRole("ROLE_ADMIN")) return "Korot Admin";
  if (hasRole("ROLE_MODERATOR")) return "Korot Moderator";
  if (hasRole("ROLE_LANGUAGE_REVIEWER")) return "Korot Reviewer";
  return "Korot Admin";
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, hasRole, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await queryClient.cancelQueries();
      await logout();
      queryClient.clear();
      onNavigate?.();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Globe2 className="size-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">{panelLabel(hasRole)}</span>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 scrollbar-thin">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => hasRole(...item.roles));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label} className="mb-4">
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.25 text-sm font-medium outline-none transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-primary/60",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white",
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-sidebar-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-sidebar-muted">Signed in as</p>
          <p className="truncate text-sm font-medium">{user?.name}</p>
        </div>
        <button type="button" onClick={handleSignOut} disabled={signingOut} aria-label={signingOut ? "Signing out" : "Sign out"} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-xs text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-wait disabled:opacity-50">
          {signingOut ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LogOut className="size-3.5" aria-hidden="true" />}
          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </div>
  );
}
