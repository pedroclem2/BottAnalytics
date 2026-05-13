import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full border border-glass-border bg-glass text-fg-muted">
        {icon ?? <Inbox className="h-4 w-4" />}
      </div>
      <h3 className="text-sm font-medium text-fg">{title}</h3>
      {description ? <p className="max-w-xs text-xs text-fg-muted">{description}</p> : null}
    </div>
  );
}
