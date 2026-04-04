import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NON_DEPARTMENT_NAMES = new Set(["member", "governance"]);

const isDisplayDepartment = (department: any) => {
  const name = String(department?.name || "").trim().toLowerCase();
  return !NON_DEPARTMENT_NAMES.has(name);
};

const toDepartmentKey = (value: unknown) => String(value ?? "");

const toDatabaseDepartmentId = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!text) return null;
  const asNumber = Number(text);
  if (Number.isInteger(asNumber)) return asNumber;
  return null;
};

const Departments = () => {
  const { currentChurch } = useCurrentChurch();
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<Record<string, any[]>>({});
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | string | null>(null);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", is_active: true });
  const [memberForm, setMemberForm] = useState({ member_id: "", assigned_role: "MEMBER" });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState<number | null>(null);
  const { toast } = useToast();

  const fetch = async () => {
    let deptQuery = supabase.from("departments").select("*").order("id");
    if (currentChurch?.id) {
      deptQuery = deptQuery.eq("church_id", currentChurch.id);
    }
    const { data } = await deptQuery;
    const visibleDepartments = (data ?? []).filter(isDisplayDepartment);
    setDepartments(visibleDepartments);
    
    // Fetch member counts for each department
    if (visibleDepartments.length > 0) {
      const deptIds = visibleDepartments
        .map((department) => toDatabaseDepartmentId(department.id))
        .filter((id): id is number => id !== null);

      if (deptIds.length > 0) {
        const { data: memberData } = await supabase
          .from("department_members")
          .select("id, department_id, member_id, assigned_role, members(id, first_name, last_name, member_no, phone, status)")
          .in("department_id", deptIds as any);
        
        const membersByDept: Record<string, any[]> = {};
        
        for (const member of memberData ?? []) {
          const departmentKey = toDepartmentKey(member.department_id);
          if (!membersByDept[departmentKey]) {
            membersByDept[departmentKey] = [];
          }
          membersByDept[departmentKey].push(member);
        }

        setDepartmentMembers(membersByDept);
      } else {
        setDepartmentMembers({});
      }
    }
  };

  const fetchAllMembers = async () => {
    let memberQuery = supabase
      .from("members")
      .select("id, first_name, last_name, member_no, phone, status")
      .eq("status", "ACTIVE")
      .order("first_name");

    if (currentChurch?.id) {
      memberQuery = memberQuery.eq("church_id", currentChurch.id);
    }

    const { data } = await memberQuery;
    setAllMembers(data ?? []);
  };

  useEffect(() => {
    fetch();
    fetchAllMembers();
  }, [currentChurch?.id]);

  const resetForm = () => {
    setForm({ name: "", description: "", is_active: true });
    setEditingId(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("departments").insert([{
      name: form.name.trim(), description: form.description.trim() || null, is_active: form.is_active,
    }] as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Department added" });
      resetForm();
      setAddOpen(false);
      fetch();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const { error } = await supabase
      .from("departments")
      .update({
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
      })
      .eq("id", editingId as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Department updated" });
      resetForm();
      setEditOpen(false);
      fetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("departments").delete().eq("id", deleteId as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Department deleted" });
      setDeleteId(null);
      fetch();
    }
  };

  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      description: d.description ?? "",
      is_active: d.is_active ?? true,
    });
    setEditOpen(true);
  };

  const openMembersDialog = (dept: any) => {
    setSelectedDepartment(dept);
    setMembersOpen(true);
    setMemberForm({ member_id: "", assigned_role: "MEMBER" });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment || !memberForm.member_id) {
      toast({
        title: "Missing fields",
        description: "Please select a member",
        variant: "destructive",
      });
      return;
    }

    if (isAddingMember) return; // Prevent double submission

    try {
      // Check if member is already in department
      const memberIdNum = parseInt(String(memberForm.member_id), 10);
      const departmentId = toDatabaseDepartmentId(selectedDepartment.id);
      if (departmentId === null) {
        toast({
          title: "Invalid department",
          description: "Selected department has no valid id.",
          variant: "destructive",
        });
        return;
      }

      const departmentKey = toDepartmentKey(selectedDepartment.id);
      const existingMembers = departmentMembers[departmentKey] ?? [];
      const exists = existingMembers.find(dm => dm.member_id === memberIdNum);
      if (exists) {
        toast({
          title: "Member already in department",
          description: "This member is already assigned to this department",
          variant: "destructive",
        });
        setIsAddingMember(false);
        return;
      }

      setIsAddingMember(true);

      const { error, data } = await supabase.from("department_members").insert({
        department_id: departmentId as any,
        member_id: memberIdNum,
        assigned_role: memberForm.assigned_role,
      } as any).select();

      if (error) throw error;

      // Find the member object for optimistic update
      const selectedMember = allMembers.find(m => m.id === memberIdNum);

      // Optimistic update: add member to local state
      if (selectedMember && data && data[0]) {
        setDepartmentMembers(prev => ({
          ...prev,
          [departmentKey]: [
            ...((prev[departmentKey]) ?? []),
            { ...data[0], members: selectedMember }
          ]
        }));
      }

      toast({ title: "Member added to department" });
      setMemberForm({ member_id: "", assigned_role: "MEMBER" });
      setMembersOpen(false); // Auto-close dialog
      fetch(); // Reload data in background
    } catch (error: any) {
      toast({
        title: "Error adding member",
        description: error.message || "Failed to add member",
        variant: "destructive",
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (departmentMemberId: number) => {
    if (!confirm("Are you sure you want to remove this member from the department?")) {
      return;
    }

    setIsRemovingMember(departmentMemberId);
    try {
      const { error } = await supabase
        .from("department_members")
        .delete()
        .eq("id", departmentMemberId as any);

      if (error) throw error;

      // Optimistic update: remove member from local state
      if (selectedDepartment) {
        const departmentKey = toDepartmentKey(selectedDepartment.id);
        setDepartmentMembers(prev => ({
          ...prev,
          [departmentKey]: (prev[departmentKey] ?? []).filter(
            dm => dm.id !== departmentMemberId
          )
        }));
      }

      toast({ title: "Member removed from department" });
      fetch(); // Reload data in background
    } catch (error: any) {
      toast({
        title: "Error removing member",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    } finally {
      setIsRemovingMember(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Church ministry departments" icon={<Building2 className="w-5 h-5" />}>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sabbath School"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: checked === true }))}
                />
                <Label htmlFor="add-active" className="font-normal">Active</Label>
              </div>
              <Button type="submit" className="w-full">Add Department</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: checked === true }))}
              />
              <Label htmlFor="edit-active" className="font-normal">Active</Label>
            </div>
            <Button type="submit" className="w-full">Update Department</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Members Management Dialog */}
      <Dialog open={membersOpen} onOpenChange={(open) => { 
        setMembersOpen(open); 
        if (!open) {
          setSelectedDepartment(null);
          setMemberForm({ member_id: "", assigned_role: "MEMBER" });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDepartment?.name} - Members
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Add Member Form */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-semibold mb-3">Add Member & Assign Department Role</h4>
              <form onSubmit={handleAddMember} className="flex gap-3">
                <div className="flex-1">
                  <Select
                    value={memberForm.member_id}
                    onValueChange={(value) =>
                      setMemberForm((f) => ({ ...f, member_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMembers
                        .filter(m => {
                          const selectedDepartmentKey = toDepartmentKey(selectedDepartment?.id);
                          const existingMembers = departmentMembers[selectedDepartmentKey] ?? [];
                          return !existingMembers.find(dm => dm.member_id === m.id);
                        })
                        .map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.first_name} {m.last_name}
                            {m.member_no && ` (${m.member_no})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-48">
                  <Select
                    value={memberForm.assigned_role}
                    onValueChange={(value) =>
                      setMemberForm((f) => ({ ...f, assigned_role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                      <SelectItem value="DEPARTMENT_SECRETARY">Department Secretary</SelectItem>
                      <SelectItem value="DEPUTY_SECRETARY">Deputy Secretary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={isAddingMember}>
                  {isAddingMember ? (
                    <>
                      <div className="w-4 h-4 mr-1 rounded-full border-2 border-background border-t-foreground animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Members List */}
            <div>
              <h4 className="font-semibold mb-3">
                Current Members ({(departmentMembers[toDepartmentKey(selectedDepartment?.id)] || []).length})
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Member No</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(departmentMembers[toDepartmentKey(selectedDepartment?.id)] || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No members assigned yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      (departmentMembers[toDepartmentKey(selectedDepartment?.id)] || []).map((dm) => (
                        <TableRow key={dm.id}>
                          <TableCell className="font-medium">
                            {(dm.members as any)?.first_name} {(dm.members as any)?.last_name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(dm.members as any)?.member_no || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(dm.members as any)?.phone || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {String(dm.assigned_role || "MEMBER")
                                .replace(/_/g, " ")
                                .toLowerCase()
                                .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={(dm.members as any)?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                              {(dm.members as any)?.status || "ACTIVE"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(dm.id)}
                              disabled={isRemovingMember === dm.id}
                            >
                              {isRemovingMember === dm.id ? (
                                <div className="w-4 h-4 rounded-full border-2 border-destructive border-t-transparent animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(d => {
          const memberCount = (departmentMembers[toDepartmentKey(d.id)] || []).length;
          return (
            <Card key={d.id} className="animate-fade-in">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading font-semibold text-foreground">{d.name}</h3>
                  <div className="flex items-center gap-1">
                    <Badge variant={d.is_active ? "default" : "secondary"}>
                      {d.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(d.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{d.description || "—"}</p>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openMembersDialog(d)}
                  >
                    Manage Members
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Departments;
