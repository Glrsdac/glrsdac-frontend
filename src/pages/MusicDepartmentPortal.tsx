import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ChoirPortal from "@/pages/ChoirPortal";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Music, Users, Wallet, Calendar } from "lucide-react";

type DeptMember = {
  id: number;
  assigned_role: string | null;
  member: { first_name: string; last_name: string; member_no: string | null; email: string | null; phone: string | null } | null;
};

type DeptFund = {
  fund_id: number;
  fund_name: string;
};

const MusicDepartmentPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [musicDeptId, setMusicDeptId] = useState<string | null>(null);
  const [members, setMembers] = useState<DeptMember[]>([]);
  const [funds, setFunds] = useState<DeptFund[]>([]);
  const [totalContributions, setTotalContributions] = useState(0);
  const [memberCount, setMemberCount] = useState(0);

  const loadData = useCallback(async () => {
    if (!user || musicDeptId === null) return;
    setLoading(true);
    try {
      const [membersRes, fundsRes] = await Promise.all([
        supabase
          .from("department_members")
          .select("id, assigned_role, members(first_name, last_name, member_no, email, phone)")
          .eq("department_id", musicDeptId as any),
        supabase
          .from("fund_departments")
          .select("fund_id, funds(id, name)")
          .eq("department_id", musicDeptId as any),
      ]);

      const mappedMembers: DeptMember[] = (membersRes.data ?? []).map((dm: any) => ({
        id: dm.id,
        assigned_role: dm.assigned_role,
        member: Array.isArray(dm.members) ? dm.members[0] : dm.members,
      }));
      setMembers(mappedMembers);
      setMemberCount(mappedMembers.length);

      const mappedFunds: DeptFund[] = (fundsRes.data ?? []).map((f: any) => {
        const fund = Array.isArray(f.funds) ? f.funds[0] : f.funds;
        return { fund_id: f.fund_id, fund_name: fund?.name ?? "Unknown" };
      });
      setFunds(mappedFunds);

      // Get total contributions for music-related funds
      if (mappedFunds.length > 0) {
        const fundIds = mappedFunds.map((f) => f.fund_id);
        const { data: contribs } = await supabase
          .from("contributions")
          .select("amount")
          .in("fund_id", fundIds);
        const total = (contribs ?? []).reduce((sum, c) => sum + Number(c.amount), 0);
        setTotalContributions(total);
      }
    } catch (err: any) {
      toast({ title: "Error loading data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, musicDeptId, toast]);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        console.log("[MusicPortal] No user, skipping init");
        return;
      }

      console.log("[MusicPortal] Init starting for user:", user.id);

      // Find Music department
      const { data: dept, error: deptError } = await supabase
        .from("departments")
        .select("id")
        .ilike("name", "Music")
        .eq("is_active", true)
        .maybeSingle();

      console.log("[MusicPortal] Department query result:", { dept, deptError });

      if (!dept) {
        console.log("[MusicPortal] No Music department found");
        setLoading(false);
        return;
      }

      setMusicDeptId(dept.id);

      // Check access
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role_id,roles(name)")
        .eq("user_id", user.id) as { data: any[] | null; error: any };

      console.log("[MusicPortal] Roles query result:", { roles, rolesError });

      const roleList = (roles ?? []).map((r: any) => r.roles?.name);
      const admin = roleList.includes("SuperAdmin");
      setIsAdmin(admin);

      console.log("[MusicPortal] isAdmin:", admin, "roles:", roleList);

      if (admin) {
        setHasAccess(true);
      } else {
        const { data: memberRow } = await supabase
          .from("members")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberRow?.id) {
          const { data: membership } = await supabase
            .from("department_members")
            .select("id")
            .eq("member_id", memberRow.id)
            .eq("department_id", dept.id)
            .maybeSingle();

          setHasAccess(!!membership);
        }
      }

      setLoading(false);
      console.log("[MusicPortal] Init complete, hasAccess will be set");
    };

    init();
  }, [user]);

  useEffect(() => {
    if (hasAccess && musicDeptId) {
      loadData();
    }
  }, [hasAccess, musicDeptId, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading Music Department...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Music Department" description="Music ministry portal" />
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You need to be a member of the Music Department or an administrator to access this portal.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Music Department Portal"
          description="Manage choirs, praise teams, and musical ministry"
        />
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{memberCount}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Total Contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">GH₵ {totalContributions.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Music className="h-4 w-4" /> Linked Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{funds.length}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="text-sm">Active</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Music Department with Choir Management */}
      <Tabs defaultValue="choir">
        <TabsList>
          <TabsTrigger value="choir">Choir Management</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="funds">Funds</TabsTrigger>
        </TabsList>

        <TabsContent value="choir">
          <ChoirPortal embedded />
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Music Department Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No members assigned to the Music Department yet.</p>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Assign members via the Departments page.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Member No</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((dm) => (
                        <TableRow key={dm.id}>
                          <TableCell className="font-medium">
                            {dm.member?.first_name} {dm.member?.last_name}
                          </TableCell>
                          <TableCell>{dm.member?.member_no ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{dm.member?.email ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{dm.assigned_role ?? "MEMBER"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funds">
          <Card>
            <CardHeader>
              <CardTitle>Music Department Funds ({funds.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {funds.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No funds linked to the Music Department.</p>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Link funds via the Funds management page.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fund Name</TableHead>
                        <TableHead>Fund ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funds.map((f) => (
                        <TableRow key={f.fund_id}>
                          <TableCell className="font-medium">{f.fund_name}</TableCell>
                          <TableCell className="text-muted-foreground">{f.fund_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MusicDepartmentPortal;
