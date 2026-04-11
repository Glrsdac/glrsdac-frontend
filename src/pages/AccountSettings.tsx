import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
// Supabase client removed. All data and auth operations now use backend API.
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogOut, ArrowLeft, Shield, Users, Moon, Sun } from "lucide-react";

const THEME_STORAGE_KEY = "glrsdac-theme";

interface SimpleRole {
  id: string;
  role: string;
}

interface DepartmentMember {
  id: number;
  department_id: number;
  assigned_role?: string;
  departments?: {
    id: number;
    name: string;
  };
}

export default function AccountSettings() {
    // Handle profile update form submission
    const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      try {
        // Update full name in members table via backend API
        if (memberInfo && memberInfo.id) {
          const res = await fetch(`/api/members/${memberInfo.id}/`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ full_name: formData.fullName })
          });
          if (!res.ok) {
            const err = await res.json();
            toast({ title: "Update failed", description: err.detail || "Unknown error", variant: "destructive" });
          } else {
            toast({ title: "Profile updated", description: "Your full name was updated." });
          }
        }
      } catch (err: any) {
        toast({ title: "Update failed", description: err.message || "Unknown error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(true);

  const [userRoles, setUserRoles] = useState<SimpleRole[]>([]);
  const [userDepartments, setUserDepartments] = useState<DepartmentMember[]>([]);
  const [memberInfo, setMemberInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    createdAt: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profileMode, setProfileMode] = useState<"member" | "manager">(() => {
    const saved = localStorage.getItem("sidebar-profile-mode");
    return saved === "manager" ? "manager" : "member";
  });

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      setIsDarkMode(savedTheme === "dark");
      return;
    }
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "sidebar-profile-mode") {
        setProfileMode(event.newValue === "manager" ? "manager" : "member");
      }
    };

    const handleProfileModeChanged = (event: Event) => {
      const customEvent = event as CustomEvent<"member" | "manager">;
      const nextMode = customEvent.detail === "manager" ? "manager" : "member";
      setProfileMode(nextMode);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("sidebar-profile-mode-changed", handleProfileModeChanged as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("sidebar-profile-mode-changed", handleProfileModeChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user?.id) return;
    setLoadingUserData(true);

    try {
      // Fetch user roles with join to roles table
      let rolesData = null;
      try {
        // Fetch user roles from backend API
        const rolesRes = await fetch(`/api/user-roles/?user_id=${user.id}`, { credentials: "include" });
        let rolesData = [];
        if (rolesRes.ok) {
          rolesData = await rolesRes.json();
        }
        setUserRoles(rolesData.map((r: any) => ({ id: r.id, role: r.role || r.role_id || 'Unknown' })) as SimpleRole[]);

        // Fetch member profile information from backend API
        const memberRes = await fetch(`/api/members/?user_id=${user.id}`, { credentials: "include" });
        let memberData = null;
        if (memberRes.ok) {
          const arr = await memberRes.json();
          memberData = arr && arr.length > 0 ? arr[0] : null;
        }
        setMemberInfo(memberData);

        // Fetch department memberships from backend API
        if (memberData && memberData.id) {
          const deptRes = await fetch(`/api/department-members/?member_id=${memberData.id}`, { credentials: "include" });
          if (deptRes.ok) {
            setUserDepartments(await deptRes.json());
          } else {
            setUserDepartments([]);
          }
        } else {
          setUserDepartments([]);
        }
      } catch (error) {
        setUserRoles([]);
        setMemberInfo(null);
        setUserDepartments([]);
        console.error("Error fetching user data:", error);
      } finally {
        setLoadingUserData(false);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoadingUserData(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      const res = await fetch(`/api/auth/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: user?.email, redirectTo: `${window.location.origin}/auth?type=reset` })
      });
      if (!res.ok) throw new Error("Failed to send reset email");
      toast({ title: "Success", description: "Password reset email has been sent to your email address." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send reset email", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      toast({ title: "Account Deletion Requested", description: "Please contact administrator to delete your account." });
      setDeleteConfirm(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to process deletion request", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
    window.localStorage.setItem(THEME_STORAGE_KEY, checked ? "dark" : "light");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Account Settings" description="Manage your account settings and preferences">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </PageHeader>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" type="text" placeholder="Enter your full name" value={formData.fullName} onChange={(e) => setFormData(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={formData.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email addresses cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="createdAt">Account Created</Label>
                <Input id="createdAt" type="text" value={formData.createdAt} disabled className="bg-muted" />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>) : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Editable Member Information Section */}
      {memberInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Information
            </CardTitle>
            <CardDescription>Update your member profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                try {
                  const updateFields = {
                    first_name: memberInfo.first_name,
                    last_name: memberInfo.last_name,
                    phone: memberInfo.phone,
                    dob: memberInfo.dob,
                  };
                  const res = await fetch(`/api/members/${memberInfo.id}/`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(updateFields)
                  });
                  if (!res.ok) throw new Error("Failed to update member info");
                  toast({ title: "Success", description: "Member information updated." });
                  fetchUserData();
                } catch (error: any) {
                  toast({ title: "Error", description: error.message || "Failed to update member info", variant: "destructive" });
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="member_no">Member Number</Label>
                  <Input id="member_no" type="text" value={memberInfo.member_no || ""} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="text" value={memberInfo.phone || ""} onChange={e => setMemberInfo((m: any) => ({ ...m, phone: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={memberInfo.email || ""} onChange={e => setMemberInfo((m: any) => ({ ...m, email: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={memberInfo.dob ? memberInfo.dob.slice(0, 10) : ""} onChange={e => setMemberInfo((m: any) => ({ ...m, dob: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" type="text" value={memberInfo.position || ""} onChange={e => setMemberInfo((m: any) => ({ ...m, position: e.target.value }))} />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Input id="status" type="text" value={memberInfo.status || ""} onChange={e => setMemberInfo((m: any) => ({ ...m, status: e.target.value }))} />
                </div>
                // ...existing code...
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>) : "Update Member Info"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>Choose how the app looks on your device</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-medium">
                {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                Theme
              </div>
              <p className="text-sm text-muted-foreground">{isDarkMode ? "Dark mode enabled" : "Light mode enabled"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Light</span>
              <Switch checked={isDarkMode} onCheckedChange={handleThemeToggle} aria-label="Toggle dark mode" />
              <span className="text-xs text-muted-foreground">Dark</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Roles
          </CardTitle>
          <CardDescription>Your assigned roles</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUserData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : userRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles assigned</p>
          ) : (
            <div className="space-y-2">
              {userRoles.map((userRole) => (
                <div key={userRole.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{userRole.role}</p>
                  <Badge variant="default">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Memberships Section */}
      {userDepartments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Department Memberships</CardTitle>
            <CardDescription>Departments you are a member of</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userDepartments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{dept.departments?.name || "Unknown Department"}</p>
                    {dept.assigned_role && (
                      <p className="text-xs text-muted-foreground">Role: {dept.assigned_role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-6" />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security</CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordForm ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Change your password to enhance account security</p>
              <Button variant="outline" onClick={() => setShowPasswordForm(true)}>Change Password</Button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" placeholder="Enter your current password (optional)" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" placeholder="Enter new password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" placeholder="Confirm new password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
              </div>
              {passwordErrors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  {passwordErrors.map((error, idx) => (<p key={idx} className="text-sm text-destructive">• {error}</p>))}
                </div>
              )}
              <div className="bg-muted border rounded-md p-3 text-sm">
                <strong>Password requirements:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                  <li>At least 8 characters</li>
                  <li>One uppercase letter (A-Z)</li>
                  <li>One lowercase letter (a-z)</li>
                  <li>One number (0-9)</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>) : "Update Password"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowPasswordForm(false); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setPasswordErrors([]); }}>Cancel</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Sign Out Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session</CardTitle>
          <CardDescription>Manage your active session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account Section */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Once you delete your account, there is no going back.</p>
          <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>Delete Account</Button>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
            Type your email address to confirm: <span className="font-semibold">{user?.email}</span>
          </div>
          <div className="space-y-2">
            <Input placeholder="Confirm your email address" id="confirm-email" />
          </div>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>) : "Delete Account"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
