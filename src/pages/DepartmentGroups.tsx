import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
};

type GroupMemberRow = {
  id: number;
  group_id: string;
  member_id: number;
  assigned_at: string;
  member?: {
    id: number;
    first_name: string;
    last_name: string;
    member_no: string | null;
  };
};

type GroupDepartmentRow = {
  id: number;
  group_id: string;
  department_id: string;
  assigned_role: string | null;
  created_at: string;
  department?: {
    id: string;
    name: string;
  };
};

const DepartmentGroups = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMemberRow[]>([]);
  const [groupDepartments, setGroupDepartments] = useState<GroupDepartmentRow[]>([]);

  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);

  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    is_active: true,
    is_default: false,
  });

  const [groupMemberForm, setGroupMemberForm] = useState({
    group_id: "",
    member_id: "",
  });

  const [groupDepartmentForm, setGroupDepartmentForm] = useState({
    group_id: "",
    department_id: "",
    assigned_role: "MEMBER",
  });

  const loadData = async () => {
    setLoading(true);

    const [{ data: groupsData }, { data: membersData }, { data: departmentsData }] = await Promise.all([
      supabase
        .from("member_groups" as any)
        .select("id, name, description, is_active, is_default, created_at")
        .order("name", { ascending: true }),
      supabase
        .from("members")
        .select("id, first_name, last_name, member_no, status")
        .eq("status", "ACTIVE")
        .order("first_name", { ascending: true }),
      supabase
        .from("departments")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    const normalizedGroups = ((groupsData ?? []) as unknown) as GroupRow[];
    setGroups(normalizedGroups);
    setAllMembers(membersData ?? []);
    setAllDepartments((departmentsData ?? []).filter((item: any) => {
      const name = String(item?.name ?? "").trim().toLowerCase();
      return name !== "member" && name !== "governance";
    }));

    if (normalizedGroups.length > 0) {
      const groupIds = normalizedGroups.map((item) => item.id);

      const [{ data: membershipRows }, { data: mappingRows }] = await Promise.all([
        supabase
          .from("member_group_members" as any)
          .select("id, group_id, member_id, assigned_at, members(id, first_name, last_name, member_no)")
          .in("group_id", groupIds)
          .order("assigned_at", { ascending: false }),
        supabase
          .from("member_group_departments" as any)
          .select("id, group_id, department_id, assigned_role, created_at, departments(id, name)")
          .in("group_id", groupIds)
          .order("created_at", { ascending: false }),
      ]);

      setGroupMembers(
        ((membershipRows ?? []) as any[]).map((row) => ({
          id: Number(row.id),
          group_id: String(row.group_id),
          member_id: Number(row.member_id),
          assigned_at: String(row.assigned_at ?? ""),
          member: row.members
            ? {
                id: Number(row.members.id),
                first_name: String(row.members.first_name ?? ""),
                last_name: String(row.members.last_name ?? ""),
                member_no: row.members.member_no ?? null,
              }
            : undefined,
        }))
      );

      setGroupDepartments(
        ((mappingRows ?? []) as any[]).map((row) => ({
          id: Number(row.id),
          group_id: String(row.group_id),
          department_id: String(row.department_id),
          assigned_role: row.assigned_role ?? null,
          created_at: String(row.created_at ?? ""),
          department: row.departments
            ? {
                id: String(row.departments.id),
                name: String(row.departments.name ?? "Department"),
              }
            : undefined,
        }))
      );
    } else {
      setGroupMembers([]);
      setGroupDepartments([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const groupNameMap = useMemo(() => new Map(groups.map((item) => [item.id, item.name])), [groups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    const { error } = await supabase
      .from("member_groups" as any)
      .insert({
        name: groupForm.name.trim(),
        description: groupForm.description.trim() || null,
        is_active: groupForm.is_active,
        is_default: groupForm.is_default,
      });

    if (error) {
      const description = error.code === "23505" && String(error.message || "").includes("member_groups_single_default")
        ? "A default group already exists. Remove default from the existing one first."
        : error.message;
      toast({ title: "Unable to create group", description, variant: "destructive" });
      return;
    }

    toast({ title: "Group created" });
    setGroupDialogOpen(false);
    setGroupForm({ name: "", description: "", is_active: true, is_default: false });
    loadData();
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Delete this group and all links?")) return;

    const { error } = await supabase.from("member_groups" as any).delete().eq("id", groupId);
    if (error) {
      toast({ title: "Unable to delete group", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Group deleted" });
    loadData();
  };

  const handleAddMemberToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupMemberForm.group_id || !groupMemberForm.member_id) return;

    const { error } = await supabase
      .from("member_group_members" as any)
      .insert({
        group_id: groupMemberForm.group_id,
        member_id: Number(groupMemberForm.member_id),
      });

    if (error) {
      toast({ title: "Unable to add member", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Member added to group" });
    setMemberDialogOpen(false);
    setGroupMemberForm({ group_id: "", member_id: "" });
    loadData();
  };

  const handleRemoveMemberFromGroup = async (id: number) => {
    const { error } = await supabase.from("member_group_members" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Unable to remove member", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Member removed from group" });
    loadData();
  };

  const handleAddDepartmentMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupDepartmentForm.group_id || !groupDepartmentForm.department_id) return;

    const { error } = await supabase
      .from("member_group_departments" as any)
      .insert({
        group_id: groupDepartmentForm.group_id,
        department_id: groupDepartmentForm.department_id,
        assigned_role: groupDepartmentForm.assigned_role || "MEMBER",
      });

    if (error) {
      toast({ title: "Unable to map department", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Department mapped to group" });
    setDepartmentDialogOpen(false);
    setGroupDepartmentForm({ group_id: "", department_id: "", assigned_role: "MEMBER" });
    loadData();
  };

  const handleRemoveDepartmentMapping = async (id: number) => {
    const { error } = await supabase.from("member_group_departments" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Unable to remove mapping", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Department mapping removed" });
    loadData();
  };

  return (
    <div className="space-y-5 pb-2 sm:space-y-6">
      <PageHeader
        title="Department Groups"
        description="Manage reusable groups that auto-assign members to department memberships and roles"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Groups</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{groups.length}</CardContent>
        </Card>
        <Card className="border-accent/40 bg-gradient-to-br from-accent/20 via-background to-background">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Group Members</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{groupMembers.length}</CardContent>
        </Card>
        <Card className="border-secondary bg-gradient-to-br from-secondary/70 via-background to-background">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Group→Department Links</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{groupDepartments.length}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-lg border border-primary/10 bg-background/80 p-1">
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="members">Group Members</TabsTrigger>
          <TabsTrigger value="mappings">Department Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Group</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={groupForm.name}
                      onChange={(event) => setGroupForm((form) => ({ ...form, name: event.target.value }))}
                      placeholder="Youth Fellowship"
                      required
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={groupForm.description}
                      onChange={(event) => setGroupForm((form) => ({ ...form, description: event.target.value }))}
                      placeholder="Optional group details"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={groupForm.is_active ? "active" : "inactive"}
                      onValueChange={(value) => setGroupForm((form) => ({ ...form, is_active: value === "active" }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Group</Label>
                    <RadioGroup
                      value={groupForm.is_default ? "yes" : "no"}
                      onValueChange={(value) => setGroupForm((form) => ({ ...form, is_default: value === "yes" }))}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="group-default-no" />
                        <Label htmlFor="group-default-no">No</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="group-default-yes" />
                        <Label htmlFor="group-default-yes">Yes (auto-assign newly activated members)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button className="w-full" type="submit">Create Group</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto rounded-lg border border-primary/10 bg-background/90">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No groups found.</TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{group.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={group.is_active ? "default" : "secondary"}>{group.is_active ? "Active" : "Inactive"}</Badge>
                          {group.is_default && <Badge variant="outline">Default</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteGroup(group.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Users className="w-4 h-4 mr-1" /> Add Group Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Member to Group</DialogTitle></DialogHeader>
                <form onSubmit={handleAddMemberToGroup} className="space-y-4">
                  <div>
                    <Label>Group</Label>
                    <Select
                      value={groupMemberForm.group_id}
                      onValueChange={(value) => setGroupMemberForm((form) => ({ ...form, group_id: value }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Member</Label>
                    <Select
                      value={groupMemberForm.member_id}
                      onValueChange={(value) => setGroupMemberForm((form) => ({ ...form, member_id: value }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {allMembers.map((member) => (
                          <SelectItem key={member.id} value={String(member.id)}>
                            {member.first_name} {member.last_name}{member.member_no ? ` (${member.member_no})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" type="submit">Add to Group</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto rounded-lg border border-primary/10 bg-background/90">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && groupMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No group members yet.</TableCell>
                  </TableRow>
                ) : (
                  groupMembers.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{groupNameMap.get(row.group_id) || "Group"}</TableCell>
                      <TableCell className="font-medium">
                        {row.member?.first_name} {row.member?.last_name}
                        {row.member?.member_no ? <span className="ml-2 text-xs text-muted-foreground">({row.member.member_no})</span> : null}
                      </TableCell>
                      <TableCell>{row.assigned_at ? new Date(row.assigned_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveMemberFromGroup(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Building2 className="w-4 h-4 mr-1" /> Map Department</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Map Group to Department</DialogTitle></DialogHeader>
                <form onSubmit={handleAddDepartmentMapping} className="space-y-4">
                  <div>
                    <Label>Group</Label>
                    <Select
                      value={groupDepartmentForm.group_id}
                      onValueChange={(value) => setGroupDepartmentForm((form) => ({ ...form, group_id: value }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select
                      value={groupDepartmentForm.department_id}
                      onValueChange={(value) => setGroupDepartmentForm((form) => ({ ...form, department_id: value }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {allDepartments.map((department) => (
                          <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assigned Role</Label>
                    <Select
                      value={groupDepartmentForm.assigned_role}
                      onValueChange={(value) => setGroupDepartmentForm((form) => ({ ...form, assigned_role: value }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="LEADER">Leader</SelectItem>
                        <SelectItem value="SECRETARY">Secretary</SelectItem>
                        <SelectItem value="TREASURER">Treasurer</SelectItem>
                        <SelectItem value="COORDINATOR">Coordinator</SelectItem>
                        <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" type="submit">Save Mapping</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="overflow-x-auto rounded-lg border border-primary/10 bg-background/90">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && groupDepartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No group department mappings yet.</TableCell>
                  </TableRow>
                ) : (
                  groupDepartments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{groupNameMap.get(row.group_id) || "Group"}</TableCell>
                      <TableCell className="font-medium">{row.department?.name || "Department"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{String(row.assigned_role || "MEMBER").replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveDepartmentMapping(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DepartmentGroups;
