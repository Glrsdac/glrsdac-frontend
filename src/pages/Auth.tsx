import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Church, Lock, Mail, User, ArrowLeft, Loader2 } from "lucide-react";

/**
 * Auth page: Login + Signup + Password reset UI.
 *
 * Responsibilities:
 * - Handle member login via Supabase Auth
 * - Trigger the signup invitation flow via `request-signup` edge function
 * - Provide "forgot password" UX using Supabase password reset email flow
 *
 * Note:
 * - Signup invitation is validated against the `members` table by the edge function.
 */
const Auth = () => {
  // UI state: loading spinners + form fields
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // Router + toast utilities
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Env: Supabase anonymous key (sometimes present under older env var names)
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  /**
   * Login handler:
   * - Prevent default form submit
   * - Sign in using email/password
   * - Redirect to last visited route (if safe) or to `/`
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      // Attempt to restore navigation intent from stored state.
      const state = location.state as { from?: string } | null;
      const fromState = String(state?.from ?? "").trim();
      const savedRoute = String(localStorage.getItem("last-visited-app-route") ?? "").trim();
      const preferredRoute = [fromState, savedRoute].find(
        (route) => route.startsWith("/") && !route.startsWith("/auth") && !route.startsWith("/signup")
      );
      navigate(preferredRoute || "/", { replace: true });
    }
    setLoading(false);
  };

  /**
   * Signup handler:
   * - Calls the public `request-signup` edge function
   * - Edge function validates that the name matches a record in `members`
   * - Returns an invite status and (typically) triggers an email
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
          body: JSON.stringify({ email: signupEmail.trim(), full_name: signupFullName.trim() }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        toast({ title: "Signup failed", description: data.error || "Unable to process signup request", variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: data.message || "A signup invitation has been sent." });
        setSignupEmail(""); setSignupFullName("");
      }
    } catch {
      toast({ title: "Signup failed", description: "Please contact the Admin or Church Leaders.", variant: "destructive" });
    }
    setLoading(false);
  };

  /**
   * Forgot password handler:
   * - Requests a Supabase password reset email
   * - Uses `redirectTo` so Supabase will send users back to `/auth?type=reset`
   */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth?type=reset`,
      });
      if (error) throw error;
      toast({ title: "Success", description: "Password reset instructions have been sent to your email." });
      setForgotEmail(""); setShowForgotPassword(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send reset email", variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  // Render helper: which form to show depends on tab + forgot-password toggle.
  const formFields = (
    <>
      {showForgotPassword ? (
        <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="text-sm font-medium">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Enter your email" required className="pl-10" />
            </div>
            <p className="text-xs text-muted-foreground">We'll send you a link to reset your password</p>
          </div>
          <Button type="submit" className="w-full h-11" disabled={forgotLoading}>
            {forgotLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : "Send Reset Link"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => { setShowForgotPassword(false); setForgotEmail(""); }}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
          </Button>
        </form>
      ) : activeTab === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" placeholder="you@church.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10" placeholder="••••••••" />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
          </Button>
          <Button type="button" variant="link" className="w-full text-sm text-muted-foreground hover:text-primary" onClick={() => setShowForgotPassword(true)}>
            Forgot your password?
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name" className="text-sm font-medium">Full Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="signup-name" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} placeholder="John Doe" required className="pl-10" />
            </div>
            <p className="text-xs text-muted-foreground">Enter your name as it appears in the church members list</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-sm font-medium">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="john@example.com" required className="pl-10" />
            </div>
            <p className="text-xs text-muted-foreground">Only registered church members can create accounts.</p>
          </div>
          <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : "Request Account"}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            You will receive an email invitation to complete your account setup.
          </p>
        </form>
      )}
    </>
  );

  // Shared header content displayed above forms.
  const authHeader = (
    <CardHeader className="text-center space-y-3 relative z-10 pb-2">
      <div className="mx-auto mb-1 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/5">
        <img src="/glrsdac_logo_icon_only.png" alt="GLRSDAC" className="h-14 w-14 object-contain" />
      </div>
      <div>
        <CardTitle className="font-heading text-2xl">GLRSDAC Portal</CardTitle>
        <CardDescription className="text-sm">Gloryland Seventh-Day Adventist Church</CardDescription>
      </div>
    </CardHeader>
  );

  return (
    <div className="min-h-screen bg-background px-4 py-6 lg:px-8">
      {/* Mobile layout: single card with tabs */}
      {/* Mobile layout */}
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center lg:hidden">
        <Card className="w-full max-w-md animate-fade-in relative overflow-hidden border-border/60 shadow-xl shadow-primary/5">
          <div className="auth-watermark top-0 bottom-auto h-48" aria-hidden="true">
            <div className="auth-watermark-glow" />
            <img src="/SDA%20logo/adventist-en-centered--bluejay.svg" alt="" className="auth-watermark-logo" />
          </div>
          {authHeader}
          <CardContent className="relative z-10 px-6 pb-8">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="login" className="text-sm font-medium">Login</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm font-medium">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">{formFields}</TabsContent>
              <TabsContent value="signup">{formFields}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Desktop layout: split panel with sliding form panel */}
      {/* Desktop layout */}
      <div className="mx-auto hidden min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center lg:flex">
        <div className="relative h-[640px] w-full overflow-hidden rounded-2xl border border-border/40 shadow-2xl shadow-primary/10">
          {/* Sliding panel */}
          <div className={`absolute top-0 h-full w-1/2 bg-primary overflow-hidden transition-all duration-700 ease-in-out ${activeTab === "login" ? "left-0" : "left-1/2"}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary to-primary/80" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
            
            <div className="auth-watermark opacity-100" aria-hidden="true">
              <div className="auth-watermark-glow" />
              <img src="/SDA%20logo/adventist-en-centered--bluejay.svg" alt="" className="w-[320px] h-[320px] object-contain opacity-[0.08] brightness-0 invert animate-[auth-watermark-float_8s_ease-in-out_infinite]" />
            </div>
            
            <div className="relative z-10 flex h-full flex-col items-center justify-center px-12 text-center">
              <div className="mb-6 inline-flex items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-5 py-1.5 text-xs font-semibold tracking-[0.2em] text-primary-foreground/90 uppercase">
                GLRSDAC
              </div>
              <img src="/glrsdac_logo_icon_only.png" alt="GLRSDAC" className="mx-auto mb-6 h-24 w-24 object-contain brightness-0 invert drop-shadow-lg" />
              <h2 className="font-heading text-4xl leading-tight text-primary-foreground">
                Church Management<br />Portal
              </h2>
              <p className="mt-4 max-w-sm text-primary-foreground/75 text-base leading-relaxed">
                Unified access for membership records, department operations, financial stewardship, and ministry coordination.
              </p>
              <div className="mt-8 flex items-center gap-3 text-primary-foreground/50 text-xs">
                <Church className="w-4 h-4" />
                <span>Seventh-Day Adventist Church</span>
              </div>
            </div>
          </div>

          {/* Form panel */}
          <Card className={`absolute top-0 h-full w-1/2 rounded-none border-0 shadow-none transition-all duration-700 ease-in-out flex flex-col justify-center ${activeTab === "login" ? "left-1/2" : "left-0"}`}>
            {authHeader}
            <CardContent className="relative z-10 px-10 pb-8">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
                <TabsList className="grid w-full grid-cols-2 h-11">
                  <TabsTrigger value="login" className="text-sm font-medium">Login</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="login">{formFields}</TabsContent>
                <TabsContent value="signup">{formFields}</TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
