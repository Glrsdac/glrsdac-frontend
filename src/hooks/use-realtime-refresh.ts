import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * useRealtimeRefresh
 *
 * Purpose:
 * - Trigger a "refresh" callback when records in specific Supabase tables change.
 *
 * Strategy:
 * - Default mode is `polling-only` to keep behavior predictable.
 * - If switched to websocket mode, it subscribes to `postgres_changes` and falls back
 *   to polling when subscription fails/timeouts.
 */
type RealtimeSubscription = {
  table: string;
  schema?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
};

type UseRealtimeRefreshOptions = {
  channelName: string;
  subscriptions: RealtimeSubscription[];
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
  debounceMs?: number;
  pollMs?: number;
  mode?: "auto" | "polling-only";
  websocketTimeoutMs?: number;
};

export const useRealtimeRefresh = ({
  channelName,
  subscriptions,
  onRefresh,
  enabled = true,
  debounceMs = 400,
  pollMs = 8000,
  mode = "polling-only",
  websocketTimeoutMs = 6000,
}: UseRealtimeRefreshOptions) => {
  // Keep latest callback reference without re-subscribing everything.
  const refreshRef = useRef(onRefresh);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  // Stable fingerprint so effect restarts only when subscription definitions change.
  const subscriptionsFingerprint = useMemo(
    () =>
      JSON.stringify(
        subscriptions.map((entry) => ({
          table: entry.table,
          schema: entry.schema ?? "public",
          event: entry.event ?? "*",
        }))
      ),
    [subscriptions]
  );

  useEffect(() => {
    // Parse the fingerprint back into a typed structure.
    const normalizedSubscriptions = JSON.parse(subscriptionsFingerprint) as Array<{
      table: string;
      schema: string;
      event: "*" | "INSERT" | "UPDATE" | "DELETE";
    }>;

    if (!enabled || normalizedSubscriptions.length === 0) return;

    // Debounced schedule so rapid DB changes don't spam the UI refresh.
    const scheduleRefresh = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        void refreshRef.current();
      }, debounceMs);
    };

    let pollInterval: number | null = null;
    let websocketTimeout: number | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let hasSubscribed = false;

    // Polling loop:
    // - Only refresh when the tab is visible (saves resources).
    const startPolling = () => {
      if (pollInterval !== null) return;

      pollInterval = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        scheduleRefresh();
      }, Math.max(1000, pollMs));
    };

    // Stop polling interval if running.
    const stopPolling = () => {
      if (pollInterval === null) return;
      window.clearInterval(pollInterval);
      pollInterval = null;
    };

    // Fallback: start polling and remove any active websocket channel.
    const fallbackToPolling = () => {
      startPolling();
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
    };

    if (mode === "polling-only") {
      startPolling();
    } else {
      // Websocket mode: subscribe to postgres_changes and refresh on matching events.
      channel = supabase.channel(channelName);

      normalizedSubscriptions.forEach((entry) => {
        channel?.on(
          "postgres_changes",
          {
            event: entry.event,
            schema: entry.schema,
            table: entry.table,
          },
          scheduleRefresh
        );
      });

      websocketTimeout = window.setTimeout(() => {
        if (!hasSubscribed) {
          fallbackToPolling();
        }
      }, Math.max(1000, websocketTimeoutMs));

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          hasSubscribed = true;
          if (websocketTimeout !== null) {
            window.clearTimeout(websocketTimeout);
            websocketTimeout = null;
          }
          stopPolling();
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          fallbackToPolling();
          return;
        }

        if (status === "CLOSED" && !hasSubscribed) {
          fallbackToPolling();
        }
      });
    }

    return () => {
      stopPolling();

      if (websocketTimeout !== null) {
        window.clearTimeout(websocketTimeout);
        websocketTimeout = null;
      }

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (channel) {
        // Remove websocket channel to avoid duplicate subscriptions after unmount.
        void supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [
    enabled,
    channelName,
    subscriptionsFingerprint,
    debounceMs,
    pollMs,
    mode,
    websocketTimeoutMs,
  ]);
};