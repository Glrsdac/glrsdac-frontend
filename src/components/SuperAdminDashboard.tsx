import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Building2, Receipt, TrendingUp, Shield } from "lucide-react";

export function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    churches: 0,
    users: 0,
    admins: 0,
    totalContributions: 0,
    auditLogs: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const [{ count: churchCount }, { count: userCount }, { data: adminUsers }, { data: contribs }, { count: auditCount }] = await Promise.all([
        supabase.from("churches").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id, roles(name)").in("roles.name", ["SuperAdmin", "superadmin", "super admin", "system admin", "System Admin"]).returns<any[]>(),
        supabase.from("contributions").select("amount"),
        supabase.from("audit_logs").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        churches: churchCount || 0,
        users: userCount || 0,
        admins: (adminUsers ?? []).length,
        totalContributions: (contribs ?? []).reduce((sum, c) => sum + Number(c.amount || 0), 0),
        auditLogs: auditCount || 0,
      });
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <h1 className="text-3xl font-bold mb-4">Super Admin Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Churches</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.churches}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Users</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.users}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Admins</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.admins}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Total Giving</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">GH₵ {stats.totalContributions.toLocaleString("en-GH", { minimumFractionDigits: 2 })}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Audit Logs</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.auditLogs}</CardContent>
        </Card>
      </div>
      {/* Add more global management widgets here as needed */}
    </div>
  );
}
