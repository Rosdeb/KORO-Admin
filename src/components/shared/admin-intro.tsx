import { useAdminPreferences } from "@/lib/admin-preferences";
import { useTheme } from "@/hooks/use-theme";

export function AdminIntro({ message = "Preparing your workspace…" }: { message?: string }) {
  const { reducedMotion } = useAdminPreferences();
  useTheme();

  return <div className="admin-intro fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 text-foreground" data-motion={reducedMotion ? "reduced" : "full"}>
    <div aria-hidden="true" className="admin-intro-glow pointer-events-none absolute size-[min(30rem,90vw)] rounded-full bg-primary/5 blur-3xl" />
    <div className="admin-intro-content relative flex w-full max-w-xs flex-col items-center text-center">
      <div className="relative mb-6 flex size-64 items-center justify-center">
        <svg aria-hidden="true" viewBox="0 0 256 256" className="pointer-events-none absolute inset-0 size-full overflow-visible text-primary" fill="none">
          <circle cx="128" cy="128" r="118" stroke="currentColor" strokeOpacity="0.12" strokeDasharray="1 9" />
          <circle className="admin-intro-echo" cx="128" cy="128" r="108" stroke="currentColor" strokeWidth="0.8" />
          <g className="admin-intro-radius">
            <circle cx="128" cy="128" r="110" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
            <g className="admin-intro-orbit">
              <circle className="admin-intro-arc" cx="128" cy="128" r="110" pathLength="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="0.22 0.78" />
              <circle cx="238" cy="128" r="3" fill="currentColor" />
              <circle cx="238" cy="128" r="6" fill="currentColor" fillOpacity="0.1" />
            </g>
            <g className="admin-intro-counter-orbit">
              <circle cx="128" cy="128" r="100" pathLength="1" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.08 0.09 0.16 0.67" />
              <circle cx="28" cy="128" r="2" fill="currentColor" fillOpacity="0.6" />
            </g>
          </g>
        </svg>
        <div className="admin-intro-mark relative flex h-24 w-44 items-center justify-center">
          <img src="/korot-logo.svg" alt="Korot logo" width={960} height={360} className="h-auto w-full object-contain" fetchPriority="high" />
        </div>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-primary">Korot Admin</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome to your workspace.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Languages. People. Possibilities.</p>
      <div role="status" aria-live="polite" className="mt-8 w-full max-w-[190px]">
        <div aria-hidden="true" className="h-0.5 overflow-hidden rounded-full bg-primary/10"><div className="admin-intro-progress h-full w-1/3 rounded-full bg-primary/70" /></div>
        <p className="mt-3 text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  </div>;
}
