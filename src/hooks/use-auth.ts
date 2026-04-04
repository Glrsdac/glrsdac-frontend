import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { jwtDecode } from "jwt-decode";

/**
 * useAuth hook
 *
 * Keeps the authenticated Supabase session in React state and provides:
 * - `session` (Supabase Session or null)
 * - `loading` (true while the session is being initialized)
 * - `user` (session.user or null)
 * - `signOut()` helper
 *
 * Security detail:
 * - `isSessionForProject()` attempts to reject sessions that appear to belong to a different
 *   Supabase project (based on token issuer/ref claims).
 * - On detection of invalid refresh tokens, local/session storage is cleared to recover.
 */
type JwtPayload = {
  iss?: string;
  ref?: string;
  exp?: number;
};

/** Determine Supabase project id either from explicit env or from the URL hostname. */
const getProjectId = () => {
  const envProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (envProjectId) return envProjectId;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) return "";

  try {
    const host = new URL(url).hostname;
    return host.split(".")[0] ?? "";
  } catch {
    return "";
  }
};

/**
 * Heuristic validation to avoid mixing sessions across Supabase projects.
 * If it can't validate, it returns true to avoid breaking existing auth unexpectedly.
 */
const isSessionForProject = (session: Session | null) => {
  if (!session?.access_token) return true;
  const projectId = getProjectId();
  if (!projectId) return true;

  try {
    const payload = jwtDecode<JwtPayload>(session.access_token);
    const iss = payload.iss ?? "";
    const ref = payload.ref ?? "";
    if (ref && ref !== projectId) return false;
    if (iss && !iss.includes(projectId)) return false;
  } catch {
    return false;
  }

  return true;
};

export function useAuth() {
  // Session and initialization status for UI routing.
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the stored refresh token is invalid, we attempt to clear local/session storage.
    const clearStaleLocalSession = async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore cleanup failures
      }

      const projectId = getProjectId();
      const fallbackKeys = [
        "supabase.auth.token",
        projectId ? `sb-${projectId}-auth-token` : "",
      ].filter(Boolean);

      fallbackKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    };

    // Central handler for whenever Supabase reports a session change.
    const handleSession = async (nextSession: Session | null) => {
      // If the session doesn't match the expected project, force sign-out and clear session state.
      if (!isSessionForProject(nextSession)) {
        await supabase.auth.signOut();
        setSession(null);
      } else {
        setSession(nextSession);
      }
      setLoading(false);
    };

    // Subscribe to auth changes (login, logout, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void handleSession(nextSession);
    });

    // Load the initial session once on mount.
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error?.message?.toLowerCase().includes("invalid refresh token")) {
        await clearStaleLocalSession();
        setSession(null);
        setLoading(false);
        return;
      }

      void handleSession(session);
    });

    // Cleanup: unsubscribe on unmount.
    return () => subscription.unsubscribe();
  }, []);

  /** Sign out the user. */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Expose stable values to consuming components.
  return { session, loading, signOut, user: session?.user ?? null };
}
