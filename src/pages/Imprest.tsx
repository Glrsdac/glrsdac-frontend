import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, AlertCircle, DollarSign, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ImprestIssue {
  id: number;
  imprest_account_id: number;
  issue_date: string;
  issued_amount: number;
  issued_by: string | null;
  purpose: string | null;
  status: string | null;
  imprest_accounts?: { name: string };
}

interface ImprestExpense {
  id: number;
  imprest_issue_id: number;
  expense_date: string;
  amount: number;
  description: string;
  receipt_no: string | null;
}

const Imprest = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [issues, setIssues] = useState<ImprestIssue[]>([]);
  const [expenses, setExpenses] = useState<ImprestExpense[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newIssueDialog, setNewIssueDialog] = useState(false);
  const [retireDialog, setRetireDialog] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [expenseForm, setExpenseForm] = useState({ amount: "", description: "", receipt_no: "", expense_date: new Date().toISOString().slice(0, 10) });
  const [newIssueForm, setNewIssueForm] = useState({ 
    imprest_account_id: "", 
    issued_amount: "", 
    purpose: "",
    issue_date: new Date().toISOString().slice(0, 10)
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [a, i, e] = await Promise.all([
        supabase.from("imprest_accounts").select("*").order("id"),
        supabase.from("imprest_issues").select("*, imprest_accounts(name)").order("issue_date", { ascending: false }),
        supabase.from("imprest_expenses").select("*").order("expense_date", { ascending: false }),
      ]);
      setAccounts(a.data ?? []);
      setIssues(i.data ?? []);
      setExpenses(e.data ?? []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchData();
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
        else setUserRole("VIEWER");
      });
  }, [user]);

  const canWrite = userRole === "ADMIN" || userRole === "TREASURER";

  const handleCreateNewImprest = async () => {
    if (!newIssueForm.imprest_account_id || !newIssueForm.issued_amount || !newIssueForm.purpose) {
      toast({ 
        title: "Validation Error", 
        description: "All fields are required", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase.from("imprest_issues").insert({
        imprest_account_id: Number(newIssueForm.imprest_account_id),
        issued_amount: Number(newIssueForm.issued_amount),
        purpose: newIssueForm.purpose.trim(),
        issue_date: newIssueForm.issue_date,
        issued_by: user?.id,
        status: "OPEN",
      });

      if (error) throw error;

      toast({ 
        title: "Success", 
        description: "New imprest issue created successfully" 
      });
      setNewIssueForm({ 
        imprest_account_id: "", 
        issued_amount: "", 
        purpose: "",
        issue_date: new Date().toISOString().slice(0, 10)
      });
      setNewIssueDialog(false);
      fetchData();
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Failed to create imprest issue", 
        variant: "destructive" 
      });
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueId) {
      toast({ title: "Error", description: "Please select an imprest issue", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from("imprest_expenses").insert({
        imprest_issue_id: selectedIssueId,
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
        receipt_no: expenseForm.receipt_no || null,
        expense_date: expenseForm.expense_date,
      });

      if (error) throw error;

      toast({ title: "Expense recorded", description: "Imprest expense added successfully" });
      setExpenseForm({ amount: "", description: "", receipt_no: "", expense_date: new Date().toISOString().slice(0, 10) });
      setOpenDialog(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRetireImprest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueId) return;

    try {
      const issue = issues.find(i => i.id === selectedIssueId);
      if (!issue) throw new Error("Issue not found");

      const expenseTotal = expenses
        .filter(e => e.imprest_issue_id === selectedIssueId)
        .reduce((sum, e) => sum + e.amount, 0);

      const balance = issue.issued_amount - expenseTotal;

      // Update imprest issue status to RETIRED
      const { error } = await supabase
        .from("imprest_issues")
        .update({ status: "RETIRED" })
        .eq("id", selectedIssueId);

      if (error) throw error;

      toast({
        title: "Imprest Retired",
        description: `Amount: ${issue.issued_amount.toFixed(2)} | Expenses: ${expenseTotal.toFixed(2)} | Balance: ${balance.toFixed(2)}`,
      });

      setRetireDialog(false);
      setSelectedIssueId(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const getIssueExpenses = (issueId: number) => {
    return expenses.filter(e => e.imprest_issue_id === issueId);
  };

  const getIssueSummary = (issue: ImprestIssue) => {
    const issueExpenses = getIssueExpenses(issue.id);
    const total = issueExpenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = issue.issued_amount - total;
    return { total, balance, issueExpenses };
  };

  const openIssues = issues.filter(i => i.status === "OPEN");
  const retiredIssues = issues.filter(i => i.status === "RETIRED");

  return (
    <div className="space-y-6">
      <PageHeader title="Imprest Management" description="Track imprest issuances and retirements" icon={<Receipt className="w-5 h-5" />} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {accounts.map(a => (
          <Card key={a.id} className="animate-fade-in">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{a.name}</h3>
                <Badge variant="outline">{a.holder_type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{a.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open" className="gap-2">
            <AlertCircle size={16} />
            Open Issues ({openIssues.length})
          </TabsTrigger>
          <TabsTrigger value="retired" className="gap-2">
            <Check size={16} />
            Retired ({retiredIssues.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg">Active Imprest Issues</CardTitle>
              {canWrite && (
                <div className="flex gap-2">
                  <Dialog open={newIssueDialog} onOpenChange={setNewIssueDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus size={16} />
                        Open New Imprest
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Open New Imprest Issue</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Imprest Account</Label>
                          <select
                            value={newIssueForm.imprest_account_id}
                            onChange={(e) => setNewIssueForm(s => ({ ...s, imprest_account_id: e.target.value }))}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="">Select an account</option>
                            {accounts.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Issued Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newIssueForm.issued_amount}
                            onChange={(e) => setNewIssueForm(s => ({ ...s, issued_amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label>Purpose</Label>
                          <Input
                            value={newIssueForm.purpose}
                            onChange={(e) => setNewIssueForm(s => ({ ...s, purpose: e.target.value }))}
                            placeholder="What is this imprest for?"
                          />
                        </div>
                        <div>
                          <Label>Issue Date</Label>
                          <Input
                            type="date"
                            value={newIssueForm.issue_date}
                            onChange={(e) => setNewIssueForm(s => ({ ...s, issue_date: e.target.value }))}
                          />
                        </div>
                        <Button onClick={handleCreateNewImprest} className="w-full gap-2">
                          <Plus size={16} />
                          Create Imprest Issue
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus size={16} />
                        Record Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Record Imprest Expense</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddExpense} className="space-y-4">
                        <div>
                          <Label>Imprest Issue</Label>
                          <div className="space-y-2">
                            {openIssues.map(issue => (
                              <label key={issue.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-secondary/50">
                                <input
                                  type="radio"
                                  name="issue"
                                  value={issue.id}
                                  checked={selectedIssueId === issue.id}
                                  onChange={() => setSelectedIssueId(issue.id)}
                                />
                                <span className="text-sm">
                                  {(issue.imprest_accounts as any)?.name} - {issue.purpose} ({Number(issue.issued_amount).toFixed(2)})
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm(s => ({ ...s, amount: e.target.value }))}
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm(s => ({ ...s, description: e.target.value }))}
                            placeholder="What was spent on?"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="receipt">Receipt Number (optional)</Label>
                          <Input
                            id="receipt"
                            value={expenseForm.receipt_no}
                            onChange={(e) => setExpenseForm(s => ({ ...s, receipt_no: e.target.value }))}
                            placeholder="Receipt #"
                          />
                        </div>
                        <div>
                          <Label htmlFor="date">Expense Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={expenseForm.expense_date}
                            onChange={(e) => setExpenseForm(s => ({ ...s, expense_date: e.target.value }))}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Record Expense</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {openIssues.map(issue => {
                  const { total, balance, issueExpenses } = getIssueSummary(issue);
                  return (
                    <div key={issue.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{(issue.imprest_accounts as any)?.name}</h4>
                          <p className="text-sm text-muted-foreground">{issue.purpose}</p>
                        </div>
                        <Badge variant="default">OPEN</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-sm bg-secondary/50 p-3 rounded">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Issued</p>
                          <p className="font-mono font-bold">{Number(issue.issued_amount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Spent</p>
                          <p className="font-mono font-bold">{total.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Balance</p>
                          <p className={`font-mono font-bold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {balance.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {issueExpenses.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Expenses:</p>
                          <Table className="text-xs">
                            <TableHeader>
                              <TableRow className="border-b-0">
                                <TableHead className="py-1 px-2 h-auto">Date</TableHead>
                                <TableHead className="py-1 px-2 h-auto">Description</TableHead>
                                <TableHead className="py-1 px-2 h-auto text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {issueExpenses.map(expense => (
                                <TableRow key={expense.id} className="border-b-0 hover:bg-secondary/50">
                                  <TableCell className="py-1 px-2">{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                                  <TableCell className="py-1 px-2">{expense.description}</TableCell>
                                  <TableCell className="py-1 px-2 text-right font-mono">{Number(expense.amount).toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {canWrite && (
                        <div className="flex gap-2 pt-2">
                          {balance >= 0 && (
                            <Dialog open={retireDialog && selectedIssueId === issue.id} onOpenChange={(open) => {
                              if (open) setSelectedIssueId(issue.id);
                              setRetireDialog(open);
                            }}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 flex-1"
                                  onClick={() => setSelectedIssueId(issue.id)}
                                >
                                  <Check size={16} />
                                  Retire Imprest
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Retire Imprest</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleRetireImprest} className="space-y-4">
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Issue Amount:</p>
                                    <p className="text-lg font-bold">{Number(issue.issued_amount).toFixed(2)}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">Total Expenses:</p>
                                    <p className="text-lg font-bold">{total.toFixed(2)}</p>
                                  </div>
                                  <div className="space-y-2 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">Balance to Account for:</p>
                                    <p className={`text-2xl font-bold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {balance.toFixed(2)}
                                    </p>
                                  </div>
                                  {balance < 0 && (
                                    <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                      ⚠️ Overspent by {Math.abs(balance).toFixed(2)}. Additional expenses to record?
                                    </p>
                                  )}
                                  <Button type="submit" className="w-full gap-2">
                                    <Check size={16} />
                                    Confirm Retirement
                                  </Button>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {openIssues.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">No open imprest issues</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retired">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Retired Imprest</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retiredIssues.map(issue => {
                    const { total } = getIssueSummary(issue);
                    return (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium text-sm">{(issue.imprest_accounts as any)?.name}</TableCell>
                        <TableCell className="text-sm">{new Date(issue.issue_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{issue.purpose}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{Number(issue.issued_amount).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{total.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {retiredIssues.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No retired imprest
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Imprest;
