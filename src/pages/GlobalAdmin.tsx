import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Trash2, Shield } from "lucide-react";

type Church = {
  id: string;
  name: string;
  created_at?: string | null;
};

type UserLite = { id: string; email: string };
type RoleLite = { id: string; name: string; category?: string | null; scope_type?: string | null };
type Assignment = {
  id: string;
  user_id: string;
  email: string;
  role_id: string;
  role_name: string;
  scope_id: string;
  church_name: string;
  start_date?: string | null;
  end_date?: string | null;
};

const callGlobalAdminFunction = async (token: string, body: Record<string, unknown>) => {
  const response = await fetch(`/api/functions/admin-manage-churches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Function request failed");
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data;
};

export default function GlobalAdmin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [churches, setChurches] = useState<Church[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [churchRoles, setChurchRoles] = useState<RoleLite[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [newChurchName, setNewChurchName] = useState("");
  const [churchEditMap, setChurchEditMap] = useState<Record<string, string>>({});

  const [assignForm, setAssignForm] = useState({
    user_id: "",
    role_id: "",
    church_id: "",
    start_date: "",
    end_date: "",
  });

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  const load = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No active session");

      const [churchData, assignmentData] = await Promise.all([
        callGlobalAdminFunction(token, { action: "list_churches" }),
        callGlobalAdminFunction(token, { action: "list_church_admin_assignments" }),
      ]);

      setChurches(churchData.churches ?? []);
      setUsers(assignmentData.users ?? []);
      setChurchRoles(assignmentData.church_roles ?? []);
      setAssignments(assignmentData.assignments ?? []);
      setChurchEditMap(
        Object.fromEntries((churchData.churches ?? []).map((c: Church) => [c.id, c.name]))
      );
    } catch (error) {
      toast({
        title: "Global admin load failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const assignmentSummary = useMemo(() => {
    const byChurch = new Map<string, number>();
    assignments.forEach((row) => {
      const key = row.church_name || "Unknown Church";
      byChurch.set(key, (byChurch.get(key) ?? 0) + 1);
    });
    return Array.from(byChurch.entries()).sort((a, b) => b[1] - a[1]);
  }, [assignments]);

  const handleCreateChurch = async (e: FormEvent) => {
    e.preventDefault();
    const name = newChurchName.trim();
    if (!name) return;
    try {
      const token = await getToken();
      await callGlobalAdminFunction(token, { action: "create_church", name });
      toast({ title: "Church created", description: `${name} has been added.` });
      setNewChurchName("");
      await load();
    } catch (error) {
      toast({
        title: "Create failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRenameChurch = async (id: string) => {
    const name = (churchEditMap[id] || "").trim();
    if (!name) return;
    try {
      const token = await getToken();
      await callGlobalAdminFunction(token, { action: "update_church", id, name });
      toast({ title: "Church updated", description: "Church name updated successfully." });
      await load();
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChurch = async (church: Church) => {
    if (!confirm(`Delete "${church.name}"? This may affect linked records.`)) return;
    try {
      const token = await getToken();
      await callGlobalAdminFunction(token, { action: "delete_church", id: church.id });
      toast({ title: "Church deleted", description: `${church.name} has been removed.` });
      await load();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleAssignRole = async () => {
    if (!assignForm.user_id || !assignForm.role_id || !assignForm.church_id) {
      toast({
        title: "Incomplete form",
        description: "Select user, role, and church before assigning.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = await getToken();
      await callGlobalAdminFunction(token, {
        action: "assign_church_admin_role",
        ...assignForm,
      });
      toast({ title: "Role assigned", description: "Church-scoped admin role assigned successfully." });
      setAssignForm({ user_id: "", role_id: "", church_id: "", start_date: "", end_date: "" });
      await load();
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRevokeAssignment = async (id: string) => {
    try {
      const token = await getToken();
      await callGlobalAdminFunction(token, { action: "revoke_church_admin_role", id });
      toast({ title: "Assignment revoked", description: "Role assignment was deactivated." });
      await load();
    } catch (error) {
      toast({
        title: "Revoke failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global SuperAdmin Console"
        description="Manage all churches and assign church-scoped administrators from one central workspace."
        icon={<Globe className="w-5 h-5" />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total Churches</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{churches.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Church Admin Assignments</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{assignments.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Available Church Roles</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{churchRoles.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Church Registry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateChurch} className="flex gap-2">
            <Input
              placeholder="New church name"
              value={newChurchName}
              onChange={(e) => setNewChurchName(e.target.value)}
            />
            <Button type="submit" className="gap-2"><Plus className="w-4 h-4" /> Add Church</Button>
          </form>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {churches.map((church) => (
                  <TableRow key={church.id}>
                    <TableCell>
                      <Input
                        value={churchEditMap[church.id] ?? church.name}
                        onChange={(e) => setChurchEditMap((p) => ({ ...p, [church.id]: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell>
                      {church.created_at ? new Date(church.created_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleRenameChurch(church.id)}>Save</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteChurch(church)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && churches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No churches found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assign Church Admin Roles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>User</Label>
              <Select value={assignForm.user_id} onValueChange={(v) => setAssignForm((p) => ({ ...p, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={assignForm.role_id} onValueChange={(v) => setAssignForm((p) => ({ ...p, role_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {churchRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Church</Label>
              <Select value={assignForm.church_id} onValueChange={(v) => setAssignForm((p) => ({ ...p, church_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select church" /></SelectTrigger>
                <SelectContent>
                  {churches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Start Date (optional)</Label>
              <Input
                type="date"
                value={assignForm.start_date}
                onChange={(e) => setAssignForm((p) => ({ ...p, start_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={assignForm.end_date}
                onChange={(e) => setAssignForm((p) => ({ ...p, end_date: e.target.value }))}
              />
            </div>
          </div>

          <Button onClick={handleAssignRole} className="gap-2">
            <Shield className="w-4 h-4" /> Assign Role
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current Church Admin Assignments</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {assignmentSummary.map(([churchName, count]) => (
              <Badge key={churchName} variant="secondary">{churchName}: {count}</Badge>
            ))}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Church</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.email}</TableCell>
                    <TableCell>{a.role_name}</TableCell>
                    <TableCell>{a.church_name || "Unknown"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.start_date || "—"} to {a.end_date || "Open"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="destructive" onClick={() => handleRevokeAssignment(a.id)}>
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && assignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No church-scoped admin assignments yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

