import { NavLink } from "react-router-dom";
import { Globe2 } from "lucide-react";
import { NAV_SECTIONS } from "./nav-config";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, hasRole } = useAuth();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-12 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Globe2 className="size-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Koro Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
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

      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="truncate text-xs text-sidebar-muted">Signed in as</p>
        <p className="truncate text-sm font-medium">{user?.name}</p>
      </div>
    </div>
  );
}
