import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

function DashboardCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

type SubmittedProgramBudget = {
  id: number;
  budget_year: number;
  budget_amount: number;
  status: string;
  department_name: string;
  event_name: string;
  event_date: string | null;
};

function ProgramBudgetReviewPanel({ title }: { title: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<SubmittedProgramBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [pendingReviewId, setPendingReviewId] = useState<number | null>(null);
  const [pendingReviewAction, setPendingReviewAction] = useState<"approved" | "rejected" | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("department_program_budgets" as any)
        .select("id, budget_year, budget_amount, status, department:departments(name), event:events(name, event_date)")
        .in("status", ["submitted", "approved", "rejected"])
        .order("budget_year", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const mapped = ((data ?? []) as any[]).map((item) => ({
        id: Number(item.id),
        budget_year: Number(item.budget_year || new Date().getFullYear()),
        budget_amount: Number(item.budget_amount || 0),
        status: String(item.status || "submitted"),
        department_name: String(item.department?.name || "Department"),
        event_name: String(item.event?.name || "Program"),
        event_date: item.event?.event_date || null,
      }));

      setRows(mapped);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: number, status: "approved" | "rejected", note: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("department_program_budgets" as any)
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
          review_notes: note?.trim() ? note.trim() : null,
        })
        .eq("id", id);

      if (error) throw error;
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  const openReviewDialog = (id: number, action: "approved" | "rejected") => {
    setPendingReviewId(id);
    setPendingReviewAction(action);
    setReviewNote("");
    setReviewDialogOpen(true);
  };

  const submitReviewDecision = async () => {
    if (!pendingReviewId || !pendingReviewAction) return;
    await updateStatus(pendingReviewId, pendingReviewAction, reviewNote);
    setReviewDialogOpen(false);
    setPendingReviewId(null);
    setPendingReviewAction(null);
    setReviewNote("");
  };

  return (
    <Card className="border-primary/10 bg-background/90">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No submitted budgets yet.</TableCell></TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.department_name}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.event_name}</div>
                    <div className="text-xs text-muted-foreground">{row.event_date ? new Date(row.event_date).toLocaleDateString() : "No date"}</div>
                  </TableCell>
                  <TableCell>{row.budget_year}</TableCell>
                  <TableCell className="text-right">GH₵ {row.budget_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "approved" ? "default" : row.status === "rejected" ? "destructive" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.status === "submitted" ? (
                      <div className="flex items-center gap-2">
                        <Button size="sm" disabled={updatingId === row.id} onClick={() => openReviewDialog(row.id, "approved")}>Approve</Button>
                        <Button size="sm" variant="destructive" disabled={updatingId === row.id} onClick={() => openReviewDialog(row.id, "rejected")}>Reject</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Reviewed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingReviewAction === "approved" ? "Approve Program Budget" : "Reject Program Budget"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="review-note">Reviewer Notes</Label>
            <Textarea
              id="review-note"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Capture rationale, conditions, or follow-up actions..."
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
              <Button
                variant={pendingReviewAction === "rejected" ? "destructive" : "default"}
                onClick={submitReviewDecision}
                disabled={updatingId === pendingReviewId}
              >
                {pendingReviewAction === "approved" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type ChurchProgram = {
  id: number;
  name: string;
  event_date: string | null;
  program_level: string | null;
};

type ChurchProgramBudget = {
  id: number;
  event_id: number;
  budget_year: number;
  budget_amount: number;
  status: string;
  notes: string | null;
};

function ChurchBoardProgramsPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<ChurchProgram[]>([]);
  const [budgets, setBudgets] = useState<ChurchProgramBudget[]>([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ event_id: "", budget_amount: "", status: "draft", notes: "" });

  const load = async () => {
    setLoading(true);
    try {
      const targetYear = Number(year);
      const [programRes, budgetRes] = await Promise.all([
        supabase
          .from("events" as any)
          .select("id, name, start_date, end_date, program_level")
          .is("department_id", null)
          .eq("is_published", true)
          .order("start_date", { ascending: true }),
        supabase
          .from("church_program_budgets" as any)
          .select("id, event_id, budget_year, budget_amount, status, notes")
          .eq("budget_year", targetYear)
          .order("updated_at", { ascending: false }),
      ]);

      setPrograms(((programRes.data ?? []) as any[]).map((row) => ({
        id: Number(row.id),
        name: String(row.name ?? "Program"),
        event_date: row.event_date ?? null,
        program_level: row.program_level ?? null,
      })));

      setBudgets(((budgetRes.data ?? []) as any[]).map((row) => ({
        id: Number(row.id),
        event_id: Number(row.event_id),
        budget_year: Number(row.budget_year),
        budget_amount: Number(row.budget_amount || 0),
        status: String(row.status || "draft"),
        notes: row.notes ?? null,
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [year]);

  const budgetByEventId = new Map<number, ChurchProgramBudget>(budgets.map((budget) => [budget.event_id, budget]));

  const saveBudget = async () => {
    const amount = Number(form.budget_amount);
    const budgetYear = Number(year);
    if (!form.event_id || !Number.isFinite(amount) || amount < 0) return;

    const { error } = await supabase
      .from("church_program_budgets" as any)
      .upsert(
        {
          event_id: Number(form.event_id),
          budget_year: budgetYear,
          budget_amount: amount,
          status: form.status,
          notes: form.notes?.trim() ? form.notes.trim() : null,
          created_by: user?.id ?? null,
        },
        { onConflict: "event_id,budget_year" }
      );

    if (!error) {
      setOpen(false);
      setForm({ event_id: "", budget_amount: "", status: "draft", notes: "" });
      await load();
    }
  };

  const editBudget = (budget: ChurchProgramBudget) => {
    setForm({
      event_id: String(budget.event_id),
      budget_amount: String(budget.budget_amount),
      status: budget.status,
      notes: budget.notes || "",
    });
    setOpen(true);
  };

  return (
    <Card className="border-primary/10 bg-background/90">
      <CardHeader>
        <CardTitle className="text-base">Church Board Programs (Non-Departmental)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="governance-budget-year">Year</Label>
            <Input
              id="governance-budget-year"
              type="number"
              className="w-28"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
          <Button onClick={() => setOpen(true)}>Set Program Budget</Button>
        </div>

        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : programs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No non-departmental programs found.</TableCell></TableRow>
            ) : (
              programs.map((program) => {
                const budget = budgetByEventId.get(program.id);
                return (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.name}</TableCell>
                    <TableCell>{program.event_date ? new Date(program.event_date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>{program.program_level ? String(program.program_level).replace(/_/g, " ") : "local church"}</TableCell>
                    <TableCell className="text-right">{budget ? `GH₵ ${budget.budget_amount.toFixed(2)}` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={budget?.status === "approved" ? "default" : "secondary"}>{budget?.status || "not set"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (budget) {
                            editBudget(budget);
                          } else {
                            setForm({ event_id: String(program.id), budget_amount: "", status: "draft", notes: "" });
                            setOpen(true);
                          }
                        }}
                      >
                        {budget ? "Edit" : "Set"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Church Board Program Budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Program</Label>
                <Select value={form.event_id} onValueChange={(value) => setForm((prev) => ({ ...prev, event_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={String(program.id)}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Budget Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.budget_amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, budget_amount: event.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Add governance notes"
                  rows={3}
                />
              </div>

              <Button className="w-full" onClick={saveBudget}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function TreasuryDashboard() {
  const [loading, setLoading] = useState(true);
  const [monthlyContributions, setMonthlyContributions] = useState(0);
  const [monthlyContributionCount, setMonthlyContributionCount] = useState(0);
  const [titheAmount, setTitheAmount] = useState(0);
  const [offeringAmount, setOfferingAmount] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [fundBalances, setFundBalances] = useState<Array<{ fundId: number; fundName: string; amount: number }>>([]);
  const [bankBalanceTotal, setBankBalanceTotal] = useState(0);
  const [approvedBudgetTotal, setApprovedBudgetTotal] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
        const yearStartIso = new Date(now.getFullYear(), 0, 1).toISOString();

        const [
          monthlyContribRes,
          allContribRes,
          monthlyImprestExpenseRes,
          monthlyPaymentRes,
          bankTransactionsRes,
          budgetRes,
        ] = await Promise.all([
          supabase
            .from("contributions" as any)
            .select("id, amount, service_date")
            .gte("service_date", monthStart)
            .lte("service_date", monthEnd),
          supabase
            .from("contributions" as any)
            .select("amount, fund_id, funds(name)"),
          supabase
            .from("imprest_expenses" as any)
            .select("amount, expense_date")
            .gte("expense_date", monthStart)
            .lte("expense_date", monthEnd),
          supabase
            .from("payments" as any)
            .select("amount, payment_date")
            .gte("payment_date", monthStart)
            .lte("payment_date", monthEnd),
          supabase
            .from("bank_transactions" as any)
            .select("amount"),
          supabase
            .from("budget_requests" as any)
            .select("requested_amount, status, created_at")
            .gte("created_at", yearStartIso),
        ]);

        const monthlyRows = (monthlyContribRes.data ?? []) as any[];
        const allContributionRows = (allContribRes.data ?? []) as any[];
        const imprestRows = (monthlyImprestExpenseRes.data ?? []) as any[];
        const paymentRows = (monthlyPaymentRes.data ?? []) as any[];
        const bankRows = (bankTransactionsRes.data ?? []) as any[];

        const monthlyTotal = monthlyRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        setMonthlyContributions(monthlyTotal);
        setMonthlyContributionCount(monthlyRows.length);

        let tithe = 0;
        let offering = 0;
        const balancesByFund = new Map<number, { name: string; amount: number }>();

        for (const row of allContributionRows) {
          const amount = Number(row.amount || 0);
          const fundId = Number(row.fund_id || 0);
          const fundName = String((row.funds as any)?.name || "Unknown Fund");
          const normalized = fundName.toLowerCase();

          if (normalized.includes("tithe")) {
            tithe += amount;
          } else {
            offering += amount;
          }

          if (!balancesByFund.has(fundId)) {
            balancesByFund.set(fundId, { name: fundName, amount: 0 });
          }
          const existing = balancesByFund.get(fundId)!;
          existing.amount += amount;
        }

        setTitheAmount(tithe);
        setOfferingAmount(offering);

        const rankedFunds = Array.from(balancesByFund.entries())
          .map(([fundId, value]) => ({ fundId, fundName: value.name, amount: value.amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 8);

        setFundBalances(rankedFunds);

        const totalImprest = imprestRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const totalPayments = paymentRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        setMonthlyExpenses(totalImprest + totalPayments);

        const totalBankBalance = bankRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        setBankBalanceTotal(totalBankBalance);

        if (!budgetRes.error) {
          const approvedBudget = ((budgetRes.data ?? []) as any[]).filter((row) => String(row.status || "").toLowerCase() === "approved")
            .reduce((sum, row) => sum + Number(row.requested_amount || 0), 0);
          setApprovedBudgetTotal(approvedBudget);
        } else {
          setApprovedBudgetTotal(null);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const budgetVariance = useMemo(() => {
    if (approvedBudgetTotal === null) return null;
    return approvedBudgetTotal - monthlyExpenses;
  }, [approvedBudgetTotal, monthlyExpenses]);

  const formatMoney = (value: number) => `GH₵ ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const featureGroups = [
    {
      title: "Contributions",
      items: [
        { label: "Record single contribution", to: "/portal/treasury/contributions" },
        { label: "Batch Sabbath entry", to: "/portal/treasury/sabbath" },
        { label: "Anonymous contribution entry", to: "/portal/treasury/contributions" },
        { label: "Edit unposted contributions", to: "/portal/treasury/contributions" },
        { label: "Generate receipt", to: "/portal/treasury/statements" },
        { label: "Print statement", to: "/portal/treasury/statements" },
      ],
    },
    {
      title: "Funds & Journal",
      items: [
        { label: "Create/Edit fund", to: "/portal/treasury/funds" },
        { label: "Set allocation percentage", to: "/portal/treasury/funds" },
        { label: "View fund balance", to: "/portal/treasury/funds" },
        { label: "Restrict fund usage", to: "/portal/treasury/funds" },
        { label: "View ledger", to: "/portal/treasury/statements" },
        { label: "Create journal workflow", to: "/portal/treasury/automated-returns" },
      ],
    },
    {
      title: "Expenses & Banking",
      items: [
        { label: "Create expense", to: "/portal/treasury/expenses" },
        { label: "Approval workflow", to: "/portal/treasury/payments" },
        { label: "Cheque printing", to: "/portal/treasury/cheques" },
        { label: "Imprest management", to: "/portal/treasury/imprest" },
        { label: "Bank balances", to: "/portal/treasury/bank-accounts" },
        { label: "Reconciliation reports", to: "/portal/treasury/bank-accounts" },
      ],
    },
    {
      title: "Reports",
      items: [
        { label: "Income statement", to: "/portal/treasury/statements" },
        { label: "Balance sheet", to: "/portal/treasury/statements" },
        { label: "Fund statement", to: "/portal/treasury/statements" },
        { label: "Member giving statement", to: "/portal/treasury/statements" },
        { label: "Department financial report", to: "/portal/treasury/automated-returns" },
        { label: "Export PDF/Excel", to: "/portal/treasury/automated-returns" },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-2">
      <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Treasurer (Manager) Workspace</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Treasury portal remodeled to match the manager feature structure: dashboard KPIs, contributions, funds/journal, expenses/banking, and reports.
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Contributions</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : formatMoney(monthlyContributions)}</CardContent></Card>
        <Card className="border-accent/40 bg-gradient-to-br from-accent/20 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Entries This Month</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : monthlyContributionCount}</CardContent></Card>
        <Card className="border-secondary bg-gradient-to-br from-secondary/70 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Tithe vs Offering</CardTitle></CardHeader><CardContent className="space-y-1"><div className="text-sm">Tithe: <span className="font-semibold">{loading ? "..." : formatMoney(titheAmount)}</span></div><div className="text-sm">Offering: <span className="font-semibold">{loading ? "..." : formatMoney(offeringAmount)}</span></div></CardContent></Card>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Expense Summary</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : formatMoney(monthlyExpenses)}</CardContent></Card>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm">Bank Balance Overview</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{loading ? "..." : formatMoney(bankBalanceTotal)}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Fund Balance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : fundBalances.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No fund balances available.</TableCell></TableRow>
                ) : (
                  fundBalances.map((fund) => (
                    <TableRow key={fund.fundId}>
                      <TableCell>{fund.fundName}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(fund.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Budget vs Actual (Current Year)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {approvedBudgetTotal === null ? (
              <div className="text-muted-foreground">Budget source not configured yet. Connect approved budget records to unlock variance analytics.</div>
            ) : (
              <>
                <div className="flex justify-between"><span>Approved Budget</span><span className="font-semibold">{formatMoney(approvedBudgetTotal)}</span></div>
                <div className="flex justify-between"><span>Actual Spend (This Month)</span><span className="font-semibold">{formatMoney(monthlyExpenses)}</span></div>
                <div className="flex justify-between"><span>Variance</span><span className="font-semibold">{formatMoney(budgetVariance ?? 0)}</span></div>
                <Badge variant={(budgetVariance ?? 0) >= 0 ? "secondary" : "destructive"}>
                  {(budgetVariance ?? 0) >= 0 ? "Within Budget" : "Over Budget"}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {featureGroups.map((group) => (
          <Card key={group.title} className="border-primary/10 bg-background/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-base">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-primary/10 bg-background/80 px-3 py-2">
                  <span className="text-sm">{item.label}</span>
                  <Button asChild variant="outline" size="sm" className="border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                    <Link to={item.to}>Open</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <ProgramBudgetReviewPanel title="Department Program Budget Reviews" />
    </div>
  );
}

export function ClerkDashboard() {
  return (
    <DashboardCard
      title="Clerk Dashboard"
      description="Manage membership records, baptisms, transfers, attendance, and clerk reporting tasks."
    />
  );
}

export function DepartmentDashboard() {
  return (
    <DashboardCard
      title="Department Dashboard"
      description="Overview only. Open Portal to work in a specific department with role-based access."
    />
  );
}

export function MemberDashboard() {
  return (
    <DashboardCard
      title="Member Dashboard"
      description="View member-level features such as dues and personal self-service resources."
    />
  );
}

export function GovernanceDashboard() {
  return (
    <div className="space-y-4 pb-2">
      <DashboardCard
        title="Governance Dashboard"
        description="Manage only non-departmental church-board programs and governance-level oversight."
      />
      <ChurchBoardProgramsPanel />
    </div>
  );
}
