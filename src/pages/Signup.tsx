import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Church, CheckCircle, Loader2 } from "lucide-react";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [isValid, setIsValid] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    // Get email and token from URL params
    const emailParam = searchParams.get("email")?.trim();
    const tokenParam =
      searchParams.get("token")?.trim() || searchParams.get("invite_token")?.trim();

    if (!emailParam || !tokenParam) {
      toast({
        title: "Invalid Link",
        description: "This activation link is missing required information.",
        variant: "destructive",
      });
      setValidating(false);
      return;
    }

    setEmail(emailParam);
    setInviteToken(tokenParam);
    setIsValid(true);
    setValidating(false);
  }, [searchParams, toast]);

  const validatePassword = (pwd: string): { valid: boolean; message?: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters" };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one number" };
    }
     if (!/[^a-zA-Z0-9]/.test(pwd)) {
      return { valid: false, message: "Password must contain at least one special character" };
    }
    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      toast({
        title: "Invalid Password",
        description: passwordCheck.message,
        variant: "destructive",
      });
      return;
    }

    // Check password match
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !anonKey) {
        toast({
          title: "Configuration Error",
          description: "Signup service is not configured. Please contact your administrator.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call complete-signup edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            email,
            password,
            invite_token: inviteToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Activation Failed",
          description: data.error || "Unable to activate your account. The link may have expired.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Success!
      toast({
        title: "Account Activated!",
        description: "Your account has been created successfully. Redirecting to login...",
      });

      // Wait a moment then redirect to login
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (err: any) {
      toast({
        title: "Activation Failed",
        description: "An error occurred while activating your account. Please try again.",
        variant: "destructive",
      });
      console.error("Signup completion error:", err);
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Validating your invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-destructive/10 rounded-xl flex items-center justify-center mb-2">
              <Church className="w-7 h-7 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation Link</CardTitle>
            <CardDescription>
              This link is invalid or has expired. Please contact an administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="w-full lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-0">
          <div className="hidden lg:flex min-h-[620px] h-[620px] items-center justify-center rounded-l-2xl rounded-r-none border border-border/60 bg-primary relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/20 to-primary/60" aria-hidden="true" />
            <div className="auth-watermark opacity-100" aria-hidden="true">
              <div className="auth-watermark-glow" />
              <img
                src="/SDA%20logo/adventist-en-centered--bluejay.svg"
                alt="Adventist logo"
                className="w-[360px] h-[360px] object-contain opacity-20 brightness-0 invert animate-[auth-watermark-float_8s_ease-in-out_infinite]"
              />
            </div>
            <div className="relative z-10 px-10 text-center">
              <div className="mb-5 inline-flex items-center rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-1 text-xs font-medium tracking-[0.16em] text-primary-foreground/90">
                ACCOUNT ACTIVATION
              </div>
              <img
                src="/glrsdac_logo_icon_only.png"
                alt="GLRSDAC"
                className="mx-auto mb-6 h-24 w-24 object-contain brightness-0 invert"
              />
              <h2 className="font-heading text-4xl leading-tight text-primary-foreground">Complete Account Setup</h2>
              <p className="mt-3 max-w-sm text-primary-foreground/85 text-base">
                Finalize your portal credentials to access your assigned church workflows.
              </p>
            </div>
          </div>

          <Card className="w-full max-w-md mx-auto lg:mx-0 lg:justify-self-stretch lg:max-w-none lg:h-[620px] lg:rounded-l-none animate-fade-in relative overflow-hidden">
            <div className="auth-watermark lg:hidden top-0 bottom-auto h-64" aria-hidden="true">
              <div className="auth-watermark-glow" />
              <img
                src="/SDA%20logo/adventist-en-centered--bluejay.svg"
                alt="Adventist watermark"
                className="auth-watermark-logo"
              />
            </div>
            <CardHeader className="text-center space-y-2 relative z-10">
              <div className="mx-auto mb-2 flex h-28 w-28 items-center justify-center">
                <img
                  src="/glrsdac_logo_icon_only.png"
                  alt="GLRSDAC Church Icon"
                  className="h-28 w-28 object-contain scale-[2] -translate-y-1 transform-gpu"
                />
              </div>
              <CardTitle className="font-heading text-2xl">Activate Your Account</CardTitle>
              <CardDescription>Gloryland Seventh-Day Adventist Church</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating Account...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate Account
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="text-primary hover:underline"
              >
                Login here
              </button>
            </div>
          </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;
