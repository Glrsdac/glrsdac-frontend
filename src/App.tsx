import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { initializePortalDepartments } from "@/lib/initialize-portal-departments";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { DebugBanner } from "@/components/DebugBanner";
import Auth from "@/pages/Auth";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import Funds from "@/pages/Funds";
import Contributions from "@/pages/Contributions";
import Departments from "@/pages/Departments";
import DepartmentGroups from "@/pages/DepartmentGroups";
import SabbathSessions from "@/pages/SabbathSessions";
import BankAccounts from "@/pages/BankAccounts";
import Imprest from "@/pages/Imprest";
import Users from "@/pages/Users";
import AdminLogs from "@/pages/AdminLogs";
import RolesPermissions from "@/pages/RolesPermissions";
import GlobalAdmin from "@/pages/GlobalAdmin";
import { DatabaseSync } from "@/components/DatabaseSync";
import Expenses from "@/pages/Expenses";
import Cheques from "@/pages/Cheques";
import Payments from "@/pages/Payments";
import AutomatedReturns from "@/pages/AutomatedReturns";
import Statements from "@/pages/Statements";
import DepartmentPortal from "@/pages/DepartmentPortal";
import MusicDepartmentPortal from "@/pages/MusicDepartmentPortal";
import MemberChoirView from "@/pages/MemberChoirView";
import DepartmentSharePoint from "@/pages/DepartmentSharePoint";
import DaybornContributions from "@/pages/DaybornContributions";
import ClerkPortal from "@/pages/ClerkPortal";
import MyDues from "@/pages/MyDues";
import AccountSettings from "@/pages/AccountSettings";
import MemberContributions from "@/pages/MemberContributions";
import MemberStatements from "@/pages/MemberStatements";
import MemberUpdates from "@/pages/MemberUpdates";
import MemberCalendar from "@/pages/MemberCalendar";
import MemberClerkView from "@/pages/MemberClerkView";
import MemberSabbathLessons from "@/pages/MemberSabbathLessons";
import Organizations from "@/pages/Organizations";
import GlobalAnalytics from "@/pages/GlobalAnalytics";

import {
  ClerkPortalSection,
  DepartmentPortalSection,
  GovernancePortalSection,
  MemberPortalSection,
  TreasuryPortalSection,
} from "@/pages/portals/PortalSections";
import {
  DepartmentDashboard,
  GovernanceDashboard,
  TreasuryDashboard,
} from "@/pages/portals/PortalDashboards";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Permission model (front-end enforcement)
 *
 * This is a lightweight mapping that converts RBAC role names into permission keys
 * so route-level guards can decide what portal sections a user can access.
 *
 * Security note:
 * - This front-end guard is for UX/navigation gating.
 * - Actual data security must be enforced with Supabase RLS policies.
 */
const ADMIN_PERMISSIONS = [
    "read:users", "create:users", "update:users", "delete:users",
    "read:roles", "create:roles", "update:roles", "delete:roles",
    "read:permissions", "create:permissions", "update:permissions", "delete:permissions",
    "create:budget", "read:budget", "update:budget", "approve:budget",
    "approve:annual_budget", "read:annual_budget", "read:department_budget", "update:department_budget",
    "create:expense", "read:expense", "update:expense", "approve:expense",
    "create:offering", "read:offering", "update:offering",
    "read:ledger", "read:department_ledger", "read:financial_reports", "create:financial_reports", "read:financial_dashboard",
    "create:members", "read:members", "update:members",
    "read:baptisms", "create:baptisms", "update:baptisms",
    "read:transfers", "create:transfers", "read:attendance", "create:attendance",
    "read:minutes", "create:minutes", "update:minutes", "read:membership_dashboard",
    "create:events", "read:events", "update:events", "delete:events",
    "create:announcements", "read:announcements", "update:announcements", "delete:announcements",
    "create:reports", "read:reports", "update:reports", "read:volunteers", "update:volunteers",
    "create:event_registrations", "read:personal_giving", "update:profile",
];
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  "System Admin": ADMIN_PERMISSIONS,
  "SuperAdmin": ADMIN_PERMISSIONS,
  "Super Admin": ADMIN_PERMISSIONS,
  TREASURER: [
    "create:budget", "read:budget", "update:budget", "approve:budget",
    "approve:annual_budget", "read:annual_budget", "read:department_budget", "update:department_budget",
    "create:expense", "read:expense", "update:expense", "approve:expense",
    "create:offering", "read:offering", "update:offering",
    "read:ledger", "read:department_ledger", "read:financial_reports", "create:financial_reports", "read:financial_dashboard",
    "read:announcements", "create:event_registrations", "read:personal_giving", "update:profile",
  ],
  CLERK: [
    "create:members", "read:members", "update:members",
    "read:baptisms", "create:baptisms", "update:baptisms",
    "read:transfers", "create:transfers", "read:attendance", "create:attendance",
    "read:minutes", "create:minutes", "update:minutes", "read:membership_dashboard",
    "read:announcements", "create:event_registrations", "read:personal_giving", "update:profile",
  ],
  VIEWER: [
    "read:announcements", "create:event_registrations", "read:personal_giving", "update:profile",
  ],
};

const TREASURY_PERMISSION_KEYS = [
  "create:budget", "read:budget", "update:budget", "approve:budget",
  "approve:annual_budget", "read:annual_budget", "read:department_budget", "update:department_budget",
  "create:expense", "read:expense", "update:expense", "approve:expense",
  "create:offering", "read:offering", "update:offering",
  "read:ledger", "read:department_ledger", "read:financial_reports", "create:financial_reports", "read:financial_dashboard",
];

const GOVERNANCE_PERMISSION_KEYS = [
  "read:users", "create:users", "update:users", "delete:users",
  "read:roles", "create:roles", "update:roles", "delete:roles",
  "read:permissions", "create:permissions", "update:permissions", "delete:permissions",
];

/**
 * Fetch a user's permission keys based on their role assignments.
 *
 * The query returns `roles(name)` for the user's active role rows,
 * then maps role names to permission keys using the constant maps above.
 */
const fetchPermissionKeysForUser = async (userId: string) => {
  const { data: userRoleRows, error } = await supabase
    .from("user_roles")
    .select("role_id,roles(name)")
    .eq("user_id", userId) as { data: any[] | null; error: any };

  if (error) {
    return { keys: new Set<string>(), isAdmin: false, error };
  }

  const roles = (userRoleRows ?? []).map((r: any) => r.roles?.name);
  const isAdmin = roles.some(role => role === "superadmin");

  const allKeys = new Set<string>();
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    for (const perm of perms) {
      allKeys.add(perm);
    }
  }

  return { keys: allKeys, isAdmin, error: null };
};

/**
 * Route guard for Governance portal pages.
 * - Allows if user has any governance keys OR is an admin.
 */
function GovernanceRouteGuard({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setAllowed(false);
      return;
    }

    (async () => {
      const { keys, isAdmin } = await fetchPermissionKeysForUser(session.user.id);
      const hasAccess = isAdmin || GOVERNANCE_PERMISSION_KEYS.some((key) => keys.has(key));
      setAllowed(hasAccess);
    })();
  }, [session?.user?.id]);

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center space-y-3">
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            Governance access could not be verified for this account.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return children;
}

/**
 * Route guard for Treasury portal pages.
 * - Allows if user has any treasury keys OR is an admin.
 */
function TreasuryRouteGuard({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setAllowed(false);
      return;
    }

    (async () => {
      const { keys, isAdmin } = await fetchPermissionKeysForUser(session.user.id);
      const hasAccess = isAdmin || TREASURY_PERMISSION_KEYS.some((key) => keys.has(key));
      setAllowed(hasAccess);
    })();
  }, [session?.user?.id]);

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center space-y-3">
          <h2 className="text-xl font-semibold">Treasury access pending</h2>
          <p className="text-sm text-muted-foreground">
            Treasury access could not be confirmed yet. Use retry instead of reopening the portal repeatedly.
          </p>
          <button
            type="button"
            onClick={() => { setAllowed(null); setTimeout(() => { setAllowed(false); }, 100); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry Access Check
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function GlobalAdminRouteGuard({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setAllowed(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role_id, roles(name)")
        .eq("user_id", session.user.id) as { data: any[] | null };

      const roleNames = (data ?? []).map((r: any) => String(r.roles?.name || "").toLowerCase());
      const isGlobalSuperAdmin = roleNames.some((name) =>
        ["superadmin", "super admin", "system admin", "admin"].includes(name)
      );
      setAllowed(isGlobalSuperAdmin);
    })();
  }, [session?.user?.id]);

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Checking global admin access...</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center space-y-3">
          <h2 className="text-xl font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground">
            This workspace is reserved for global super administrators.
          </p>
        </div>
      </div>
    );
  }

  return children;
}

type SidebarProfileMode = "member" | "manager";

const getSidebarProfileMode = (): SidebarProfileMode => {
  const saved = localStorage.getItem("sidebar-profile-mode");
  return saved === "manager" ? "manager" : "member";
};

function ManagerViewModeGuard({ children }: { children: JSX.Element }) {
  const [profileMode, setProfileMode] = useState<SidebarProfileMode>(() => getSidebarProfileMode());

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "sidebar-profile-mode") {
        setProfileMode(event.newValue === "manager" ? "manager" : "member");
      }
    };

    const handleProfileModeChanged = (event: Event) => {
      const customEvent = event as CustomEvent<SidebarProfileMode>;
      const nextMode = customEvent.detail;
      setProfileMode(nextMode === "manager" ? "manager" : "member");
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sidebar-profile-mode-changed", handleProfileModeChanged as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sidebar-profile-mode-changed", handleProfileModeChanged as EventListener);
    };
  }, []);

  if (profileMode !== "manager") {
    return <Navigate to="/portal/member/dashboard" replace />;
  }

  return children;
}

/**
 * Global protected routes wrapper.
 *
 * Responsibilities:
 * - Wait for auth session to load
 * - Redirect to `/auth` when not authenticated
 * - Save/restore navigation intent across reloads
 * - Initialize department portal data on first session load
 */
function ProtectedRoutes() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Save current route to localStorage
  useEffect(() => {
    if (!session) return;

    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    if (fullPath.startsWith("/auth") || fullPath.startsWith("/signup")) return;

    localStorage.setItem("glrsdac_last_route", fullPath);
  }, [session, location.pathname, location.search, location.hash]);

  // Restore last route on session load (only at root)
  useEffect(() => {
    if (!session?.user?.id) return;

    initializePortalDepartments();

    if (location.pathname === "/" || location.pathname === "") {
      const savedRoute = localStorage.getItem("glrsdac_last_route");
      if (savedRoute && savedRoute !== "/" && savedRoute !== "") {
        navigate(savedRoute, { replace: true });
      }
    }
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/auth" replace state={{ from }} />;
  }

  return <AppLayout />;
}

// App root: provides React Query + router + portal routing tree.
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DebugBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/members" element={<ManagerViewModeGuard><Members /></ManagerViewModeGuard>} />
            <Route path="/funds" element={<ManagerViewModeGuard><Funds /></ManagerViewModeGuard>} />
            <Route path="/contributions" element={<ManagerViewModeGuard><Contributions /></ManagerViewModeGuard>} />
            <Route path="/departments" element={<ManagerViewModeGuard><Departments /></ManagerViewModeGuard>} />
            <Route path="/department-groups" element={<ManagerViewModeGuard><GovernanceRouteGuard><DepartmentGroups /></GovernanceRouteGuard></ManagerViewModeGuard>} />
            <Route path="/sabbath" element={<ManagerViewModeGuard><SabbathSessions /></ManagerViewModeGuard>} />
            <Route path="/bank-accounts" element={<ManagerViewModeGuard><BankAccounts /></ManagerViewModeGuard>} />
            <Route path="/imprest" element={<ManagerViewModeGuard><Imprest /></ManagerViewModeGuard>} />
            <Route path="/users" element={<ManagerViewModeGuard><GovernanceRouteGuard><Users /></GovernanceRouteGuard></ManagerViewModeGuard>} />
            <Route path="/roles-permissions" element={<ManagerViewModeGuard><GovernanceRouteGuard><RolesPermissions /></GovernanceRouteGuard></ManagerViewModeGuard>} />
            <Route path="/organizations" element={<ManagerViewModeGuard><GovernanceRouteGuard><Organizations /></GovernanceRouteGuard></ManagerViewModeGuard>} />
            <Route path="/global-analytics" element={<ManagerViewModeGuard><GlobalAdminRouteGuard><GlobalAnalytics /></GlobalAdminRouteGuard></ManagerViewModeGuard>} />
            <Route path="/database-sync" element={<ManagerViewModeGuard><GovernanceRouteGuard><DatabaseSync /></GovernanceRouteGuard></ManagerViewModeGuard>} />
            <Route path="/global-admin" element={<ManagerViewModeGuard><GlobalAdminRouteGuard><GlobalAdmin /></GlobalAdminRouteGuard></ManagerViewModeGuard>} />
            <Route path="/expenses" element={<ManagerViewModeGuard><Expenses /></ManagerViewModeGuard>} />
            <Route path="/cheques" element={<ManagerViewModeGuard><Cheques /></ManagerViewModeGuard>} />
            <Route path="/payments" element={<ManagerViewModeGuard><Payments /></ManagerViewModeGuard>} />
            <Route path="/automated-returns" element={<ManagerViewModeGuard><AutomatedReturns /></ManagerViewModeGuard>} />
            <Route path="/statements" element={<ManagerViewModeGuard><Statements /></ManagerViewModeGuard>} />
            <Route path="/department-portal" element={<ManagerViewModeGuard><DepartmentPortal /></ManagerViewModeGuard>} />
            <Route path="/department-sharepoint" element={<ManagerViewModeGuard><DepartmentSharePoint /></ManagerViewModeGuard>} />
            <Route path="/dayborn-contributions" element={<ManagerViewModeGuard><DaybornContributions /></ManagerViewModeGuard>} />
            <Route path="/my-dues" element={<MyDues />} />
            <Route path="/my-contributions" element={<MemberContributions />} />
            <Route path="/my-statements" element={<MemberStatements />} />
            <Route path="/church-updates" element={<MemberUpdates />} />
            <Route path="/calendar" element={<MemberCalendar />} />
            <Route path="/account-settings" element={<AccountSettings />} />
            
            <Route path="/admin-logs" element={<ManagerViewModeGuard><GovernanceRouteGuard><AdminLogs /></GovernanceRouteGuard></ManagerViewModeGuard>} />

            <Route path="/portal/governance" element={<ManagerViewModeGuard><GovernanceRouteGuard><GovernancePortalSection /></GovernanceRouteGuard></ManagerViewModeGuard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<GovernanceDashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="department-groups" element={<DepartmentGroups />} />
              <Route path="roles-permissions" element={<RolesPermissions />} />
              <Route path="admin-logs" element={<AdminLogs />} />
            </Route>

            <Route path="/portal/treasury" element={<ManagerViewModeGuard><TreasuryRouteGuard><TreasuryPortalSection /></TreasuryRouteGuard></ManagerViewModeGuard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<TreasuryDashboard />} />
              <Route path="funds" element={<Funds />} />
              <Route path="contributions" element={<Contributions />} />
              <Route path="sabbath" element={<SabbathSessions />} />
              <Route path="dayborn-contributions" element={<DaybornContributions />} />
              <Route path="bank-accounts" element={<BankAccounts />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="payments" element={<Payments />} />
              <Route path="automated-returns" element={<AutomatedReturns />} />
              <Route path="cheques" element={<Cheques />} />
              <Route path="imprest" element={<Imprest />} />
              <Route path="statements" element={<Statements />} />
            </Route>

            <Route path="/portal/clerk" element={<ManagerViewModeGuard><ClerkPortalSection /></ManagerViewModeGuard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ClerkPortal initialTab="dashboard" />} />
              <Route path="registry" element={<ClerkPortal initialTab="registry" />} />
              <Route path="records" element={<ClerkPortal initialTab="records" />} />
              <Route path="calendar" element={<ClerkPortal initialTab="calendar" />} />
              <Route path="reports" element={<ClerkPortal initialTab="reports" />} />
            </Route>

            <Route path="/portal/department" element={<ManagerViewModeGuard><DepartmentPortalSection /></ManagerViewModeGuard>}>
              <Route index element={<Navigate to="department-portal" replace />} />
              <Route path="dashboard" element={<DepartmentDashboard />} />
              <Route path="department-portal" element={<DepartmentPortal />} />
              <Route path="departments" element={<Departments />} />
              <Route path="department-sharepoint" element={<DepartmentSharePoint />} />
              <Route path="music" element={<MusicDepartmentPortal />} />
            </Route>

            <Route path="/portal/member" element={<MemberPortalSection />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Navigate to="/" replace />} />
              <Route path="my-contributions" element={<MemberContributions />} />
              <Route path="my-dues" element={<MyDues />} />
              <Route path="my-statements" element={<MemberStatements />} />
              <Route path="clerk-services" element={<MemberClerkView />} />
              <Route path="church-updates" element={<MemberUpdates />} />
              <Route path="calendar" element={<MemberCalendar />} />
              <Route path="sabbath-lessons" element={<MemberSabbathLessons />} />
              <Route path="choir" element={<MemberChoirView />} />
              <Route path="account-settings" element={<AccountSettings />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
