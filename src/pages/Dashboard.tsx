import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { StatCard } from "@/components/StatCard";
import {
  Users, Wallet, Calendar, BookOpen, Heart,
  Bell, ChevronRight, Clock, Gift, TrendingUp, Music, Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { SuperAdminDashboard } from "@/components/SuperAdminDashboard";

/**
 * Member Dashboard (root: "/")
 *
 * Purpose:
 * - Show an immediate "spiritual + admin + participation overview" after login.
 * - Provides at-a-glance stats + key cards (Announcements, Recent Giving, Upcoming Events, Birthdays, Quick Links).
 *
 * Data sources:
 * - Supabase tables: `members`, `user_roles`, `announcements`, `events`, `contributions`
 *
 * Notes:
 * - This page is used by both the root route `/` and the member portal redirect.
 * - Real-time refresh is controlled by `useRealtimeRefresh` (currently contributions + announcements).
 */
const formatCurrency = (n: number) => `GH₵ ${n.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

/**
 * Simple greeting based on local time.
 * Keep logic deterministic (no external deps) so it renders consistently for a given device.
 */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

/** Human-readable date for the welcome header. */
const getTodayFormatted = () =>
  new Date().toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const Dashboard = () => {
  const { user } = useAuth();

  // Member-specific profile (name/initials/member number)
  const [memberProfile, setMemberProfile] = useState<any>(null);

  // Header/quick stats totals (kept as numbers for easy reuse in cards)
  const [stats, setStats] = useState({ members: 0, contributions: 0, events: 0 });

  // Cards: announcements + upcoming events + birthdays + recent giving lines
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [recentContributions, setRecentContributions] = useState<any[]>([]);

  // RBAC role names (used to show role chips + decide whether to include admin links)
  const [userRoles, setUserRoles] = useState<string[]>([]);

  /**
   * Fetch all dashboard data in one go.
   * - This runs on login (when `user?.id` becomes available).
   * - It also runs when `useRealtimeRefresh` triggers a refresh.
   */
  const fetchData = useCallback(async () => {
    // Guard: without a logged-in user there is nothing to personalize.
    if (!user?.id) return;

    // Fetch independent dashboard datasets concurrently to reduce latency.
    const [
      { data: memberRow },
      { data: roleRows },
      { data: announceRows },
      { data: eventRows },
      { count: memberCount },
    ] = await Promise.all([
      supabase.from("members").select("id, first_name, last_name, member_no, dob, email, phone").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role_id, roles(name)").eq("user_id", user.id) as any,
      supabase.from("announcements").select("id, title, message, published_at").order("published_at", { ascending: false }).limit(5),
      supabase.from("events").select("id, name, start_date, description").gte("start_date", new Date().toISOString()).order("start_date").limit(5),
      supabase.from("members").select("*", { count: "exact", head: true }),
    ]);

    // If we have the member row, build the header profile object.
    if (memberRow) {
      setMemberProfile({
        name: `${memberRow.first_name || ""} ${memberRow.last_name || ""}`.trim(),
        memberNo: memberRow.member_no,
        initials: `${(memberRow.first_name || "")[0] || ""}${(memberRow.last_name || "")[0] || ""}`.toUpperCase(),
      });
    }

    // Extract and normalize role names for display and access branching.
    const roles = ((roleRows as any[]) ?? []).map((r: any) => r.roles?.name).filter(Boolean);
    setUserRoles(roles);

    // Quick stats totals used in the top cards.
    setStats((p) => ({ ...p, members: memberCount || 0, events: eventRows?.length || 0 }));

    // Announcement card mapping: convert DB timestamps to display strings.
    setAnnouncements((announceRows ?? []).map((a: any) => ({
      id: a.id, title: a.title || "Untitled", message: a.message || "",
      date: a.published_at ? new Date(a.published_at).toLocaleDateString("en-GH", { month: "short", day: "numeric" }) : "",
    })));

    // Upcoming events mapping.
    setUpcomingEvents((eventRows ?? []).map((e: any) => ({
      id: e.id, title: e.title || "Event",
      date: e.start_date ? new Date(e.start_date).toLocaleDateString("en-GH", { weekday: "short", month: "short", day: "numeric" }) : "",
      description: e.description || "",
    })));

    // Member-dependent contribution summary.
    if (memberRow?.id) {
      // Recent contribution lines for the "Recent Giving" card.
      const { data: contribs } = await supabase
        .from("contributions").select("id, amount, service_date, funds(name)")
        .eq("member_id", memberRow.id).order("service_date", { ascending: false }).limit(5) as any;

      // Total of recent (not all-time) contributions used as a quick display number.
      const total = (contribs ?? []).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
      setStats((p) => ({ ...p, contributions: total }));
      setRecentContributions((contribs ?? []).map((c: any) => ({
        id: c.id, fund: c.funds?.name || "General", amount: Number(c.amount || 0),
        date: c.service_date ? new Date(c.service_date).toLocaleDateString("en-GH", { month: "short", day: "numeric" }) : "",
      })));
    }

    // Birthdays within the next 7 days (based on member `dob` day/month, ignoring year).
    const today = new Date();
    const todayMD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
    const weekEndMD = `${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;
    const { data: bdayRows } = await supabase.from("members").select("first_name, last_name, dob").not("dob", "is", null).limit(100);
    const birthdayMembers = (bdayRows ?? []).filter((m: any) => {
      if (!m.dob) return false;
      const d = new Date(m.dob);
      const md = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return md >= todayMD && md <= weekEndMD;
    }).slice(0, 5);
    setBirthdays(birthdayMembers.map((m: any) => ({
      name: `${m.first_name || ""} ${m.last_name || ""}`.trim(),
      date: m.dob,
      initials: `${(m.first_name || "")[0] || ""}${(m.last_name || "")[0] || ""}`.toUpperCase(),
    })));
  }, [user?.id]);

  // Load dashboard data as soon as the authenticated user is known.
  useEffect(() => { fetchData(); }, [fetchData]);

  // Optional auto-refresh:
  // - Schedules refresh when relevant tables are updated.
  // - Keeps the dashboard "fresh" without forcing manual refresh.
  useRealtimeRefresh({
    channelName: "dashboard-rt",
    subscriptions: [{ table: "contributions" }, { table: "announcements" }],
    onRefresh: fetchData,
    mode: "auto",
  });

  // Elevated role detection:
  const isSuperAdmin = userRoles.some(r =>
    ["SuperAdmin", "superadmin", "super admin", "system admin", "System Admin"].includes(r.trim())
  );

  // If superadmin, do not fetch or render member dashboard data
  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  const displayName = memberProfile?.name || user?.email?.split("@")[0] || "Member";

  // RBAC: Check for admin access (non-superadmin admins get Quick Links)
  const isAdmin = userRoles.some(r => {
    const role = r.trim().toLowerCase();
    return ["admin", "church admin", "system admin"].includes(role);
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 sm:p-8 text-primary-foreground">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-foreground/15 border border-primary-foreground/20 flex items-center justify-center text-lg sm:text-xl font-bold font-heading backdrop-blur-sm">
              {memberProfile?.initials || displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-primary-foreground/70 text-sm font-medium">{getGreeting()}</p>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold leading-tight">{displayName}</h1>
              <p className="text-primary-foreground/60 text-xs sm:text-sm mt-0.5">{getTodayFormatted()}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {userRoles.length > 0
                  ? [...new Set(userRoles.slice(0, 3))].map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-foreground/15 text-primary-foreground/90">
                        <Shield className="w-2.5 h-2.5" /> {r}
                      </span>
                    ))
                  : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-foreground/15 text-primary-foreground/90">
                        <Shield className="w-2.5 h-2.5" /> Member
                      </span>
                    )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild className="bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground border-0">
              <Link to="/portal/member/account-settings" className="flex items-center gap-2">
                <Bell className="w-4 h-4" /> Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Total Members" value={stats.members} icon={Users} description="Church membership" />
        <StatCard title="My Giving" value={formatCurrency(stats.contributions)} icon={TrendingUp} description="Your contributions" />
        <StatCard title="Upcoming" value={stats.events} icon={Calendar} description="Events scheduled" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Announcements */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-accent" />
                </div>
                Announcements
              </CardTitle>
              <Badge variant="outline" className="text-xs font-medium">{announcements.length}</Badge>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent announcements</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {announcements.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group">
                      <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0 group-hover:scale-125 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground">{a.title}</p>
                        {a.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.message}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 bg-muted px-2 py-0.5 rounded-full">{a.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Contributions */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                </div>
                Recent Giving
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/portal/member/my-contributions" className="text-xs flex items-center gap-1 text-primary">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentContributions.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No contributions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentContributions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.fund}</p>
                          <p className="text-[10px] text-muted-foreground">{c.date}</p>
                        </div>
                      </div>
                      <span className="font-heading font-bold text-sm text-foreground">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Sidebar */}
        <div className="space-y-4 sm:space-y-5">
          {/* Upcoming Events */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-info/10 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-info" />
                </div>
                Upcoming
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/portal/member/calendar" className="text-xs flex items-center gap-1 text-primary">
                  Calendar <ChevronRight className="w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 group">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-info/10 to-info/5 flex items-center justify-center flex-shrink-0 group-hover:from-info/15 transition-colors">
                        <Calendar className="w-4.5 h-4.5 text-info" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <p className="text-[11px] text-muted-foreground">{e.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Birthdays */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Gift className="w-3.5 h-3.5 text-accent" />
                </div>
                Birthdays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {birthdays.length === 0 ? (
                <div className="text-center py-6">
                  <Gift className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No birthdays this week</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {birthdays.map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-xs font-bold text-accent">
                        {b.initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.date ? new Date(b.date).toLocaleDateString("en-GH", { month: "short", day: "numeric" }) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                </div>
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { to: "/portal/member/my-contributions", icon: Wallet, label: "My Contributions" },
                { to: "/portal/member/my-statements", icon: TrendingUp, label: "My Statements" },
                { to: "/portal/member/sabbath-lessons", icon: BookOpen, label: "Sabbath School" },
                { to: "/portal/member/church-updates", icon: Heart, label: "Church Updates" },
              ].map(link => (
                <Button key={link.to} variant="ghost" size="sm" className="w-full justify-start text-sm h-9 hover:bg-muted/60" asChild>
                  <Link to={link.to}><link.icon className="w-4 h-4 mr-2.5 text-muted-foreground" /> {link.label}</Link>
                </Button>
              ))}
              {isAdmin && (
                <>
                  <div className="border-t my-2" />
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-9 text-primary hover:bg-primary/5" asChild>
                    <Link to="/portal/governance/dashboard"><Shield className="w-4 h-4 mr-2.5" /> Admin Panel</Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sm h-9 text-primary hover:bg-primary/5" asChild>
                    <Link to="/portal/treasury/dashboard"><Wallet className="w-4 h-4 mr-2.5" /> Treasury</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
