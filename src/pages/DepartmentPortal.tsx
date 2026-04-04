import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import {
  RefreshCw, Users, Wallet, Building2, Plus, UserPlus, TrendingUp,
} from "lucide-react";

type Department = { id: number; name: string; description: string | null; is_active: boolean };
type DeptMember = {
  id: number;
  assigned_role: string | null;
  member_id: number;
  member: { id: number; first_name: string; last_name: string; member_no: string | null; email: string | null; phone: string | null } | null;
};
type DeptFund = { fund_id: number; fund_name: string; total: number };
type AllMember = { id: number; first_name: string; last_name: string; member_no: string | null };

const DepartmentPortal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myDepartments, setMyDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [members, setMembers] = useState<DeptMember[]>([]);
  const [funds, setFunds] = useState<DeptFund[]>([]);
  const [totalContributions, setTotalContributions] = useState(0);

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<AllMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [saving, setSaving] = useState(false);

  /* ── init: determine accessible departments ── */
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role_id,roles(name)")
        .eq("user_id", user.id) as { data: any[] | null; error: any };

      const roleList = (roles ?? []).map((r: any) => r.roles?.name);
      const admin = roleList.includes("SuperAdmin");
      setIsAdmin(admin);

      const { data: memberRow } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: allDepts } = await supabase
        .from("departments")
        .select("id, name, description, is_active")
        .eq("is_active", true)
        .order("name");

      let visible = (allDepts ?? []) as any as Department[];
      if (!admin && memberRow?.id) {
        const { data: memberDepts } = await supabase
          .from("department_members")
          .select("department_id")
          .eq("member_id", memberRow.id);
        const deptIds = new Set((memberDepts ?? []).map((d: any) => d.department_id));
        visible = visible.filter((d) => deptIds.has(d.id as any));
      } else if (!admin) {
        visible = [];
      }

      setMyDepartments(visible);

      const params = new URLSearchParams(location.search);
      const requestedId = params.get("department");
      if (requestedId && visible.some((d) => String(d.id) === requestedId)) {
        setSelectedDept(visible.find((d) => String(d.id) === requestedId)!);
      } else if (visible.length > 0) {
        setSelectedDept(visible[0]);
      }

      setLoading(false);
    };
    init();
  }, [user, location.search]);

  /* ── load department data ── */
  const loadData = useCallback(async () => {
    if (!selectedDept) return;
    setLoading(true);
    try {
      // Members
      const { data: membersData } = await supabase
        .from("department_members")
        .select("id, department_id, member_id, assigned_role, members(id, first_name, last_name, member_no, email, phone)")
        .eq("department_id", selectedDept.id as any);

      const mapped: DeptMember[] = (membersData ?? []).map((dm: any) => ({
        id: dm.id,
        assigned_role: dm.assigned_role,
        member_id: dm.member_id,
        member: Array.isArray(dm.members) ? dm.members[0] : dm.members,
      }));
      setMembers(mapped);

      // Funds with contribution totals
      const { data: fundLinks } = await supabase
        .from("fund_departments")
        .select("fund_id, funds(id, name)")
        .eq("department_id", selectedDept.id);

      const fundEntries = (fundLinks ?? []).map((f: any) => {
        const fund = Array.isArray(f.funds) ? f.funds[0] : f.funds;
        return { fund_id: f.fund_id, fund_name: fund?.name ?? "Unknown" };
      });

      // Get contribution totals per fund
      let grandTotal = 0;
      const fundsWithTotals: DeptFund[] = [];
      for (const entry of fundEntries) {
        const { data: contribs } = await supabase
          .from("contributions")
          .select("amount")
          .eq("fund_id", entry.fund_id);
        const total = (contribs ?? []).reduce((s, c) => s + Number(c.amount), 0);
        grandTotal += total;
        fundsWithTotals.push({ ...entry, total });
      }
      setFunds(fundsWithTotals);
      setTotalContributions(grandTotal);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedDept, toast]);

  useEffect(() => {
    if (selectedDept) loadData();
  }, [selectedDept, loadData]);

  /* ── add member ── */
  const openAddMember = async () => {
    const { data } = await supabase
      .from("members")
      .select("id, first_name, last_name, member_no")
      .eq("status", "ACTIVE")
      .order("first_name");
    setAllMembers((data ?? []) as any as AllMember[]);
    setSelectedMemberId("");
    setSelectedRole("MEMBER");
    setAddMemberOpen(true);
  };

  const handleAddMember = async () => {
    if (!selectedMemberId || !selectedDept) return;
    setSaving(true);

    // Check if already a member
    const existing = members.find((m) => m.member_id === Number(selectedMemberId));
    if (existing) {
      toast({ title: "Already a member", description: "This member is already in the department.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("department_members")
      .insert({
        department_id: selectedDept.id,
        member_id: Number(selectedMemberId),
        assigned_role: selectedRole,
      } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member added to department" });
      setAddMemberOpen(false);
      loadData();
    }
    setSaving(false);
  };

  /* ── remove member ── */
  const removeMember = async (dmId: number) => {
    const { error } = await supabase
      .from("department_members")
      .delete()
      .eq("id", dmId as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      loadData();
    }
  };

  /* ── update role ── */
  const updateRole = async (dmId: number, newRole: string) => {
    const { error } = await supabase
      .from("department_members")
      .update({ assigned_role: newRole })
      .eq("id", dmId as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role updated" });
      loadData();
    }
  };

  if (!user) return <div className="p-4">Please log in to access the Department Portal.</div>;

  if (loading && myDepartments.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading departments...</div>
      </div>
    );
  }

  if (myDepartments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Department Portal" description="Department management and operations" />
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">No Departments</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have access to any departments. Contact an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const leaderCount = members.filter((m) => m.assigned_role && m.assigned_role !== "MEMBER").length;

  return (
    <div className="space-y-6">
      {/* Header with selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={selectedDept ? `${selectedDept.name} Department` : "Department Portal"}
          description={selectedDept?.description || "Department management and operations"}
        />
        <div className="flex items-center gap-2">
          <Select
            value={selectedDept ? String(selectedDept.id) : ""}
            onValueChange={(val) => {
              const dept = myDepartments.find((d) => String(d.id) === val);
              if (dept) setSelectedDept(dept);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {myDepartments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {selectedDept && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Total Members
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{members.length}</p></CardContent>
          </Card>
          <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Leaders
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{leaderCount}</p></CardContent>
          </Card>
          <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Linked Funds
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{funds.length}</p></CardContent>
          </Card>
          <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Total Contributions
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">GH₵ {totalContributions.toFixed(2)}</p></CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      {selectedDept && (
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="funds">Fund Performance</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Department Members ({members.length})</CardTitle>
                {isAdmin && (
                  <Button size="sm" onClick={openAddMember}>
                    <UserPlus className="h-4 w-4 mr-1" /> Add Member
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No members in this department yet.</p>
                    {isAdmin && <p className="text-xs text-muted-foreground mt-1">Use "Add Member" to assign church members.</p>}
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
                          {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((dm) => (
                          <TableRow key={dm.id}>
                            <TableCell className="font-medium">
                              {dm.member?.first_name} {dm.member?.last_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{dm.member?.member_no ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{dm.member?.email ?? "—"}</TableCell>
                            <TableCell>
                              {isAdmin ? (
                                <Select
                                  value={dm.assigned_role ?? "MEMBER"}
                                  onValueChange={(val) => updateRole(dm.id, val)}
                                >
                                  <SelectTrigger className="w-[130px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="MEMBER">Member</SelectItem>
                                    <SelectItem value="LEADER">Leader</SelectItem>
                                    <SelectItem value="SECRETARY">Secretary</SelectItem>
                                    <SelectItem value="TREASURER">Treasurer</SelectItem>
                                    <SelectItem value="DIRECTOR">Director</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="secondary">{dm.assigned_role ?? "MEMBER"}</Badge>
                              )}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => removeMember(dm.id)}
                                >
                                  Remove
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funds Tab */}
          <TabsContent value="funds">
            <Card>
              <CardHeader>
                <CardTitle>Fund Performance ({funds.length} funds)</CardTitle>
              </CardHeader>
              <CardContent>
                {funds.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No funds linked to this department.</p>
                    {isAdmin && <p className="text-xs text-muted-foreground mt-1">Link funds from the Funds management page.</p>}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fund Name</TableHead>
                          <TableHead className="text-right">Total Contributions</TableHead>
                          <TableHead className="text-right">% of Dept Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {funds.map((f) => (
                          <TableRow key={f.fund_id}>
                            <TableCell className="font-medium">{f.fund_name}</TableCell>
                            <TableCell className="text-right">GH₵ {f.total.toFixed(2)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {totalContributions > 0
                                ? `${((f.total / totalContributions) * 100).toFixed(1)}%`
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">GH₵ {totalContributions.toFixed(2)}</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Member to {selectedDept?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Member</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a church member" />
                </SelectTrigger>
                <SelectContent>
                  {allMembers.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.first_name} {m.last_name} {m.member_no ? `(${m.member_no})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="LEADER">Leader</SelectItem>
                  <SelectItem value="SECRETARY">Secretary</SelectItem>
                  <SelectItem value="TREASURER">Treasurer</SelectItem>
                  <SelectItem value="DIRECTOR">Director</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleAddMember} disabled={saving || !selectedMemberId}>
              {saving ? "Adding..." : "Add to Department"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentPortal;
