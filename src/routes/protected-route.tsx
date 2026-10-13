import { useEffect, useState } from "react";
import { useAdminPreferences } from "@/lib/admin-preferences";
import { isStartupIntroComplete, startupIntroDelay, completeStartupIntro } from "@/lib/startup-intro";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { AdminIntro } from "@/components/shared/admin-intro";

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping, hasRole } = useAuth();
  const location = useLocation();
  const { reducedMotion } = useAdminPreferences();
  const [introFinished, setIntroFinished] = useState(isStartupIntroComplete);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      completeStartupIntro();
      setIntroFinished(true);
    }, startupIntroDelay(reducedMotion));
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  if (isBootstrapping) {
    return <AdminIntro message="Restoring your session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRole("ROLE_ADMIN", "ROLE_LANGUAGE_REVIEWER", "ROLE_MODERATOR")) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>
    {!introFinished && <AdminIntro message="Opening your workspace…" />}
    <Outlet />
  </>;
}
