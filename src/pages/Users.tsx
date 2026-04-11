import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Shield, Mail, MailPlus, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

type User = {
  id: string;
  email: string;
  created_at: string;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  roles?: Array<{
    id: string;
    role_id?: string;
    scope_type?: string | null;
    scope_id?: string | null;
    role?: { id: string; name: string; category?: string | null } | null;
  }>;
};

const ASSIGNABLE_ROLES = ["ADMIN", "TREASURER", "CLERK", "VIEWER"] as const;

const callAdminFunction = async (fnName: string, body: object, token?: string) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/functions/${fnName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { ok: response.ok, data, status: response.status };
};

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "VIEWER" });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [passwordUpdateForm, setPasswordUpdateForm] = useState({ new_password: "", confirm_password: "" });
  const [passwordUpdateErrors, setPasswordUpdateErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const { user: currentUser, session, signOut } = useAuth();
  const lastUserIdRef = useRef<string | null>(null);
  const authErrorShownRef = useRef(false);
  const refreshRetryRef = useRef(false);

  const getToken = async () => {
    if (session?.access_token) return session.access_token;
    const { data: { session: fallbackSession } } = await supabase.auth.getSession();
    return fallbackSession?.access_token ?? "";
  };

  // Check if current user is admin
  useEffect(() => {
    if (!currentUser) return;
    supabase
      .from("user_roles")
      .select("role_id,roles(name)")
      .eq("user_id", currentUser.id)
      .then(({ data }: any) => {
        const roles = (data ?? []).map((r: any) => r.roles?.name);
        setIsAdmin(
          roles.some((name: string) =>
            ["SuperAdmin", "Super Admin", "System Admin", "ADMIN"].includes(name)
          )
        );
      });
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const { ok, data, status } = await callAdminFunction("admin-list-users", {}, token);
      if (!ok) {
        if (status === 401) {
          if (!refreshRetryRef.current) {
            refreshRetryRef.current = true;
            const { data: { session: refreshed } } = await supabase.auth.refreshSession();
            if (refreshed?.access_token) {
              const retry = await callAdminFunction("admin-list-users", {}, refreshed.access_token);
              if (retry.ok) { setUsers(retry.data.users ?? []); return; }
            }
          }
          if (!authErrorShownRef.current) {
            authErrorShownRef.current = true;
            throw new Error(data?.details || data?.message || data?.error || "Session expired.");
          }
          await signOut();
          return;
        }
        throw new Error(data?.details || data?.message || data?.error || "Failed to fetch users");
      }
      setUsers(data.users ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    if (lastUserIdRef.current === currentUser.id) return;
    lastUserIdRef.current = currentUser.id;
    fetchUsers();
  }, [currentUser?.id]);

  useRealtimeRefresh({
    channelName: "users-table-realtime",
    subscriptions: [{ table: "user_roles" }, { table: "profiles" }],
    onRefresh: fetchUsers,
    enabled: Boolean(currentUser?.id && isAdmin),
  });

  const getUserRole = (u: User) => {
    const roles = u.roles ?? [];
    const roleNames = roles.map((r) => String(r.role?.name || "").toUpperCase());
    if (roleNames.some((r) => ["SUPERADMIN", "SUPER ADMIN", "SYSTEM ADMIN", "ADMIN"].includes(r))) return "ADMIN";
    if (roleNames.some((r) => r === "TREASURER")) return "TREASURER";
    if (roleNames.some((r) => r === "CLERK")) return "CLERK";
    return "VIEWER";
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast({ title: "Forbidden", description: "Only admins can create users", variant: "destructive" });
      return;
    }

    const errors: string[] = [];
    if (form.password.length < 8) errors.push("Password must be at least 8 characters");
    if (!/[A-Z]/.test(form.password)) errors.push("Password must contain uppercase letter");
    if (!/[a-z]/.test(form.password)) errors.push("Password must contain lowercase letter");
    if (!/[0-9]/.test(form.password)) errors.push("Password must contain number");
    if (errors.length > 0) { setPasswordErrors(errors); return; }

    try {
      const token = await getToken();
      const { ok, data } = await callAdminFunction("admin-create-user", {
        email: form.email, password: form.password, full_name: form.full_name,
        role: form.role, scope_type: "global", scope_id: null,
      }, token);
      if (!ok) throw new Error(data.error || "Failed to create user");
      toast({ title: "User added", description: `${form.email} added as ${form.role}` });
      setForm({ email: "", password: "", full_name: "", role: "VIEWER" });
      setPasswordErrors([]);
      setOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const handleSetRole = async (user: User, newRole: string) => {
    if (!user.id || !isAdmin) return;
    setLoadingId(user.id);
    try {
      const token = await getToken();
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id, name")
        .eq("name", newRole)
        .maybeSingle();
      if (roleError || !roleData?.id) throw new Error("Target role not found");

      // Revoke existing global role assignments for this user before assigning a replacement.
      const existingGlobalAssignments = (user.roles ?? []).filter((r) => !r.scope_type || r.scope_type === "global");
      for (const assignment of existingGlobalAssignments) {
        const revokeResponse = await callAdminFunction("admin-manage-roles", {
          action: "revoke_role",
          id: assignment.id,
        }, token);
        if (!revokeResponse.ok) {
          throw new Error(revokeResponse.data?.error || "Failed to revoke existing role");
        }
      }

      const { ok, data } = await callAdminFunction("admin-manage-roles", {
        action: "assign_role",
        user_id: user.id,
        role_id: roleData.id,
        scope_type: "global",
        scope_id: null,
      }, token);
      if (!ok) throw new Error(data?.error || "Failed to assign role");
      toast({ title: "Role updated", description: `User role changed to ${newRole}` });
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!isAdmin) return;
    if (!confirm(`Delete user ${email}? This action cannot be undone.`)) return;
    setLoadingId(userId);
    try {
      const token = await getToken();
      const { ok, data } = await callAdminFunction("admin-delete-user", { target_user_id: userId }, token);
      if (!ok) throw new Error(data.error || "Failed to delete user");
      toast({ title: "User deleted", description: `${email} has been removed` });
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  const handleResendActivationEmail = async (userId: string, email: string) => {
    if (!isAdmin) return;
    setLoadingId(userId);
    try {
      const token = await getToken();
      const { ok, data } = await callAdminFunction("admin-resend-activation", { target_user_id: userId }, token);
      if (!ok) throw new Error(data.error || "Failed to resend activation email");
      toast({ title: "Email sent", description: `Activation email resent to ${email}` });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  const handleUpdateUserPassword = async () => {
    if (!passwordTargetUser?.id || !isAdmin) return;
    const errors: string[] = [];
    const password = passwordUpdateForm.new_password;
    if (password.length < 8) errors.push("Password must be at least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("Must contain uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("Must contain lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("Must contain number");
    if (password !== passwordUpdateForm.confirm_password) errors.push("Passwords don't match");
    if (errors.length > 0) { setPasswordUpdateErrors(errors); return; }

    setLoadingId(passwordTargetUser.id);
    try {
      const token = await getToken();
      const { ok, data } = await callAdminFunction("admin-update-user-password", {
        target_user_id: passwordTargetUser.id, new_password: password,
      }, token);
      if (!ok) throw new Error(data.error || "Failed to update password");
      toast({ title: "Password updated", description: `Password updated for ${passwordTargetUser.email}` });
      setPasswordDialogOpen(false);
      setPasswordUpdateForm({ new_password: "", confirm_password: "" });
      setPasswordUpdateErrors([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Manage user accounts and role assignments" icon={<Shield className="w-5 h-5" />} />

      {isAdmin && (
        <div className="mb-6 space-y-3">
          <div className="bg-muted border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Workflow:</strong> New users are auto-assigned the VIEWER role. Use this page to manage accounts and change roles.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} />Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div><Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm(s => ({ ...s, email: e.target.value }))} placeholder="user@example.com" required /></div>
                <div><Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" value={form.full_name} onChange={(e) => setForm(s => ({ ...s, full_name: e.target.value }))} placeholder="John Doe" /></div>
                <div><Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={form.password} onChange={(e) => setForm(s => ({ ...s, password: e.target.value }))} placeholder="Min 8 chars" required /></div>
                {passwordErrors.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    {passwordErrors.map((error, idx) => (<p key={idx} className="text-sm text-destructive">• {error}</p>))}
                  </div>
                )}
                <div><Label htmlFor="role">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm(s => ({ ...s, role: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((role) => (<SelectItem key={role} value={role}>{role}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Create User</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2"><Shield size={20} />Application Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-muted-foreground" />
                        <span className="font-medium text-sm">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.confirmed_at
                        ? <Badge variant="default" className="text-xs">Confirmed</Badge>
                        : <Badge variant="secondary" className="text-xs">Pending</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {isAdmin && u.id !== currentUser?.id && (
                          <Select value={getUserRole(u)} onValueChange={(role) => handleSetRole(u, role)} disabled={loadingId === u.id}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE_ROLES.map((role) => (<SelectItem key={role} value={role}>{role}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        )}
                        {(!isAdmin || u.id === currentUser?.id) && (
                          <Badge variant="secondary">{getUserRole(u)}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.id !== currentUser?.id && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              setPasswordTargetUser(u);
                              setPasswordUpdateForm({ new_password: "", confirm_password: "" });
                              setPasswordUpdateErrors([]);
                              setPasswordDialogOpen(true);
                            }} disabled={loadingId === u.id} title="Update password">
                              <KeyRound size={16} />
                            </Button>
                          )}
                          {!u.confirmed_at && (
                            <Button variant="ghost" size="sm" onClick={() => handleResendActivationEmail(u.id, u.email)} disabled={loadingId === u.id} title="Resend activation">
                              <MailPlus size={16} />
                            </Button>
                          )}
                          {u.id !== currentUser?.id && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.id, u.email)} disabled={loadingId === u.id} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update User Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{passwordTargetUser?.email}</div>
            <div><Label>New Password</Label>
              <Input type="password" value={passwordUpdateForm.new_password} onChange={(e) => setPasswordUpdateForm(s => ({ ...s, new_password: e.target.value }))} /></div>
            <div><Label>Confirm Password</Label>
              <Input type="password" value={passwordUpdateForm.confirm_password} onChange={(e) => setPasswordUpdateForm(s => ({ ...s, confirm_password: e.target.value }))} /></div>
            {passwordUpdateErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {passwordUpdateErrors.map((err, idx) => (<p key={idx} className="text-sm text-destructive">• {err}</p>))}
              </div>
            )}
            <Button onClick={handleUpdateUserPassword} disabled={!passwordTargetUser || loadingId === passwordTargetUser?.id} className="w-full">Update Password</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
