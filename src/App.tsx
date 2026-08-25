import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/auth-context";
import { ProtectedRoute } from "@/routes/protected-route";
import { RoleRoute } from "@/routes/role-route";
import { AppLayout } from "@/layouts/app-layout";

import { LoginPage } from "@/pages/auth/login-page";
import { ForbiddenPage } from "@/pages/errors/forbidden-page";
import { NotFoundPage } from "@/pages/errors/not-found-page";

const OverviewPage = lazy(() => import("@/pages/dashboard/overview-page").then((m) => ({ default: m.OverviewPage })));
const AnalyticsPage = lazy(() => import("@/pages/analytics/analytics-page").then((m) => ({ default: m.AnalyticsPage })));
const UsersListPage = lazy(() => import("@/pages/users/users-list-page").then((m) => ({ default: m.UsersListPage })));
const UserDetailsPage = lazy(() => import("@/pages/users/user-details-page").then((m) => ({ default: m.UserDetailsPage })));
const LanguagesPage = lazy(() => import("@/pages/content/languages-page").then((m) => ({ default: m.LanguagesPage })));
const CategoriesPage = lazy(() => import("@/pages/content/categories-page").then((m) => ({ default: m.CategoriesPage })));
const ConceptsPage = lazy(() => import("@/pages/content/concepts-page").then((m) => ({ default: m.ConceptsPage })));
const TranslationsPage = lazy(() => import("@/pages/content/translations-page").then((m) => ({ default: m.TranslationsPage })));
const SubmissionsQueuePage = lazy(() =>
  import("@/pages/submissions/submissions-queue-page").then((m) => ({ default: m.SubmissionsQueuePage })),
);
const MyActivityPage = lazy(() => import("@/pages/activity/my-activity-page").then((m) => ({ default: m.MyActivityPage })));
const ReportsPage = lazy(() => import("@/pages/reports/reports-page").then((m) => ({ default: m.ReportsPage })));
const AdminUsersPage = lazy(() =>
  import("@/pages/administration/admin-users-page").then((m) => ({ default: m.AdminUsersPage })),
);
const RolesPermissionsPage = lazy(() =>
  import("@/pages/administration/roles-permissions-page").then((m) => ({ default: m.RolesPermissionsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/administration/settings-page").then((m) => ({ default: m.SettingsPage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />

                    <Route element={<RoleRoute roles={["ROLE_ADMIN"]} />}>
                      <Route path="dashboard" element={<OverviewPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="users" element={<UsersListPage />} />
                      <Route path="users/:id" element={<UserDetailsPage />} />
                      <Route path="reports" element={<ReportsPage />} />
                      <Route path="administration/admin-users" element={<AdminUsersPage />} />
                      <Route path="administration/roles-permissions" element={<RolesPermissionsPage />} />
                      <Route path="administration/settings" element={<SettingsPage />} />
                    </Route>

                    <Route element={<RoleRoute roles={["ROLE_ADMIN", "ROLE_LANGUAGE_REVIEWER"]} />}>
                      <Route path="content/languages" element={<LanguagesPage />} />
                      <Route path="content/categories" element={<CategoriesPage />} />
                      <Route path="content/concepts" element={<ConceptsPage />} />
                      <Route path="content/translations" element={<TranslationsPage />} />
                      <Route path="submissions" element={<SubmissionsQueuePage />} />
                      <Route path="activity" element={<MyActivityPage />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster
            position="top-right"
            closeButton
            toastOptions={{
              duration: 4000,
              style: { padding: "10px 12px", minHeight: "auto" },
              classNames: { title: "text-sm", description: "text-xs" },
            }}
          />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
