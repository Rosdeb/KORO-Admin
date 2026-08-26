import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Globe2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/api/client";
import type { Role } from "@/types/api";

/** Admins land on the Overview dashboard; Reviewers/Moderators land on the Submission Queue,
 *  the only "home" page their role can actually see (Overview/Analytics call admin-only endpoints). */
function landingPathFor(roles: Role[]): string {
  return roles.includes("ROLE_ADMIN") ? "/dashboard" : "/submissions";
}

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { isAuthenticated, isBootstrapping, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  if (!isBootstrapping && isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? landingPathFor(user?.roles ?? []);
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      const isPanelRole =
        user.roles.includes("ROLE_ADMIN") ||
        user.roles.includes("ROLE_LANGUAGE_REVIEWER") ||
        user.roles.includes("ROLE_MODERATOR");
      navigate(isPanelRole ? landingPathFor(user.roles) : "/forbidden", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? "Incorrect email or password."
            : err.message
          : "Unable to reach the server. Check your connection and try again.";
      setServerError(message);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Globe2 className="size-5" />
          </div>
          <h1 className="text-lg font-semibold">Koro Admin/Moderator Panel</h1>
          <p className="text-sm text-muted-foreground">Sign in with your administrator or moderator account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="admin@koro.com"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
