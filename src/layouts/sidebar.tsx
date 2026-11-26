import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate } from "react-router-dom";
import { Globe2, LogOut, Loader2, ChevronRight } from "lucide-react";
import { NAV_SECTIONS } from "./nav-config";
import { useAuth } from "@/hooks/use-auth";
import { cn, initials } from "@/lib/utils";
import type { Role } from "@/types/api";

function panelLabel(hasRole: (...roles: Role[]) => boolean): string {
  if (hasRole("ROLE_ADMIN")) return "Korot Admin";
  if (hasRole("ROLE_MODERATOR")) return "Korot Moderator";
  if (hasRole("ROLE_LANGUAGE_REVIEWER")) return "Korot Reviewer";
  return "Korot Admin";
}

function roleTagLabel(hasRole: (...roles: Role[]) => boolean): string {
  if (hasRole("ROLE_ADMIN")) return "Admin";
  if (hasRole("ROLE_MODERATOR")) return "Moderator";
  if (hasRole("ROLE_LANGUAGE_REVIEWER")) return "Reviewer";
  return "Admin";
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

  const userInitials = user ? initials(user.name) : "?";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      {/* Logo / Brand */}
      <div className="flex h-14 shrink-0 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)] shadow-sm">
          <Globe2 className="size-4 text-[var(--sidebar-active-fg)]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-sidebar-foreground leading-none">
            {panelLabel(hasRole)}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-sidebar-muted uppercase tracking-widest">
            Dashboard
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 scrollbar-thin">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => hasRole(...item.roles));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.label} className="mb-5">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-muted select-none">
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
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-all duration-150",
                        "focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-bg)]/50",
                        isActive
                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)] font-semibold shadow-sm"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-1 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-current opacity-90" />
                        )}
                        <item.icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            isActive ? "text-[var(--sidebar-active-fg)]" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {isActive && (
                          <ChevronRight className="ml-auto size-3.5 opacity-75" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          {/* Avatar */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-active-bg)]/20 text-xs font-bold text-sidebar-foreground ring-1 ring-[var(--sidebar-active-bg)]/40">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-foreground leading-tight">
              {user?.name ?? "—"}
            </p>
            <p className="truncate text-[10px] text-sidebar-muted mt-0.5">
              {roleTagLabel(hasRole)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label={signingOut ? "Signing out" : "Sign out"}
            className="ml-auto flex shrink-0 size-7 items-center justify-center rounded-md text-sidebar-muted outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-bg)]/50 disabled:cursor-wait disabled:opacity-40"
          >
            {signingOut ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <LogOut className="size-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
