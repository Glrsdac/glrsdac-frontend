import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      // Get the user's church context
      const { data: contextData, error: contextError } = await supabase
        .from("user_church_context")
        .select(`
          church_id, is_default, created_at,
          church:churches(id, name, address, organization_id, organizations:organization_id(name, type))
        `)
        .eq("user_id", user.id)
        .order("is_default", { ascending: false }) // Prefer default church
        .order("created_at", { ascending: false }) // Fallback to most recently selected church
        .limit(1);

      if (contextError) {
        console.error("Error fetching church context:", contextError);
        setCurrentChurch(null);
      } else if (contextData && contextData.length > 0) {
        const context = contextData[0] as any;
        setCurrentChurch(context.church || null);
      } else {
        // No church context found, get the first available church
        const { data: churches, error: churchesError } = await supabase
          .from("churches")
          .select(`
            id, name, address, organization_id,
            organizations:organization_id(name, type)
          `)
          .limit(1);

        if (!churchesError && churches && churches.length > 0) {
          setCurrentChurch(churches[0] as Church);
        } else {
          setCurrentChurch(null);
        }
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

  // Listen for church context changes via Realtime + manual event.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user_church_context_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_church_context',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchCurrentChurch();
        }
      )
      .subscribe();

    const onUpdate = () => {
      fetchCurrentChurch();
    };

    window.addEventListener("church-context-updated", onUpdate);

    return () => {
      window.removeEventListener("church-context-updated", onUpdate);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return {
    currentChurch,
    loading,
    refetch: fetchCurrentChurch
  };
};