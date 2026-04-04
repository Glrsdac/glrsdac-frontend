import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, CheckCircle, Clock, Edit2, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useCurrentChurch } from "@/hooks/use-current-church";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * POSITION SYSTEM - AUTOMATIC ROLE SYNC
 *
 * RBAC ARCHITECTURE: Positions automatically assign appropriate roles.
 * When a position is assigned, the system automatically grants the corresponding role.
 *
 * SECURITY: Position changes trigger role assignments through database triggers.
 * Manual role management is still available for complex scenarios.
 */
type PositionDefinition = {
  id: string;
  name: string;
  category: string;
  default_role_id?: string;
  roles?: { name: string };
  is_active: boolean;
};

type Member = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  member_no: string | null;
  email: string | null;
  user_id: string | null;
  status: string | null;
  position?: string | null;
  dob?: string | null;
  created_at: string;
};

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  member_no: string;
  email: string;
  position: string;
  dob: string;
};

const normalizeText = (value?: string | null) => (value || "").trim().toLowerCase();

const Members = () => {
  const { user, session, signOut } = useAuth();
  const { currentChurch } = useCurrentChurch();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [positions, setPositions] = useState<PositionDefinition[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    phone: "",
    member_no: "",
    email: "",
    position: "",
    dob: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({});
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchMembers = async () => {
    let query = supabase
      .from("members")
      .select("*")
      // normalize status check to avoid case mismatches (e.g. active vs ACTIVE)
      .ilike("status", "active")
      .order("created_at", { ascending: false });

    if (currentChurch?.id) {
      query = query.eq("church_id", currentChurch.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching members:", error);
      toast({ title: "Error loading members", description: error.message, variant: "destructive" });
    }
    setMembers((data as any as Member[]) ?? []);
  };

  const fetchPositions = async () => {
    const { data, error } = await supabase
      .from("position_definitions")
      .select(`
        *,
        roles:default_role_id(name)
      `)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      console.error("Error fetching positions:", error);
      toast({ title: "Error loading positions", description: error.message, variant: "destructive" });
    }
    setPositions((data as any as PositionDefinition[]) ?? []);
  };

  useEffect(() => { 
    if (user) {
      fetchMembers();
      fetchPositions();
    }
  }, [user, currentChurch?.id]);

  useRealtimeRefresh({
    channelName: "members-table-realtime",
    subscriptions: [{ table: "members" }],
    onRefresh: fetchMembers,
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role_id,roles(name)")
      .eq("user_id", user.id)
      .then(({ data }: any) => {
        const roles = (data ?? []).map((r: any) => r.roles?.name);
        if (roles.includes("SuperAdmin")) setUserRole("ADMIN");
        else if (roles.includes("Church Treasurer")) setUserRole("TREASURER");
        else if (roles.includes("Church Clerk")) setUserRole("CLERK");
        else setUserRole("VIEWER");
      });
  }, [user]);

  const isAdmin = userRole === "ADMIN";
  const canWrite = isAdmin || userRole === "TREASURER" || userRole === "CLERK";

  const resetForm = () => {
    // member_no is auto-generated by database trigger, not user-settable
    setForm({ first_name: "", last_name: "", phone: "", member_no: "", email: "", position: "", dob: "" });
    setFormErrors({});
    setEditingId(null);
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormState> = {};

    if (!form.first_name.trim()) {
      errors.first_name = "First name is required";
    } else if (form.first_name.trim().length > 100) {
      errors.first_name = "First name must be 100 characters or less";
    }

    if (!form.last_name.trim()) {
      errors.last_name = "Last name is required";
    } else if (form.last_name.trim().length > 100) {
      errors.last_name = "Last name must be 100 characters or less";
    }

    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        errors.email = "Invalid email address";
      } else if (form.email.trim().length > 255) {
        errors.email = "Email must be 255 characters or less";
      }
    }

    if (form.phone && form.phone.trim().length > 20) {
      errors.phone = "Phone must be 20 characters or less";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const normalizedFirstName = normalizeText(form.first_name);
    const normalizedLastName = normalizeText(form.last_name);
    const normalizedEmail = normalizeText(form.email);
    const normalizedDob = form.dob || "";

    const duplicateMember = members.find((member) => {
      if (editingId && member.id === editingId) return false;

      const sameEmail =
        normalizedEmail.length > 0 &&
        normalizeText(member.email) === normalizedEmail;

      const sameNameAndDob =
        normalizedDob.length > 0 &&
        normalizeText(member.first_name) === normalizedFirstName &&
        normalizeText(member.last_name) === normalizedLastName &&
        (member.dob || "") === normalizedDob;

      return sameEmail || sameNameAndDob;
    });

    if (duplicateMember) {
      toast({
        title: "Error",
        description: "member already exist.",
        variant: "destructive",
      });
      return;
    }

    const basePayload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      position: form.position || null,
      dob: form.dob || null,
    };

    if (editingId) {
      const { error } = await supabase.from("members").update(basePayload).eq("id", editingId as any);
      if (error) {
        const duplicateError =
          error.code === "23505" ||
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("duplicate");
        toast({
          title: "Error",
          description: duplicateError ? "member already exist." : error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Member updated" });
        resetForm();
        setOpen(false);
        fetchMembers();
      }
    } else {
      // Auto-generate member_no in GLRSDAC00X format
      const { data: memberNos, error: memberNoError } = await supabase
        .from("members")
        .select("member_no")
        .order("created_at", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (memberNos && memberNos.length > 0 && memberNos[0].member_no) {
        const match = memberNos[0].member_no.match(/GLRSDAC00(\d{1,3})/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      if (nextNumber > 999) {
        toast({ title: "Error", description: "Maximum member number reached (GLRSDAC999)", variant: "destructive" });
        return;
      }
      const memberNo = `GLRSDAC00${nextNumber.toString().padStart(3, "0")}`;

      const { data: newMember, error } = await supabase
        .from("members")
        .insert([{ ...basePayload, member_no: memberNo }] as any)
        .select("id")
        .single();

      if (error) {
        const duplicateError =
          error.code === "23505" ||
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("duplicate");
        toast({
          title: "Error",
          description: duplicateError ? "member already exist." : error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Member added" });
        resetForm();
        setOpen(false);
        fetchMembers();
      }
    }
  };

  const openEdit = (member: Member) => {
    setForm({
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || "",
      member_no: member.member_no || "",
      email: member.email || "",
      position: member.position || "",
      dob: member.dob || "",
    });
    setFormErrors({});
    setEditingId(member.id);
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("members").delete().eq("id", deleteId as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member deleted" });
      setDeleteId(null);
      fetchMembers();
    }
  };

  const callMemberFunction = async (fnName: string, body: object) => {
    const { data: refreshData } = await supabase.auth.refreshSession();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken =
      refreshData.session?.access_token ?? sessionData.session?.access_token ?? session?.access_token;

    if (!accessToken) {
      throw new Error("No active session. Please log in again.");
    }

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    console.log(`[${fnName}] Sending request with token:`, accessToken?.substring(0, 20) + "...");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
          "x-user-token": accessToken,
        },
        body: JSON.stringify(body),
      }
    );
    const rawText = await response.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = { error: rawText || "Unknown error" };
    }
    
    console.log(`[${fnName}] Response:`, { status: response.status, body: data });

    if (!response.ok) {
      const isInvalidJwt =
        data?.message === "Invalid JWT" ||
        (typeof data?.error === "string" && data.error.includes("Invalid JWT")) ||
        (typeof data?.details === "string" && data.details.includes("Invalid JWT"));

      if (isInvalidJwt) {
        await signOut();
        throw new Error("Session expired. Please log in again.");
      }
      console.error(`Edge function ${fnName} failed`, {
        status: response.status,
        statusText: response.statusText,
        data,
      });
    }
    return { ok: response.ok, data };
  };

  const handleInvite = async (member: Member) => {
    if (!member.email) {
      toast({ title: "No email", description: "Add an email address to this member first.", variant: "destructive" });
      return;
    }
    setInvitingId(member.id);
    try {
      const { ok, data } = await callMemberFunction("invite-member", { member_id: member.id, email: member.email });
      if (!ok) {
        toast({ title: "Invite failed", description: data.error || "Unknown error", variant: "destructive" });
      } else {
        if (data?.email_sent === false) {
          const emailError = typeof data?.email_error === "string" ? data.email_error : "";
          toast({
            title: "Invite created (email not delivered)",
            description: data?.signup_url
              ? `${emailError ? `Reason: ${emailError}. ` : ""}Share signup link manually: ${data.signup_url}`
              : "Email service is not configured or delivery failed.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Invite sent", description: `Invitation sent to ${member.email}` });
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to send invite", variant: "destructive" });
    } finally {
      setInvitingId(null);
    }
  };

  const handleResendInvite = async (member: Member) => {
    if (!member.email) {
      toast({ title: "No email", description: "Add an email address to this member first.", variant: "destructive" });
      return;
    }
    setInvitingId(member.id);
    try {
      const { ok, data } = await callMemberFunction("resend-invite", { member_id: member.id });
      if (!ok) {
        toast({ title: "Resend failed", description: data.error || "Unknown error", variant: "destructive" });
      } else {
        if (data?.email_sent === false) {
          const emailError = typeof data?.email_error === "string" ? data.email_error : "";
          toast({
            title: "Invite refreshed (email not delivered)",
            description: data?.signupUrl
              ? `${emailError ? `Reason: ${emailError}. ` : ""}Share signup link manually: ${data.signupUrl}`
              : "Email service is not configured or delivery failed.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Invite resent", description: `Fresh invitation sent to ${member.email}` });
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to resend invite", variant: "destructive" });
    } finally {
      setInvitingId(null);
    }
  };

  const getAccessStatus = (member: Member) => {
    if (member.user_id) return "linked";
    if (member.email) return "not_invited";
    return "no_email";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description="Manage church membership records" icon={<Users className="w-5 h-5" />}>
        {canWrite && (
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit Member" : "Add Member"}</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      maxLength={100}
                      value={form.first_name}
                      onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                      required
                    />
                    {formErrors.first_name && <p className="text-xs text-destructive">{formErrors.first_name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      maxLength={100}
                      value={form.last_name}
                      onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                      required
                    />
                    {formErrors.last_name && <p className="text-xs text-destructive">{formErrors.last_name}</p>}
                  </div>
                </div>
                {editingId && (
                  <div className="space-y-2">
                    <Label>Member No <span className="text-xs text-muted-foreground">(Auto-generated)</span></Label>
                    <Input
                      maxLength={50}
                      value={form.member_no}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select
                    value={form.position || ""}
                    onValueChange={(value) =>
                      setForm((f) => ({ ...f, position: value === "__none" ? "" : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {positions.map((pos) => (
                        <SelectItem key={pos.id} value={pos.name}>
                          {pos.name} {pos.roles?.name && `(${pos.roles.name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    maxLength={20}
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  />
                  {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email <span className="text-muted-foreground text-xs">(needed to invite as system user)</span></Label>
                  <Input
                    type="email"
                    maxLength={255}
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="member@example.com"
                  />
                  {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                </div>
                <Button type="submit" className="w-full">{editingId ? "Update Member" : "Add Member"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>DOB</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>System Access</TableHead>
              {canWrite && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(m => {
              const accessStatus = getAccessStatus(m);
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">{m.member_no || "—"}</TableCell>
                  <TableCell className="font-medium">{m.first_name} {m.last_name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.dob ? new Date(m.dob).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {m.position ? (
                      <div className="flex flex-col gap-1">
                        <span>{m.position}</span>
                        {(() => {
                          const posDef = positions.find(p => p.name === m.position);
                          return posDef?.roles?.name ? (
                            <Badge variant="outline" className="text-xs w-fit">
                              {posDef.roles.name}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.email || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === "ACTIVE" ? "default" : "secondary"}>{m.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {accessStatus === "linked" && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <CheckCircle className="w-3.5 h-3.5" /> Linked
                      </span>
                    )}
                    {accessStatus === "not_invited" && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" /> Not invited
                      </span>
                    )}
                    {accessStatus === "no_email" && (
                      <span className="text-xs text-muted-foreground">No email</span>
                    )}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {isAdmin && accessStatus === "not_invited" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={invitingId === m.id}
                            onClick={() => handleInvite(m)}
                            title="Send invite email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && accessStatus === "linked" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={invitingId === m.id}
                            onClick={() => handleResendInvite(m)}
                            title="Resend invite email"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(m.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {members.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 8 : 7} className="text-center text-muted-foreground py-8">
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Members;
