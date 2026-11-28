import { Suspense, useEffect } from "react";
import { useAdminPreferences } from "@/lib/admin-preferences";
import { useColorTheme } from "@/hooks/use-color-theme";
import { PageLoading } from "@/components/shared/page-loading";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Outlet } from "react-router-dom";
import { SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";

export function AppLayout() {
  const preferences = useAdminPreferences();
  useColorTheme();
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
    return () => { delete document.documentElement.dataset.reducedMotion; };
  }, [preferences.reducedMotion]);
  return (
    <div className="flex h-dvh min-w-0 overflow-hidden" data-compact-tables={preferences.compactTables}>
      <aside className="hidden h-full w-[260px] shrink-0 lg:block">
        <div className="h-full w-full">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto min-w-0 w-full max-w-[1800px]">
            <ErrorBoundary>
              <Suspense fallback={<PageLoading />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
