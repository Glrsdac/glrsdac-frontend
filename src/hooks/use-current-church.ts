import { useEffect, useState } from "react";
import { useAuth } from "./use-auth";

export interface Church {
  id: string;
  name: string;
  address?: string;
  organization_id?: string;
  organization?: { name: string; type: string };
}

export interface UserChurchContext {
  church_id: string;
  is_default: boolean;
  church: Church;
}

/**
 * Hook to get the current church context for superadmin users
 * Returns the church that the superadmin has selected to manage
 */
export const useCurrentChurch = () => {
  const { user } = useAuth();
  const [currentChurch, setCurrentChurch] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentChurch = async () => {
    if (!user?.id) {
      setCurrentChurch(null);
      setLoading(false);
      return;
    }

    try {
      // Get the user's church context from backend API
      const res = await fetch(`/api/church-context/`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCurrentChurch(data.church || null);
      } else {
        setCurrentChurch(null);
      }
    } catch (error) {
      console.error("Error in fetchCurrentChurch:", error);
      setCurrentChurch(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentChurch();
  }, [user?.id]);

  // Listen for manual event only (no realtime)
  useEffect(() => {
    if (!user?.id) return;
    const onUpdate = () => {
      fetchCurrentChurch();
    };
    window.addEventListener("church-context-updated", onUpdate);
    return () => {
      window.removeEventListener("church-context-updated", onUpdate);
    };
  }, [user?.id]);

  return {
    currentChurch,
    loading,
    refetch: fetchCurrentChurch
  };
};