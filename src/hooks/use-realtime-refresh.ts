import { useEffect, useMemo, useRef } from "react";
// Supabase client removed. Backend polling only.

/**
 * useRealtimeRefresh
 *
 * Purpose:
 * - Trigger a "refresh" callback when records in specific backend tables change.
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
  websocketTimeoutMs = 6000, // Unused, left for future WebSocket support
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

    // Only polling mode is supported now.
    startPolling();

    // Cleanup on unmount
    return () => {
      stopPolling();
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [subscriptionsFingerprint, enabled, debounceMs, pollMs]);