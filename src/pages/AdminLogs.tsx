import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Activity, Download, FileText, Search } from "lucide-react";

type LogItem = {
  id: number;
  timestamp: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  isFinancial: boolean;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
};

type DiagnosticsSource = "vercel" | "email" | "general";
type DiagnosticsStatus = "success" | "failed" | "pending" | "unknown";
type TimeRangeFilter = "all" | "last_hour" | "today" | "last_24h" | "last_7d";
type SortDirection = "asc" | "desc";
type SortKey =
  | "timestamp"
  | "entityType"
  | "entityId"
  | "action"
  | "actor"
  | "source"
  | "status"
  | "isFinancial"
  | "errorDetail"
  | "before"
  | "after";

const AUDIT_ACCESS_PERMISSION_KEYS = [
  "read:users",
  "read:roles",
  "read:permissions",
] as const;

const fmtDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const toActorText = (value: unknown) => {
  const actor = String(value ?? "").trim();
  if (!actor) return "System";
  if (actor.length <= 12) return actor;
  return `${actor.slice(0, 6)}...${actor.slice(-4)}`;
};

const jsonSnippet = (value: Record<string, unknown> | null) => {
  if (!value) return "—";
  const text = JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
};

const payloadText = (log: LogItem) =>
  `${JSON.stringify(log.beforeData ?? {})} ${JSON.stringify(log.afterData ?? {})}`.toLowerCase();

const detectSource = (log: LogItem): DiagnosticsSource => {
  const fingerprint = `${log.entityType} ${log.action} ${log.entityId} ${payloadText(log)}`.toLowerCase();
  if (/(vercel|deploy|build|deployment|preview)/.test(fingerprint)) return "vercel";
  if (/(email|mail|sendgrid|smtp|invitation|invite|password reset|delivery)/.test(fingerprint)) return "email";
  return "general";
};

const detectStatus = (log: LogItem): DiagnosticsStatus => {
  const fingerprint = `${log.action} ${payloadText(log)}`.toLowerCase();
  if (/(fail|failed|error|bounce|rejected|invalid|denied|timeout)/.test(fingerprint)) return "failed";
  if (/(queued|pending|processing|retry)/.test(fingerprint)) return "pending";
  if (/(success|delivered|sent|completed|ok|resolved)/.test(fingerprint)) return "success";
  return "unknown";
};

const extractErrorDetails = (log: LogItem) => {
  const payloads = [log.afterData, log.beforeData].filter(Boolean) as Record<string, unknown>[];
  const keys = [
    "error",
    "error_message",
    "errorMessage",
    "error_details",
    "details",
    "message",
    "reason",
    "failure_reason",
    "status_text",
  ];

  for (const payload of payloads) {
    for (const key of keys) {
      const value = payload[key];
      if (value == null) continue;
      const text = typeof value === "string" ? value : JSON.stringify(value);
      if (!text.trim()) continue;
      return text.length > 180 ? `${text.slice(0, 180)}…` : text;
    }
  }

  const fingerprint = payloadText(log);
  if (/(fail|error|invalid|timeout|denied|rejected|bounce)/.test(fingerprint)) {
    const compact = fingerprint.replace(/\s+/g, " ").trim();
    return compact.length > 180 ? `${compact.slice(0, 180)}…` : compact;
  }

  return "—";
};

const exportCsv = (items: LogItem[]) => {
  const header = [
    "timestamp",
    "entity_type",
    "entity_id",
    "action",
    "actor",
    "is_financial",
    "before_data",
    "after_data",
  ];

  const escapeCell = (value: unknown) => {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = items.map((item) => [
    item.timestamp,
    item.entityType,
    item.entityId,
    item.action,
    item.actor,
    item.isFinancial ? "true" : "false",
    item.beforeData ? JSON.stringify(item.beforeData) : "",
    item.afterData ? JSON.stringify(item.afterData) : "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((value) => escapeCell(value)).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const printPdfView = (items: LogItem[]) => {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td>${fmtDateTime(item.timestamp)}</td>
        <td>${item.entityType}</td>
        <td>${item.entityId || "—"}</td>
        <td>${item.action}</td>
        <td>${item.actor}</td>
        <td>${item.isFinancial ? "Yes" : "No"}</td>
      </tr>
    `
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>Audit Logs</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; }
          h1 { margin: 0 0 8px 0; font-size: 20px; }
          p { margin: 0 0 16px 0; color: #555; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
          th { background: #f7f7f7; }
        </style>
      </head>
      <body>
        <h1>Audit Logs</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Financial</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const AdminLogs = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [financialOnly, setFinancialOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | DiagnosticsSource>("all");
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [logs, setLogs] = useState<LogItem[]>([]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id;

      if (!currentUserId) {
        setAuthorized(false);
        setLogs([]);
        return;
      }

      const { data: roleRows, error: roleError } = await supabase
        .from("user_roles")
        .select("role_id,roles(name)")
        .eq("user_id", currentUserId);

      if (roleError) throw roleError;

      const roles = (roleRows ?? []).map((r: any) => r.roles?.name);
      const isAuditAdmin = roles.some((role) => role === "SuperAdmin");

      if (!isAuditAdmin) {
        setAuthorized(false);
        setLogs([]);
        return;
      }

      setAuthorized(true);

      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("id, created_at, action, entity_type, entity_id, actor_user_id, before_data, after_data, is_financial")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const mapped: LogItem[] = (data ?? []).map((row: any) => ({
        id: Number(row.id),
        timestamp: String(row.created_at ?? ""),
        entityType: String(row.entity_type ?? "unknown"),
        entityId: String(row.entity_id ?? ""),
        action: String(row.action ?? "UNKNOWN"),
        actor: toActorText(row.actor_user_id),
        isFinancial: Boolean(row.is_financial),
        beforeData: row.before_data ?? null,
        afterData: row.after_data ?? null,
      }));

      setLogs(mapped);
    } catch (error: any) {
      toast({
        title: "Failed to load logs",
        description: error?.message || "Could not load system audit logs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (authorized !== true) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadLogs();
      }
    }, 8000);

    return () => {
      window.clearInterval(interval);
    };
  }, [authorized, loadLogs]);

  const filteredLogs = useMemo(() => {
    let base = logs;

    if (timeRange !== "all") {
      const now = Date.now();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      base = base.filter((log) => {
        const ts = new Date(log.timestamp).getTime();
        if (Number.isNaN(ts)) return false;

        if (timeRange === "last_hour") return ts >= now - 60 * 60 * 1000;
        if (timeRange === "today") return ts >= startOfToday.getTime();
        if (timeRange === "last_24h") return ts >= now - 24 * 60 * 60 * 1000;
        if (timeRange === "last_7d") return ts >= now - 7 * 24 * 60 * 60 * 1000;
        return true;
      });
    }

    if (financialOnly) {
      base = base.filter((log) => log.isFinancial);
    }

    if (sourceFilter !== "all") {
      base = base.filter((log) => detectSource(log) === sourceFilter);
    }

    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((log) =>
      [
        log.entityType,
        log.entityId,
        log.action,
        log.actor,
        jsonSnippet(log.beforeData),
        jsonSnippet(log.afterData),
      ].some((value) =>
        String(value).toLowerCase().includes(q)
      )
    );
  }, [logs, query, financialOnly, sourceFilter, timeRange]);

  const summary = useMemo(() => {
    const inserts = filteredLogs.filter((log) => log.action === "INSERT").length;
    const updates = filteredLogs.filter((log) => log.action === "UPDATE").length;
    const deletes = filteredLogs.filter((log) => log.action === "DELETE").length;
    const financial = filteredLogs.filter((log) => log.isFinancial).length;
    const vercel = filteredLogs.filter((log) => detectSource(log) === "vercel");
    const email = filteredLogs.filter((log) => detectSource(log) === "email");
    const vercelFailed = vercel.filter((log) => detectStatus(log) === "failed").length;
    const emailDelivered = email.filter((log) => detectStatus(log) === "success").length;
    const emailFailed = email.filter((log) => detectStatus(log) === "failed").length;

    return {
      inserts,
      updates,
      deletes,
      financial,
      vercelCount: vercel.length,
      vercelFailed,
      emailCount: email.length,
      emailDelivered,
      emailFailed,
    };
  }, [filteredLogs]);

  const getSortValue = (log: LogItem, key: SortKey) => {
    switch (key) {
      case "timestamp": {
        const ts = new Date(log.timestamp).getTime();
        return Number.isNaN(ts) ? 0 : ts;
      }
      case "entityType":
        return log.entityType.toLowerCase();
      case "entityId":
        return log.entityId.toLowerCase();
      case "action":
        return log.action.toLowerCase();
      case "actor":
        return log.actor.toLowerCase();
      case "source":
        return detectSource(log);
      case "status":
        return detectStatus(log);
      case "isFinancial":
        return log.isFinancial ? 1 : 0;
      case "errorDetail":
        return extractErrorDetails(log).toLowerCase();
      case "before":
        return jsonSnippet(log.beforeData).toLowerCase();
      case "after":
        return jsonSnippet(log.afterData).toLowerCase();
      default:
        return "";
    }
  };

  const sortedLogs = useMemo(() => {
    const sorted = [...filteredLogs];
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, sortBy);
      const bValue = getSortValue(b, sortBy);

      let comparison = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredLogs, sortBy, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setSortDirection(key === "timestamp" ? "desc" : "asc");
  };

  const SortableHead = ({ label, sortKey }: { label: string; sortKey: SortKey }) => {
    const active = sortBy === sortKey;
    return (
      <TableHead>
        <button
          type="button"
          onClick={() => toggleSort(sortKey)}
          className="inline-flex items-center gap-1 text-left hover:text-foreground"
        >
          <span>{label}</span>
          <span className={active ? "text-foreground" : "text-muted-foreground/60"}>
            {active ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </button>
      </TableHead>
    );
  };

  const LogTable = ({ items, emptyMessage }: { items: LogItem[]; emptyMessage: string }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead label="Time" sortKey="timestamp" />
            <SortableHead label="Entity" sortKey="entityType" />
            <SortableHead label="Entity ID" sortKey="entityId" />
            <SortableHead label="Action" sortKey="action" />
            <SortableHead label="Actor" sortKey="actor" />
            <SortableHead label="Source" sortKey="source" />
            <SortableHead label="Status" sortKey="status" />
            <SortableHead label="Financial" sortKey="isFinancial" />
            <SortableHead label="Error Detail" sortKey="errorDetail" />
            <SortableHead label="Before" sortKey="before" />
            <SortableHead label="After" sortKey="after" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            items.map((log) => {
              const source = detectSource(log);
              const status = detectStatus(log);
              return (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {fmtDateTime(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.entityType}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.entityId || "—"}</TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell className="text-sm">{log.actor}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {source === "vercel" ? "Vercel" : source === "email" ? "Email" : "General"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        status === "failed"
                          ? "destructive"
                          : status === "success"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.isFinancial ? "default" : "secondary"}>
                      {log.isFinancial ? "Financial" : "General"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate" title={extractErrorDetails(log)}>
                    {extractErrorDetails(log)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{jsonSnippet(log.beforeData)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">{jsonSnippet(log.afterData)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
  return (
    <div>
      <PageHeader
        title="View All Logs"
        description="Immutable audit trail across administrative, member, and financial entities"
      />

      <div className="space-y-4">
        {authorized === false && !loading && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              You do not have permission to view audit logs.
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Insert Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.inserts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Update Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.updates}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Delete Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.deletes}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Vercel Build Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.vercelCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Failed: {summary.vercelFailed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Email Delivery Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.emailCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Delivered: {summary.emailDelivered}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Email Failures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.emailFailed}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Audit Logs
            </CardTitle>
            <div className="flex flex-col gap-2 mt-2 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by entity, action, actor, payload"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={timeRange === "last_hour" ? "default" : "outline"}
                  onClick={() => setTimeRange("last_hour")}
                  size="sm"
                >
                  Last Hour
                </Button>
                <Button
                  variant={timeRange === "today" ? "default" : "outline"}
                  onClick={() => setTimeRange("today")}
                  size="sm"
                >
                  Today
                </Button>
                <Button
                  variant={timeRange === "last_24h" ? "default" : "outline"}
                  onClick={() => setTimeRange("last_24h")}
                  size="sm"
                >
                  Last 24h
                </Button>
                <Button
                  variant={timeRange === "last_7d" ? "default" : "outline"}
                  onClick={() => setTimeRange("last_7d")}
                  size="sm"
                >
                  Last 7d
                </Button>
                <Button
                  variant={timeRange === "all" ? "default" : "outline"}
                  onClick={() => setTimeRange("all")}
                  size="sm"
                >
                  All Time
                </Button>
                <Button
                  variant={sourceFilter === "all" ? "default" : "outline"}
                  onClick={() => setSourceFilter("all")}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={sourceFilter === "vercel" ? "default" : "outline"}
                  onClick={() => setSourceFilter("vercel")}
                  size="sm"
                >
                  Vercel
                </Button>
                <Button
                  variant={sourceFilter === "email" ? "default" : "outline"}
                  onClick={() => setSourceFilter("email")}
                  size="sm"
                >
                  Email
                </Button>
                <Button
                  variant={financialOnly ? "default" : "outline"}
                  onClick={() => setFinancialOnly((value) => !value)}
                  size="sm"
                >
                  Financial Only ({summary.financial})
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportCsv(sortedLogs)}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => printPdfView(sortedLogs)}>
                  <FileText className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading logs...</div>
            ) : authorized === false ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Access denied</div>
            ) : (
              <LogTable items={sortedLogs} emptyMessage="No audit logs found" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogs;
