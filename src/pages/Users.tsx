import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from '@supabase/supabase-js';
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
import { Plus, Trash2, Shield, Mail, MailPlus, KeyRound, Building2, Users as UsersIcon, Filter } from "lucide-react";
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
  organization?: { id: string; name: string; type: string } | null;
  church?: { id: string; name: string } | null;
};

type Organization = {
  id: string;
  name: string;
  type: string;
  code?: string;
};

type Church = {
  id: string;
  name: string;
  organization_id?: string;
};

const ASSIGNABLE_ROLES = ["ADMIN", "TREASURER", "CLERK", "VIEWER"] as const;

const callAdminFunction = async (fnName: string, body: object = {}, token?: string) => {
  if (!token) {
    console.error(`[admin] Missing auth token for ${fnName}`);
    return { ok: false, data: { error: "Missing auth token" }, status: 401 };
  }

  console.log(`[admin] Calling ${fnName} with token (len=${token.length}, preview=${token.substring(0, 20)}...)`);

  try {
    // Use direct fetch instead of supabase.functions.invoke() to avoid automatic
    // Authorization header that causes "invalid session" 401 errors.
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/${fnName}`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-token': token,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[admin] Function ${fnName} returned ${response.status}:`, data);
      return { ok: false, data, status: response.status };
    }

    console.log(`[admin] Function ${fnName} succeeded`);
    return { ok: true, data, status: response.status };
  } catch (error) {
    console.error(`[admin] Function ${fnName} error:`, error);
    return { ok: false, data: { error: error instanceof Error ? error.message : String(error) }, status: 500 };
  }
};

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "VIEWER", organization_id: "", church_id: "" });
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [passwordUpdateForm, setPasswordUpdateForm] = useState({ new_password: "", confirm_password: "" });
  const [passwordUpdateErrors, setPasswordUpdateErrors] = useState<string[]>([]);
  const [filterOrg, setFilterOrg] = useState<string>("");
  const [filterChurch, setFilterChurch] = useState<string>("");
  const { toast } = useToast();
  const { user: currentUser, session, signOut } = useAuth();
  const lastUserIdRef = useRef<string | null>(null);
  const authErrorShownRef = useRef(false);
  const refreshRetryRef = useRef(false);

  const getToken = async () => {
    if (session?.access_token) {
      console.log("[admin] Token from session context");
      return session.access_token;
    }
    const { data: { session: fallbackSession } } = await supabase.auth.getSession();
    if (fallbackSession?.access_token) {
      console.log("[admin] Token from fallback getSession");
      return fallbackSession.access_token;
    }
    console.warn("[admin] No token available from session or fallback");
    return "";
  };

  // Check if current user is admin/superadmin
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
            ["SuperAdmin", "Super Admin", "System Admin", "ADMIN", "Church Admin"].includes(name)
          )
        );
        setIsSuperAdmin(
          roles.some((name: string) =>
            ["SuperAdmin", "Super Admin", "System Admin"].includes(name)
          )
        );
      });
  }, [currentUser]);

  // Fetch organizations and churches for superadmin
  const fetchOrganizationsAndChurches = async () => {
    if (!isSuperAdmin) return;

    const [orgResult, churchResult] = await Promise.all([
      supabase.from("organizations").select("id, name, type, code").eq("is_active", true),
      supabase.from("churches").select("id, name, organization_id")
    ]);

    if (orgResult.data) setOrganizations(orgResult.data);
    if (churchResult.data) setChurches(churchResult.data);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizationsAndChurches();
    }
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const { ok, data, status } = await callAdminFunction("admin-list-users", {}, token);
      if (!ok) {
        if (status === 401) {
          const msg = data?.details || data?.message || data?.error || "Unauthorized";
          console.warn(`[admin] 401 from admin-list-users: ${msg}`);
          toast({ title: "Session issue", description: "Please sign out and sign in again.", variant: "destructive" });

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
            throw new Error(msg || "Session expired.");
          }
          await signOut();
          return;
        }

        throw new Error(data?.details || data?.message || data?.error || "Failed to fetch users");
      }

      let usersData = data.users ?? [];

      // For superadmin, enrich with organization and church info
      if (isSuperAdmin && usersData.length > 0) {
        const userIds = usersData.map((u: User) => u.id);

        // Get user roles with scope information
        const { data: userRolesData } = await supabase
          .from("user_roles")
          .select(`
            user_id,
            scope_type,
            scope_id,
            roles(name)
          `)
          .in("user_id", userIds)
          .eq("is_active", true);

        // Get organizations and churches for scope resolution
        const [orgData, churchData] = await Promise.all([
          supabase.from("organizations").select("id, name, type"),
          supabase.from("churches").select("id, name, organization_id")
        ]);

        const orgMap = new Map(orgData.data?.map(o => [o.id, o]) || []);
        const churchMap = new Map(churchData.data?.map(c => [c.id, c]) || []);

        usersData = usersData.map((user: User) => {
          const userRoles = userRolesData?.filter(ur => ur.user_id === user.id) || [];

          // Find primary organization and church from roles
          let organization = null;
          let church = null;

          for (const role of userRoles) {
            if (role.scope_type === "global") {
              // Global roles don't have specific org/church
              continue;
            } else if (role.scope_type === "church" && role.scope_id) {
              const churchInfo = churchMap.get(role.scope_id);
              if (churchInfo) {
                church = { id: churchInfo.id, name: churchInfo.name };
                const orgInfo = orgMap.get(churchInfo.organization_id);
                if (orgInfo) {
                  organization = { id: orgInfo.id, name: orgInfo.name, type: orgInfo.type };
                }
              }
            }
          }

          return {
            ...user,
            organization,
            church
          };
        });
      }

      setUsers(usersData);
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

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (filterOrg && user.organization?.id !== filterOrg) return false;
      if (filterChurch && user.church?.id !== filterChurch) return false;
      return true;
    });
  }, [users, filterOrg, filterChurch]);

  const availableChurches = useMemo(() => {
    if (!filterOrg) return churches;
    return churches.filter(church => church.organization_id === filterOrg);
  }, [churches, filterOrg]);

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

      // Determine scope based on superadmin selections
      let scope_type = "global";
      let scope_id = null;

      if (isSuperAdmin && form.church_id) {
        scope_type = "church";
        scope_id = form.church_id;
      } else if (isSuperAdmin && form.organization_id) {
        scope_type = "organization";
        scope_id = form.organization_id;
      }

      const { ok, data } = await callAdminFunction("admin-create-user", {
        email: form.email, password: form.password, full_name: form.full_name,
        role: form.role, scope_type, scope_id,
      }, token);
      if (!ok) throw new Error(data.error || "Failed to create user");
      toast({ title: "User added", description: `${form.email} added as ${form.role}` });
      setForm({ email: "", password: "", full_name: "", role: "VIEWER", organization_id: "", church_id: "" });
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
      <PageHeader
        title={isSuperAdmin ? "Global User Management" : "User Management"}
        description={isSuperAdmin ? "Manage users across all organizations and churches" : "Manage user accounts and role assignments"}
        icon={<Shield className="w-5 h-5" />}
      />

      {isAdmin && (
        <div className="mb-6 space-y-3">
          <div className="bg-muted border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Workflow:</strong> New users are auto-assigned the VIEWER role. Use this page to manage accounts and change roles.
              {isSuperAdmin && " As a superadmin, you can manage users across all organizations."}
            </p>
          </div>

          {/* Filters for SuperAdmin */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Organization</Label>
                    <Select value={filterOrg} onValueChange={(value) => {
                      setFilterOrg(value);
                      setFilterChurch(""); // Reset church filter when org changes
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Organizations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Organizations</SelectItem>
                        {organizations.map(org => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name} ({org.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Church</Label>
                    <Select value={filterChurch} onValueChange={setFilterChurch} disabled={!filterOrg}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Churches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Churches</SelectItem>
                        {availableChurches.map(church => (
                          <SelectItem key={church.id} value={church.id}>
                            {church.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

                {/* Organization/Church assignment for SuperAdmin */}
                {isSuperAdmin && (
                  <>
                    <div><Label htmlFor="organization">Organization</Label>
                      <Select value={form.organization_id} onValueChange={(v) => setForm(s => ({ ...s, organization_id: v, church_id: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (<SelectItem key={org.id} value={org.id}>{org.name} ({org.type})</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label htmlFor="church">Church</Label>
                      <Select
                        value={form.church_id}
                        onValueChange={(v) => setForm(s => ({ ...s, church_id: v }))}
                        disabled={!form.organization_id}
                      >
                        <SelectTrigger><SelectValue placeholder="Select church" /></SelectTrigger>
                        <SelectContent>
                          {churches.filter(c => c.organization_id === form.organization_id).map((church) => (
                            <SelectItem key={church.id} value={church.id}>{church.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full">Create User</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Shield size={20} />
            {isSuperAdmin ? "Global User Directory" : "Application Users"}
            {filteredUsers.length !== users.length && (
              <Badge variant="secondary" className="ml-2">
                {filteredUsers.length} of {users.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  {isSuperAdmin && <TableHead>Organization</TableHead>}
                  {isSuperAdmin && <TableHead>Church</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-muted-foreground" />
                        <span className="font-medium text-sm">{u.email}</span>
                      </div>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {u.organization ? (
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-muted-foreground" />
                            <span className="text-sm">{u.organization.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {u.organization.type}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Global</span>
                        )}
                      </TableCell>
                    )}
                    {isSuperAdmin && (
                      <TableCell>
                        {u.church ? (
                          <div className="flex items-center gap-2">
                            <UsersIcon size={14} className="text-muted-foreground" />
                            <span className="text-sm">{u.church.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}
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
                {filteredUsers.length === 0 && (
                  <TableRow><TableCell colSpan={isSuperAdmin ? 7 : 5} className="text-center text-muted-foreground py-8">
                    {users.length === 0 ? "No users found" : "No users match the current filters"}
                  </TableCell></TableRow>
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
