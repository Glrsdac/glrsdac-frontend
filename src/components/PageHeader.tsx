import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, actions, badge, icon, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground truncate">{title}</h1>
              {badge}
            </div>
            {description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
          </div>
        </div>
      </div>
      {(children || actions) && (
        <div className="flex flex-shrink-0 w-full sm:w-auto items-center justify-start sm:justify-end gap-2 flex-wrap">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
