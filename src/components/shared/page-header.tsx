import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({ title, description, actions, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
       <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="break-words text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:pt-0.5">{actions}</div>
      )}
    </div>
  );
}
