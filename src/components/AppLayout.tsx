import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { UserProfile } from "@/components/UserProfile";
import { OnboardingTour } from "@/components/OnboardingTour";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Search } from "lucide-react";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/members": "Members",
  "/funds": "Funds",
  "/contributions": "Contributions",
  "/departments": "Departments",
  "/expenses": "Expenses",
  "/users": "Users",
  "/bank-accounts": "Bank Accounts",
  "/cheques": "Cheques",
  "/imprest": "Imprest",
  "/statements": "Statements",
  "/payments": "Payments",
  "/automated-returns": "Returns",
  "/roles-permissions": "Roles & Permissions",
  "/admin-logs": "Audit Logs",
  "/database-sync": "Database Sync",
};

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname.startsWith("/portal/member")) return "Member Portal";
    if (location.pathname.startsWith("/portal/treasury")) return "Treasury";
    if (location.pathname.startsWith("/portal/clerk")) return "Clerk Office";
    if (location.pathname.startsWith("/portal/governance")) return "Governance";
    if (location.pathname.startsWith("/portal/department")) return "Departments";
    return ROUTE_TITLES[location.pathname] || "";
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Main content area */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3 border-b glass-card sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden">
              <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="h-9 w-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px] sm:w-[300px]">
                  <AppSidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <img src="/glrsdac_logo_icon_only.png" alt="" className="w-6 h-6 lg:hidden flex-shrink-0" />
              <span className="text-sm font-heading font-semibold text-foreground truncate">
                {getPageTitle() || "GLRSDAC"}
              </span>
            </div>
          </div>

          <UserProfile />
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>
      <OnboardingTour />
    </div>
  );
}
