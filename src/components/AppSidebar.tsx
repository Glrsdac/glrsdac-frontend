import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { isRouteActive } from "@/lib/routeMatching";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Wallet, LogOut, ChevronLeft, ChevronRight, Shield,
  Receipt, Briefcase, ChevronDown, Search, Building2, Settings, Calendar,
  BookOpen, Music, Database, Share2, FileText, CreditCard, PiggyBank, Heart,
  TrendingUp, UserCheck, Globe, RefreshCw, Bug,
} from "lucide-react";
import { ChurchSwitcher } from "@/components/ChurchSwitcher";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type PortalKey = "treasury" | "clerk" | "department" | "member";
type NavItem = { to: string; label: string; icon: any; portals?: PortalKey[]; requiredRoles?: string[]; alwaysVisible?: boolean };
type NavCategory = { category: string; icon: any; items: NavItem[]; defaultExpanded?: boolean };
type ProfileMode = "member" | "manager";
type ProfileItem = { departmentId: string; departmentName: string; roleLabel: string };

const navCategories: NavCategory[] = [
  {
    category: "Overview",
    icon: LayoutDashboard,
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, alwaysVisible: true }],
    defaultExpanded: true,
  },
  {
    category: "Portals",
    icon: Briefcase,
    items: [
      { to: "/portal/member/dashboard", label: "Member Portal", icon: Users, portals: ["member"] },
      { to: "/portal/treasury/dashboard", label: "Treasury", icon: Wallet, requiredRoles: ["superadmin", "treasurer"] },
      { to: "/portal/clerk/dashboard", label: "Clerk Office", icon: UserCheck, requiredRoles: ["superadmin", "clerk"] },
      { to: "/portal/governance/dashboard", label: "Governance", icon: Shield, requiredRoles: ["superadmin"] },
    ],
    defaultExpanded: true,
  },
  {
    category: "Administration",
    icon: Shield,
    items: [
      { to: "/users", label: "Users", icon: Users, requiredRoles: ["superadmin", "church admin"] },
      { to: "/members", label: "Members", icon: Users, requiredRoles: ["superadmin", "clerk", "church admin"] },
      { to: "/departments", label: "Departments", icon: Building2, requiredRoles: ["superadmin", "church admin"] },
      { to: "/department-groups", label: "Dept Groups", icon: Users, requiredRoles: ["superadmin", "church admin"] },
      { to: "/roles-permissions", label: "Roles", icon: Settings, requiredRoles: ["superadmin", "church admin"] },
      { to: "/organizations", label: "Organizations", icon: Building2, requiredRoles: ["superadmin"], alwaysVisible: false },
      { to: "/global-analytics", label: "Analytics", icon: TrendingUp, requiredRoles: ["superadmin", "church admin"] },
      { to: "/global-admin", label: "Global Admin", icon: Globe, requiredRoles: ["superadmin"], alwaysVisible: false },
      { to: "/admin-logs", label: "Audit Logs", icon: Receipt, requiredRoles: ["superadmin", "church admin"] },
      { to: "/database-sync", label: "DB Sync", icon: Database, requiredRoles: ["superadmin"], alwaysVisible: false },
    ],
    defaultExpanded: false,
  },
  {
    category: "Finance",
    icon: Wallet,
    items: [
      { to: "/funds", label: "Funds", icon: PiggyBank, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
      { to: "/contributions", label: "Contributions", icon: Receipt, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
      { to: "/expenses", label: "Expenses", icon: CreditCard, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
      { to: "/payments", label: "Payments", icon: Wallet, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
      { to: "/bank-accounts", label: "Bank Accounts", icon: Building2, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
      { to: "/cheques", label: "Cheques", icon: FileText, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
      { to: "/imprest", label: "Imprest", icon: Briefcase, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
      { to: "/statements", label: "Statements", icon: TrendingUp, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
      { to: "/automated-returns", label: "Returns", icon: Receipt, requiredRoles: ["ADMIN", "TREASURER", "System Admin", "church admin"] },
    ],
    defaultExpanded: false,
  },
];

const memberViews: NavItem[] = [
  { to: "/portal/member/calendar", label: "Calendar", icon: Calendar, alwaysVisible: true },
  { to: "/portal/member/sabbath-lessons", label: "Sabbath School", icon: BookOpen, alwaysVisible: true },
  { to: "/portal/member/church-updates", label: "Announcements", icon: Heart, alwaysVisible: true },
  { to: "/portal/member/my-contributions", label: "My Giving", icon: Wallet, alwaysVisible: true },
  { to: "/portal/member/my-dues", label: "My Dues", icon: Receipt, alwaysVisible: true },
  { to: "/portal/member/my-statements", label: "My Statements", icon: TrendingUp, alwaysVisible: true },
  { to: "/portal/member/account-settings", label: "Settings", icon: Settings, alwaysVisible: true },
];

export function AppSidebar({ className, mobile = false, onNavigate }: { className?: string; mobile?: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChoirMember, setIsChoirMember] = useState(false);
  const [hasDepartmentMembership, setHasDepartmentMembership] = useState(false);
  const [dynamicPortals, setDynamicPortals] = useState<NavItem[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<ProfileItem[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const [profileMode, setProfileMode] = useState<ProfileMode>(() => {
    const saved = localStorage.getItem("sidebar-profile-mode");
    return saved === "member" || saved === "manager" ? saved : "member";
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(navCategories.filter((c) => c.defaultExpanded).map((c) => c.category))
  );

  useEffect(() => { localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed)); }, [collapsed]);
  useEffect(() => {
    localStorage.setItem("sidebar-profile-mode", profileMode);
    window.dispatchEvent(new CustomEvent("sidebar-profile-mode-changed", { detail: profileMode }));
  }, [profileMode]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-expanded-categories");
    if (saved) setExpandedCategories(new Set(JSON.parse(saved)));
  }, []);

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setExpandedCategories(next);
    localStorage.setItem("sidebar-expanded-categories", JSON.stringify([...next]));
  };

  // Fetch roles
  const fetchUserRoles = async () => {
    if (!user?.id) { setUserRoles([]); setIsAdmin(false); return; }

    let roles: string[] = [];

    // Attempt 1: modern schema with relation expansion.
    const modern = await (supabase
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("user_id", user.id)
      .eq("is_active", true) as any);
    if (!modern.error && modern.data) {
      roles = (modern.data ?? []).map((r: any) => r.roles?.name).filter(Boolean);
    }

    // Attempt 2: If relation failed or no roles, get role_ids and fetch names separately
    if (roles.length === 0) {
      const { data: userRoleData } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", user.id)
        .eq("is_active", true);
      const roleIds = (userRoleData ?? []).map((ur: any) => ur.role_id).filter(Boolean);
      if (roleIds.length > 0) {
        const { data: roleRows } = await supabase
          .from("roles")
          .select("id, name")
          .in("id", roleIds);
        const roleNameMap = new Map((roleRows ?? []).map((row: any) => [row.id, row.name]));
        roles = roleIds.map((id: string) => roleNameMap.get(id)).filter(Boolean);
      }
    }

    // Attempt 2: fallback to auth metadata if role tables are inaccessible/empty.
    if (roles.length === 0) {
      const { data: authData } = await supabase.auth.getUser();
      const metadata = authData?.user?.app_metadata ?? {};
      const metaRole = String(
        metadata.role ?? metadata.user_role ?? metadata.userType ?? ""
      ).trim();
      if (metaRole) {
        roles = [metaRole];
      }
    }

    console.log("Fetched user roles:", roles);
    setUserRoles(roles);
    const normalized = new Set(
      roles.map((role: string) => String(role || "").trim().toLowerCase())
    );
    setIsAdmin(
      ["system admin", "admin", "church admin", "superadmin", "super admin"].some((name) => normalized.has(name))
    );
  };

  useEffect(() => {
    fetchUserRoles();
  }, [user?.id]);

  // Fetch department memberships (only for non-superadmin users)
  useEffect(() => {
    if (!user?.id || isSuperAdmin) { 
      setHasDepartmentMembership(false); 
      setMemberProfiles([]); 
      setIsChoirMember(false); 
      return; 
    }
    (async () => {
      const { data: memberRow } = await supabase.from("members").select("id").eq("user_id", user.id).maybeSingle();
      if (!memberRow?.id) { setHasDepartmentMembership(false); setMemberProfiles([]); setIsChoirMember(false); return; }

      const { data: choirRows } = await (supabase.from("choir_members" as any).select("id").eq("member_id", memberRow.id).eq("is_active", true).limit(1) as any);
      setIsChoirMember((choirRows ?? []).length > 0);

      const { data: deptMemberships } = await supabase.from("department_members").select("department_id, assigned_role").eq("member_id", memberRow.id);
      const memberships = deptMemberships ?? [];
      setHasDepartmentMembership(memberships.length > 0);

      if (memberships.length > 0) {
        const deptIds = memberships.map((dm) => dm.department_id);
        const { data: departments } = await supabase.from("departments").select("id, name").in("id", deptIds);
        const deptMap = new Map((departments ?? []).map((d) => [d.id, d.name]));
        setMemberProfiles(memberships.map((dm) => ({
          departmentId: String(dm.department_id), departmentName: deptMap.get(dm.department_id) || "Department", roleLabel: dm.assigned_role || "Member",
        })));
      }
    })();
  }, [user?.id]);

  // Build dynamic department portals (superadmins see all, others see their memberships)
  useEffect(() => {
    if (!user?.id || profileMode !== "manager") { setDynamicPortals([]); return; }
    (async () => {
      // If superadmin, show all departments
      const departmentsQuery = supabase.from("departments").select("id, name, is_active").order("name");
      const { data: departments } = await departmentsQuery;
      const memberDeptIds = new Set(memberProfiles.map((p) => p.departmentId));
      const skip = new Set(["member", "governance", "member services"]);
      const visible = (departments ?? []).filter((d) => {
        const name = d.name.toLowerCase().trim();
        if (skip.has(name)) return false;
        if (isSuperAdmin) return true; // Superadmins see all departments
        return memberDeptIds.has(String(d.id)); // Members see only their departments
      });
      setDynamicPortals(visible.map((d) => {
        const isMusic = d.name.toLowerCase().trim() === "music";
        return {
          to: isMusic ? "/portal/department/music" : `/portal/department/department-portal?department=${encodeURIComponent(d.id)}`,
          label: d.name, icon: isMusic ? Music : Briefcase, portals: ["department" as PortalKey], alwaysVisible: true,
        };
      }));
    })();
  }, [user?.id, profileMode, memberProfiles]);

  const normalizedUserRoles = useMemo(() => userRoles.map((role) => String(role || "").trim().toLowerCase()), [userRoles]);
  const hasRole = useMemo(() => (r: string) => normalizedUserRoles.includes(String(r || "").trim().toLowerCase()), [normalizedUserRoles]);
  const isManagerRole = useMemo(
    () =>
      normalizedUserRoles.some((r) =>
        ["admin", "church admin", "treasurer", "clerk", "system admin", "system_admin", "super admin", "superadmin", "super_admin"].includes(r)
      ),
    [normalizedUserRoles]
  );
  const isSuperAdmin = useMemo(
    () =>
      normalizedUserRoles.some((r) =>
        ["super admin", "superadmin", "super_admin", "system admin", "system_admin", "admin"].includes(r)
      ),
    [normalizedUserRoles]
  );
  const hasManagerOption = useMemo(() => isManagerRole || hasDepartmentMembership || isSuperAdmin, [isManagerRole, hasDepartmentMembership, isSuperAdmin]);

  const portalVisibility: Record<PortalKey, boolean> = {
    treasury: hasRole("ADMIN") || hasRole("TREASURER") || isSuperAdmin,
    clerk: hasRole("ADMIN") || hasRole("CLERK") || isSuperAdmin,
    department: isAdmin || hasDepartmentMembership || isSuperAdmin,
    member: true,
  };

  const canAccess = (item: NavItem) => {
    // Only show certain tabs for superadmin
    if (["/organizations", "/global-admin", "/database-sync"].includes(item.to)) {
      return isSuperAdmin;
    }
    if (item.alwaysVisible) return true;

    // Always allow department portals in manager view
    if (profileMode === "manager" && item.portals?.includes("department")) return true;

    if (item.portals?.length && !item.portals.some((p) => portalVisibility[p])) return false;

    // Strictly match normalized requiredRoles to normalized user roles
    if (item.requiredRoles?.length) {
      const normalizedRequired = item.requiredRoles.map(r => String(r).trim().toLowerCase());
      if (!normalizedUserRoles.some(r => normalizedRequired.includes(r))) return false;
    }
    return true;
  };

  useEffect(() => {
    if (profileMode === "manager" && !hasManagerOption) setProfileMode("member");
  }, [profileMode, hasManagerOption]);

  const getCategories = () => {
    const choirItem: NavItem[] = isChoirMember || isAdmin ? [{ to: "/portal/member/choir", label: "Choir", icon: Music, alwaysVisible: true }] : [];

    const cats = navCategories.map((cat) => {
      if (profileMode === "member" && ["Administration", "Finance"].includes(cat.category)) return { ...cat, items: [] };

      let items = cat.items;
      if (cat.category === "Portals") {
        if (profileMode === "member") {
          items = [...memberViews, ...choirItem];
        } else {
          // Manager view: add department portals dynamically
          items = [
            ...cat.items.filter((i) => {
              if (i.to.includes("/portal/member")) return false;
              if (i.to.includes("/portal/governance") && !isAdmin) return false;
              return true;
            }),
            ...dynamicPortals
          ];
        }
      }
      return { ...cat, items: items.filter(canAccess) };
    }).filter((c) => {
      if (c.category === "Administration" && !isAdmin) return false;
      return c.items.length > 0;
    });

    if (!searchQuery) return cats;
    return cats.map((c) => ({ ...c, items: c.items.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase())) })).filter((c) => c.items.length > 0);
  };

  const categories = getCategories();

  return (
    <aside className={cn(
      "bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border",
      mobile ? "h-full w-full" : "h-screen sticky top-0",
      mobile ? "w-full" : collapsed ? "w-[68px]" : "w-64",
      className
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0">
        <img src="/glrsdac_logo_icon_only.png" alt="GLRSDAC" className="h-8 w-8 object-contain flex-shrink-0 brightness-0 invert" />
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-heading text-base font-semibold block leading-tight">GLRSDAC</span>
            <span className="text-[10px] text-sidebar-foreground/50 leading-none">Church Management</span>
          </div>
        )}
      </div>

      {/* Profile mode & search */}
      {!collapsed && (
        <div className="px-3 py-2.5 border-b border-sidebar-border space-y-2">
          <Select
            value={profileMode}
            onValueChange={(v) => {
              const next = v as ProfileMode;
              if (next === "manager" && !hasManagerOption) return;
              setProfileMode(next);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">👤 Member View</SelectItem>
              {hasManagerOption && <SelectItem value="manager">🔧 Manager View</SelectItem>}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-sidebar-foreground/40" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-7 text-xs bg-sidebar-accent/20 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-sidebar-accent/20 hover:bg-sidebar-accent/30 rounded border border-sidebar-border text-sidebar-foreground"
            >
              <Bug className="w-3 h-3" />
              Debug
            </button>
            <button
              onClick={fetchUserRoles}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-sidebar-accent/20 hover:bg-sidebar-accent/30 rounded border border-sidebar-border text-sidebar-foreground"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh Roles
            </button>
          </div>
          {showDebug && (
            <div className="text-xs bg-sidebar-accent/10 p-2 rounded border border-sidebar-border space-y-1">
              <div><strong>User ID:</strong> {user?.id || 'None'}</div>
              <div><strong>Raw Roles:</strong> [{userRoles.join(', ')}]</div>
              <div><strong>Normalized Roles:</strong> [{normalizedUserRoles.join(', ')}]</div>
              <div><strong>isSuperAdmin:</strong> {isSuperAdmin ? '✅' : '❌'}</div>
              <div><strong>isManagerRole:</strong> {isManagerRole ? '✅' : '❌'}</div>
              <div><strong>hasDepartmentMembership:</strong> {hasDepartmentMembership ? '✅' : '❌'}</div>
              <div><strong>hasManagerOption:</strong> {hasManagerOption ? '✅' : '❌'}</div>
              <div><strong>Profile Mode:</strong> {profileMode}</div>
              {!hasManagerOption && (
                <div className="text-red-400">
                  <strong>Manager View Disabled:</strong> No admin roles, department memberships, or superadmin privileges detected.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Church Switcher for SuperAdmin */}
      {!collapsed && isSuperAdmin && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <ChurchSwitcher compact={true} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
        {categories.map((cat) => {
          const isExpanded = expandedCategories.has(cat.category);
          const CatIcon = cat.icon;

          return (
            <div key={cat.category} className="mb-1">
              <button
                onClick={() => toggleCategory(cat.category)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-colors",
                  "text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CatIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {!collapsed && <span className="font-semibold uppercase tracking-wider truncate">{cat.category}</span>}
                </div>
                {!collapsed && <ChevronDown className={cn("w-3 h-3 flex-shrink-0 transition-transform", isExpanded && "rotate-180")} />}
              </button>

              {(isExpanded || searchQuery) && (
                <div className="mt-0.5 space-y-px">
                  {cat.items.map((item) => {
                    const active = isRouteActive({ pathname: location.pathname, search: location.search }, item.to);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={`${item.to}-${item.label}`}
                        to={item.to}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] transition-all",
                          collapsed ? "justify-center px-2" : "ml-3",
                          active
                            ? "bg-sidebar-primary/10 text-sidebar-primary font-medium border-l-2 border-sidebar-primary"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground border-l-2 border-transparent"
                        )}
                        title={item.label}
                      >
                        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", active && "text-sidebar-primary")} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {searchQuery && categories.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-sidebar-foreground/40">No pages found</p>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border flex-shrink-0 space-y-0.5">
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 w-full transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
