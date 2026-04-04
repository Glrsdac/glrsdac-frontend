import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export function DebugBanner() {
  const { session, user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  // Toggle visibility with Ctrl+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        setIsVisible(!isVisible);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  if (!isVisible) return null;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "unknown";
  const projectUrl = import.meta.env.VITE_SUPABASE_URL || "unknown";

  return (
    <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-4 rounded-lg text-xs max-w-sm border border-slate-700 z-[9999] font-mono">
      <div className="mb-2 font-bold">🔍 Debug Info (Ctrl+D to toggle)</div>
      <div className="space-y-1">
        <div>
          <span className="text-slate-400">Project ID:</span>
          <span className="ml-2 text-blue-400 break-all">{projectId}</span>
        </div>
        <div>
          <span className="text-slate-400">Project URL:</span>
          <span className="ml-2 text-blue-400 break-all">{projectUrl}</span>
        </div>
        <div>
          <span className="text-slate-400">User Email:</span>
          <span className="ml-2 text-green-400">{user?.email || "not logged in"}</span>
        </div>
        <div>
          <span className="text-slate-400">User ID:</span>
          <span className="ml-2 text-green-400 break-all">{user?.id || "—"}</span>
        </div>
        <div>
          <span className="text-slate-400">Token Exp:</span>
          <span className="ml-2 text-yellow-400">
            {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleTimeString() : "—"}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Has Session:</span>
          <span className={`ml-2 ${session ? "text-green-400" : "text-red-400"}`}>
            {session ? "✓ Yes" : "✗ No"}
          </span>
        </div>
      </div>
    </div>
  );
}
