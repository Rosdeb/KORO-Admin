import { Outlet } from "react-router-dom";
import { SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";

export function AppLayout() {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed h-dvh w-64">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-4 sm:px-5 lg:px-6">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
