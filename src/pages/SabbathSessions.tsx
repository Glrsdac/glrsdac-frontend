import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type SabbathSession = {
  id: number;
  date: string;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string | null;
  closed_at: string | null;
  status: string | null;
  notes: string | null;
};

type Collection = {
  id: number;
  date: string;
  fund_id: number;
  amount: number;
  entered_by: string | null;
  notes: string | null;
  source?: "collections" | "contributions";
};

type ImprestExpense = {
  id: number;
  expense_date: string;
  description: string;
  fund_id: number | null;
  amount: number;
  receipt_no: string | null;
};

type Fund = { id: number; name: string };

const SabbathSessions = () => {
  const [sessions, setSessions] = useState<SabbathSession[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SabbathSession | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contributions, setContributions] = useState<Collection[]>([]);
  const [expenses, setExpenses] = useState<ImprestExpense[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetch = async () => {
    const [{ data: sessionData }, { data: openAccount }] = await Promise.all([
      supabase
        .from("sabbath_sessions")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("sabbath_accounts")
        .select("id")
        .eq("status", "OPEN")
        .maybeSingle(),
    ]);

    setSessions((sessionData as SabbathSession[]) ?? []);
    setActiveAccountId(openAccount?.id ?? null);
  };

  useEffect(() => {
    fetch();
    supabase.from("funds").select("id, name").then(({ data }) => setFunds(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role_id,roles(name)")
      .eq("user_id", user.id)
      .then(({ data }: any) => {
        const roles = (data ?? []).map((r: any) => r.roles?.name);
        if (roles.includes("SuperAdmin")) setUserRole("ADMIN");
        else if (roles.includes("Church Treasurer")) setUserRole("TREASURER");
        else if (roles.includes("Church Clerk")) setUserRole("CLERK");
        else setUserRole("VIEWER");
      });
  }, [user]);

  const canWrite = userRole === "ADMIN" || userRole === "TREASURER" || userRole === "CLERK";
  const activeSession = sessions.find(s => s.status === "OPEN");
  const hasActiveSession = Boolean(activeSession || activeAccountId);

  const formatIsoDate = (value: Date) => {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getWeekMeta = (baseDate = new Date()) => {
    const now = new Date(baseDate);
    now.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday (Sabbath)

    return {
      weekStart,
      weekEnd,
      weekStartIso: formatIsoDate(weekStart),
      weekEndIso: formatIsoDate(weekEnd),
      sabbathDateIso: formatIsoDate(weekEnd),
    };
  };

  const thisWeek = getWeekMeta();

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasActiveSession) {
      toast({ title: "Error", description: "A session is already open. Close it before opening a new one.", variant: "destructive" });
      return;
    }

    const { weekStartIso, weekEndIso, sabbathDateIso } = getWeekMeta();

    const existingThisWeek = sessions.some((session) => {
      if (!session.date) return false;
      return session.date >= weekStartIso && session.date <= weekEndIso;
    });

    if (existingThisWeek) {
      toast({
        title: "Error",
        description: "A Sabbath session already exists for this week.",
        variant: "destructive",
      });
      return;
    }

    const { data: userData } = await supabase.from("profiles").select("full_name").eq("id", user?.id || "").maybeSingle();

    const now = new Date().toISOString();

    const { data: insertedSession, error: sessionError } = await supabase.from("sabbath_sessions").insert({
      date: sabbathDateIso,
      opened_at: now,
      opened_by: userData?.full_name || user?.email || "Unknown",
      status: "OPEN",
    }).select("id").single();

    if (sessionError) {
      toast({ title: "Error", description: sessionError.message, variant: "destructive" });
      return;
    }

    const { error: accountError } = await supabase.from("sabbath_accounts").insert({
      week_start: weekStartIso,
      week_end: weekEndIso,
      opened_at: now,
      opened_by: userData?.full_name || user?.email || "Unknown",
      opened_by_user_id: user?.id || null,
      status: "OPEN",
    });

    if (accountError) {
      await supabase.from("sabbath_sessions").delete().eq("id", insertedSession.id);
      toast({
        title: "Error",
        description: `Failed to open accounting session: ${accountError.message}`,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Sabbath session opened" });
    setOpen(false);
    fetch();
  };

  const handleCloseSession = async (session: SabbathSession) => {
    // Pre-close validation
    if (selectedSession?.id === session.id) {
      // Load latest details for validation
      try {
        setIsLoadingDetails(true);
        const contribRes = await (supabase.from("contributions") as any).select("id").eq("sabbath_account_id", session.id);
        const expenseRes = await (supabase.from("imprest_expenses") as any).select("id").eq("session_id", session.id);
        const contribData = contribRes.data;
        const expenseData = expenseRes.data;

        const hasContributions = (contribData?.length ?? 0) > 0;
        const hasExpenses = (expenseData?.length ?? 0) > 0;

        if (!hasContributions && !hasExpenses) {
          toast({
            title: "Warning",
            description: "No contributions or expenses recorded for this session. Continue closing?",
          });
        }
        setIsLoadingDetails(false);
      } catch (error: any) {
        console.warn("Validation check failed:", error);
        setIsLoadingDetails(false);
      }
    }

    setClosing(session.id);
    const { data: userData } = await supabase.from("profiles").select("full_name").eq("id", user?.id || "").maybeSingle();
    const now = new Date().toISOString();

    const { error } = await supabase.from("sabbath_sessions").update({
      status: "CLOSED",
      closed_at: now,
      closed_by: userData?.full_name || user?.email || "Unknown",
    }).eq("id", session.id);

    const closePayload: { status: "CLOSED"; closed_at: string; closed_by: string; closed_by_user_id: string | null } = {
      status: "CLOSED" as const,
      closed_at: now,
      closed_by: userData?.full_name || user?.email || "Unknown",
      closed_by_user_id: user?.id || null,
    };

    const { data: closedMatchingAccounts, error: closeAccountError } = await supabase
      .from("sabbath_accounts")
      .update(closePayload)
      .eq("status", "OPEN")
      .lte("week_start", session.date)
      .gte("week_end", session.date)
      .select("id");

    if (!closeAccountError && (closedMatchingAccounts?.length ?? 0) === 0) {
      await supabase
        .from("sabbath_accounts")
        .update(closePayload)
        .eq("status", "OPEN");
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Session closed" });
      fetch();
    }
    setClosing(null);
  };

  const openSessionDetails = async (session: SabbathSession) => {
    setSelectedSession(session);
    setDetailsOpen(true);
    setIsLoadingDetails(true);

    const [{ data: cols }, { data: exps }, { data: accounts }] = await Promise.all([
      supabase.from("collections").select("*").eq("session_id", session.id),
      supabase.from("imprest_expenses").select("*").eq("session_id", session.id),
      supabase
        .from("sabbath_accounts")
        .select("id")
        .lte("week_start", session.date)
        .gte("week_end", session.date),
    ]);

    const accountIds = (accounts ?? []).map((a: any) => a.id).filter(Boolean);

    let contributionRows: any[] = [];
    if (accountIds.length > 0) {
      const { data: contribs } = await supabase
        .from("contributions")
        .select("id, service_date, fund_id, amount, recorded_by, payment_method")
        .in("sabbath_account_id", accountIds)
        .order("service_date", { ascending: true });
      contributionRows = contribs ?? [];
    }

    const normalizedCollections: Collection[] = ((cols as Collection[]) ?? []).map((item) => ({
      ...item,
      source: "collections",
    }));

    const normalizedContributions: Collection[] = contributionRows.map((item) => ({
      id: Number(item.id),
      date: item.service_date,
      fund_id: Number(item.fund_id),
      amount: Number(item.amount || 0),
      entered_by: item.recorded_by || null,
      notes: item.payment_method ? `Payment: ${item.payment_method}` : "—",
      source: "contributions",
    }));

    const mergedContributions = [...normalizedCollections, ...normalizedContributions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    setContributions(mergedContributions);
    setExpenses((exps as ImprestExpense[]) ?? []);
    setIsLoadingDetails(false);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  const getWeekRangeFromSessionDate = (sessionDate: string) => {
    const date = new Date(`${sessionDate}T00:00:00`);
    date.setHours(0, 0, 0, 0);
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${formatDate(formatIsoDate(start))} - ${formatDate(formatIsoDate(end))}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sabbath Sessions" description="Weekly worship service records" icon={<Lock className="w-5 h-5" />}>
        <div className="flex gap-4 items-end">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Session Status</p>
            <p className={`text-lg font-bold ${hasActiveSession ? "text-green-600" : "text-muted-foreground"}`}>
              {hasActiveSession ? "ACTIVE" : "NONE"}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={hasActiveSession || !canWrite}>
                <Plus className="w-4 h-4 mr-1" /> Open Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Open Sabbath Session</DialogTitle></DialogHeader>
              <form onSubmit={handleOpenSession} className="space-y-4">
                <div className="space-y-2">
                  <Label>This Week</Label>
                  <div className="rounded-md border px-3 py-2 text-sm bg-muted/30">
                    {formatDate(thisWeek.weekStartIso)} - {formatDate(thisWeek.weekEndIso)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Session will open for this week and use Sabbath date {formatDate(thisWeek.sabbathDateIso)}.
                  </p>
                </div>
                <Button type="submit" className="w-full">Open Session</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Opened By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              {canWrite && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map(s => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-muted" onClick={() => openSessionDetails(s)}>
                <TableCell className="text-sm text-muted-foreground">{getWeekRangeFromSessionDate(s.date)}</TableCell>
                <TableCell>{formatDate(s.date)}</TableCell>
                <TableCell>{s.opened_by || "—"}</TableCell>
                <TableCell><Badge variant={s.status === "OPEN" ? "default" : "secondary"}>{s.status || "—"}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.notes || "—"}</TableCell>
                {canWrite && (
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    {s.status === "OPEN" && (
                      <Button size="sm" variant="outline" disabled={closing === s.id} onClick={() => handleCloseSession(s)}>
                        <Lock className="w-3.5 h-3.5 mr-1" />{closing === s.id ? "Closing…" : "Close"}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 6 : 5} className="text-center text-muted-foreground py-8">
                  No sessions recorded
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session Details - {selectedSession ? formatDate(selectedSession.date) : ""}</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="py-8 text-center text-muted-foreground">Loading details...</div>
          ) : (
            <Tabs defaultValue="contributions" className="w-full">
              <TabsList>
                <TabsTrigger value="contributions">Contributions ({contributions.length})</TabsTrigger>
                <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="contributions" className="space-y-4">
                {contributions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No contributions recorded</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Fund</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contributions.map(c => {
                            const fund = funds.find(f => f.id === c.fund_id);
                            return (
                              <TableRow key={c.id}>
                                <TableCell>{new Date(c.date).toLocaleDateString()}</TableCell>
                                <TableCell>{fund?.name || "—"}</TableCell>
                                <TableCell className="text-right font-medium">
                                  GH₵ {(c.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={c.source === "contributions" ? "default" : "secondary"}>
                                    {c.source === "contributions" ? "Contribution" : "Collection"}
                                  </Badge>
                                </TableCell>
                                <TableCell>{c.entered_by || "—"}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{c.notes || "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="border-t pt-4 flex justify-end">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Contributions</p>
                        <p className="text-lg font-bold">
                          GH₵ {contributions.reduce((sum, c) => sum + (c.amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                {expenses.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">No expenses recorded</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Fund</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Receipt #</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenses.map(e => {
                            const fund = funds.find(f => f.id === e.fund_id);
                            return (
                              <TableRow key={e.id}>
                                <TableCell>{new Date(e.expense_date).toLocaleDateString()}</TableCell>
                                <TableCell className="max-w-xs">{e.description || "—"}</TableCell>
                                <TableCell>{fund?.name || "—"}</TableCell>
                                <TableCell className="text-right font-medium">
                                  GH₵ {(e.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>{e.receipt_no || "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="border-t pt-4 flex justify-end">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-lg font-bold">
                          GH₵ {expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SabbathSessions;
