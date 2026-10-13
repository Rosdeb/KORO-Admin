import { Loader2 } from "lucide-react";

export function PageLoading() {
  return <div role="status" className="flex h-48 items-center justify-center gap-2 text-xs text-muted-foreground">
    <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Loading page…
  </div>;
}
