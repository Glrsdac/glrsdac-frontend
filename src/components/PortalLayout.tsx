import { Link, Outlet, useLocation } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { isRouteActive } from "@/lib/routeMatching";

export type PortalNavItem = {
  to: string;
  label: string;
};

type PortalLayoutProps = {
  title: string;
  description: string;
  navItems: PortalNavItem[];
  hideNav?: boolean;
};

export function PortalLayout({ title, description, navItems, hideNav = false }: PortalLayoutProps) {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      {!hideNav && (
        <div className="border rounded-lg bg-card p-2">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "px-3 py-2 rounded-md text-sm transition-colors",
                  isRouteActive({ pathname: location.pathname, search: location.search }, item.to)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
}
