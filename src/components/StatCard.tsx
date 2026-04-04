import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
  iconColor?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className, iconColor }: StatCardProps) {
  return (
    <div className={cn(
      "group relative bg-card rounded-xl border p-4 sm:p-5 card-hover overflow-hidden",
      className
    )}>
      {/* Subtle gradient accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight">{title}</span>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
            iconColor || "bg-primary/10 group-hover:bg-primary/15"
          )}>
            <Icon className={cn("w-4.5 h-4.5", iconColor ? "text-card-foreground" : "text-primary")} />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-heading font-bold text-foreground leading-none tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-2">
          {description && <p className="text-[11px] sm:text-xs text-muted-foreground">{description}</p>}
          {trend && (
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5",
              trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
