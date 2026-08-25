import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping, hasRole } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRole("ROLE_ADMIN", "ROLE_LANGUAGE_REVIEWER")) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
