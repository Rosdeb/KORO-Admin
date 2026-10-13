import { Suspense, useEffect } from "react";
import { useAdminPreferences } from "@/lib/admin-preferences";
import { PageLoading } from "@/components/shared/page-loading";
import { Outlet } from "react-router-dom";
import { SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";

export function AppLayout() {
  const preferences = useAdminPreferences();
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
    return () => { delete document.documentElement.dataset.reducedMotion; };
  }, [preferences.reducedMotion]);
  return (
    <div className="flex h-dvh min-w-0 overflow-hidden" data-compact-tables={preferences.compactTables}>
      <aside className="hidden h-full w-64 shrink-0 lg:block">
        <div className="h-full w-full">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-5 lg:px-6">
          <div className="mx-auto min-w-0 max-w-[1400px]">
            <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
