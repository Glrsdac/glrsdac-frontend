import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getSafeErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Printer, CheckCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const chequeSchema = z.object({
  cheque_number: z.string().trim().min(1, "Cheque number is required").max(20),
  payee: z.string().trim().min(1, "Payee name is required").max(100),
  amount: z.number().positive("Amount must be positive").max(10_000_000),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  bank_account: z.string().min(1, "Bank account is required"),
  department_id: z.string().min(1, "Department is required"),
  status: z.enum(["ISSUED", "PRESENTED", "CLEARED", "BOUNCED", "CANCELLED"]),
  notes: z.string().max(500).optional(),
});

type ChequeStatus = "ISSUED" | "PRESENTED" | "CLEARED" | "BOUNCED" | "CANCELLED";

interface Cheque {
  id: number;
  cheque_number: string;
  payee: string;
  amount: number;
  issue_date: string;
  due_date: string;
  bank_account: string;
  department_id: number;
  expenses_id: number | null;
  status: ChequeStatus;
  notes: string | null;
  created_at: string;
}

const Cheques = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ChequeStatus>("ISSUED");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [form, setForm] = useState({
    cheque_number: "",
    payee: "",
    amount: 0,
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    bank_account: "",
    department_id: "",
    expenses_id: "",
    status: "ISSUED" as ChequeStatus,
    notes: "",
  });
  const { toast } = useToast();

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

  const isAdmin = userRole === "ADMIN";
  const isTreasurer = userRole === "TREASURER";
  const canModify = isAdmin || isTreasurer;

  const fetch = async () => {
    const [chq, deps, exp, accs] = await Promise.all([
      supabase.from("cheques" as any).select("*").order("issue_date", { ascending: false }),
      supabase.from("departments").select("id, name").eq("is_active", true),
      supabase.from("imprest_expenses").select("id, description, amount"),
      supabase.from("bank_accounts").select("id, name, account_number").eq("is_active", true),
    ]);

    setCheques((chq.data as unknown as Cheque[]) ?? []);
    setDepartments(deps.data ?? []);
    setExpenses(exp.data ?? []);
    setBankAccounts(accs.data ?? []);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = chequeSchema.safeParse({
      cheque_number: form.cheque_number,
      payee: form.payee,
      amount: parseFloat(form.amount.toString()),
      issue_date: form.issue_date,
      due_date: form.due_date,
      bank_account: form.bank_account,
      department_id: form.department_id,
      status: form.status,
      notes: form.notes || undefined,
    });

    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    // Check if cheque number already exists
    const existing = cheques.find(c => c.cheque_number === form.cheque_number);
    if (existing) {
      toast({ title: "Error", description: "Cheque number already exists", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("cheques" as any).insert({
      cheque_number: form.cheque_number,
      payee: form.payee,
      amount: parseFloat(form.amount.toString()),
      issue_date: form.issue_date,
      due_date: form.due_date,
      bank_account: form.bank_account,
      department_id: parseInt(form.department_id),
      expenses_id: form.expenses_id ? parseInt(form.expenses_id) : null,
      status: form.status,
      notes: form.notes || null,
    });

    if (error) {
      if (error.message?.includes("permission")) {
        toast({ title: "Permission denied", description: "Only Admin and Treasurer can create cheques", variant: "destructive" });
      } else {
        toast({ title: "Error", description: getSafeErrorMessage(error, "Failed to create cheque. Please try again."), variant: "destructive" });
      }
    } else {
      toast({ title: "Cheque issued successfully" });
      resetForm();
      setAddOpen(false);
      fetch();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const parsed = chequeSchema.safeParse({
      cheque_number: form.cheque_number,
      payee: form.payee,
      amount: parseFloat(form.amount.toString()),
      issue_date: form.issue_date,
      due_date: form.due_date,
      bank_account: form.bank_account,
      department_id: form.department_id,
      status: form.status,
      notes: form.notes || undefined,
    });

    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("cheques" as any)
      .update({
        cheque_number: form.cheque_number,
        payee: form.payee,
        amount: parseFloat(form.amount.toString()),
        issue_date: form.issue_date,
        due_date: form.due_date,
        bank_account: form.bank_account,
        department_id: parseInt(form.department_id),
        expenses_id: form.expenses_id ? parseInt(form.expenses_id) : null,
        status: form.status,
        notes: form.notes || null,
      })
      .eq("id", editingId);

    if (error) {
      if (error.message?.includes("permission")) {
        toast({ title: "Permission denied", description: "Only Admin and Treasurer can update cheques", variant: "destructive" });
      } else {
        toast({ title: "Error", description: getSafeErrorMessage(error, "Failed to update cheque. Please try again."), variant: "destructive" });
      }
    } else {
      toast({ title: "Cheque updated successfully" });
      setEditingId(null);
      setEditOpen(false);
      resetForm();
      fetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("cheques" as any).delete().eq("id", deleteId);

    if (error) {
      if (error.message?.includes("permission")) {
        toast({ title: "Permission denied", description: "Only Admin and Treasurer can delete cheques. Only ISSUED cheques can be deleted.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: getSafeErrorMessage(error, "Failed to delete cheque. Please try again."), variant: "destructive" });
      }
    } else {
      toast({ title: "Cheque deleted successfully" });
      setDeleteId(null);
      fetch();
    }
  };

  const handleStatusUpdate = async (chequeId: number, newStatus: ChequeStatus) => {
    // Find the cheque being updated
    const cheque = cheques.find(c => c.id === chequeId);
    if (!cheque) {
      toast({ title: "Error", description: "Cheque not found", variant: "destructive" });
      return;
    }

    // Define valid status transitions
    const validTransitions: { [key in ChequeStatus]: ChequeStatus[] } = {
      ISSUED: ["PRESENTED", "CANCELLED"],
      PRESENTED: ["CLEARED", "BOUNCED", "CANCELLED"],
      CLEARED: [],
      BOUNCED: ["PRESENTED", "CANCELLED"],
      CANCELLED: ["ISSUED"],
    };

    const allowedTransitions = validTransitions[cheque.status] || [];

    // Validate the transition
    if (!allowedTransitions.includes(newStatus)) {
      toast({
        title: "Invalid Status Transition",
        description: `Cannot change from ${cheque.status} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(", ") || "None"}`,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("cheques" as any).update({ status: newStatus }).eq("id", chequeId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Cheque marked as ${newStatus}` });
      fetch();
    }
  };

  const resetForm = () => {
    setForm({
      cheque_number: "",
      payee: "",
      amount: 0,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      bank_account: bankAccounts.length > 0 ? bankAccounts[0].id.toString() : "",
      department_id: "",
      expenses_id: "",
      status: "ISSUED",
      notes: "",
    });
  };

  const openEdit = (cheque: Cheque) => {
    setEditingId(cheque.id);
    setForm({
      cheque_number: cheque.cheque_number,
      payee: cheque.payee,
      amount: cheque.amount,
      issue_date: cheque.issue_date,
      due_date: cheque.due_date,
      bank_account: cheque.bank_account,
      department_id: cheque.department_id?.toString() || "",
      expenses_id: cheque.expenses_id?.toString() || "",
      status: cheque.status,
      notes: cheque.notes || "",
    });
    setEditOpen(true);
  };

  const filteredCheques = cheques.filter(c => c.status === activeTab);
  const totalByTab = filteredCheques.reduce((sum, c) => sum + c.amount, 0);
  const totalAll = cheques.reduce((sum, c) => sum + c.amount, 0);

  const statusCounts = {
    ISSUED: cheques.filter(c => c.status === "ISSUED").length,
    PRESENTED: cheques.filter(c => c.status === "PRESENTED").length,
    CLEARED: cheques.filter(c => c.status === "CLEARED").length,
    BOUNCED: cheques.filter(c => c.status === "BOUNCED").length,
    CANCELLED: cheques.filter(c => c.status === "CANCELLED").length,
  };

  const getStatusColor = (status: ChequeStatus) => {
    const colors: { [key in ChequeStatus]: string } = {
      ISSUED: "bg-blue-100 text-blue-800",
      PRESENTED: "bg-yellow-100 text-yellow-800",
      CLEARED: "bg-green-100 text-green-800",
      BOUNCED: "bg-red-100 text-red-800",
      CANCELLED: "bg-gray-100 text-gray-800",
    };
    return colors[status];
  };

  const getDepartmentName = (deptId: number) => {
    return departments.find(d => d.id === deptId)?.name || "Unknown";
  };

  const getBankAccountName = (accountId: string | number) => {
    const numId = typeof accountId === 'string' ? parseInt(accountId) : accountId;
    const account = bankAccounts.find(a => a.id === numId);
    return account ? `${account.name} ${account.account_number ? `(${account.account_number})` : ""}` : "Unknown";
  };

  const getExpenseDescription = (expId: number | null) => {
    if (!expId) return "-";
    return expenses.find(e => e.id === expId)?.description || "-";
  };

  const handlePrint = () => {
    window.print();
  };

  const ChequeForm = ({ onSubmit }: { onSubmit: (e: React.FormEvent) => Promise<void> }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cheque Number *</Label>
          <Input
            value={form.cheque_number}
            onChange={e => setForm(f => ({ ...f, cheque_number: e.target.value }))}
            placeholder="e.g., CHQ-001234"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Bank Account *</Label>
          <Select value={form.bank_account} onValueChange={(val) => setForm(f => ({ ...f, bank_account: val }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select bank account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id.toString()}>
                  {acc.name} {acc.account_number ? `(${acc.account_number})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payee Name *</Label>
        <Input
          value={form.payee}
          onChange={e => setForm(f => ({ ...f, payee: e.target.value }))}
          placeholder="Name of cheque recipient"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Department *</Label>
          <Select value={form.department_id} onValueChange={(val) => setForm(f => ({ ...f, department_id: val }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id.toString()}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Issue Date *</Label>
          <Input
            type="date"
            value={form.issue_date}
            onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Input
            type="date"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status *</Label>
          <Select value={form.status} onValueChange={(val) => setForm(f => ({ ...f, status: val as ChequeStatus }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ISSUED">Issued</SelectItem>
              <SelectItem value="PRESENTED">Presented</SelectItem>
              <SelectItem value="CLEARED">Cleared</SelectItem>
              <SelectItem value="BOUNCED">Bounced</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Expense (Optional)</Label>
          <Select value={form.expenses_id} onValueChange={(val) => setForm(f => ({ ...f, expenses_id: val }))}>
            <SelectTrigger>
              <SelectValue placeholder="Link to expense" />
            </SelectTrigger>
            <SelectContent>
              {expenses.map(e => (
                <SelectItem key={e.id} value={e.id.toString()}>
                  {e.description} (GH₵ {e.amount.toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Additional notes about this cheque"
          className="min-h-20"
        />
      </div>

      <Button type="submit" className="w-full">
        {editingId ? "Update Cheque" : "Issue Cheque"}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Cheques" description="Issue and manage cheques for expenses" icon={<Printer className="w-5 h-5" />}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">GH₵ {totalAll.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Issued</p>
            <p className="text-lg font-bold">{cheques.length}</p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!canModify} title={!canModify ? "Only Admin and Treasurer can issue cheques" : ""}>
                <Plus className="w-4 h-4 mr-1" /> Issue Cheque
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Issue New Cheque</DialogTitle>
              </DialogHeader>
              <ChequeForm onSubmit={handleAdd} />
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Cheque</DialogTitle>
          </DialogHeader>
          <ChequeForm onSubmit={handleEdit} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cheque</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this cheque? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cheque Details</DialogTitle>
          </DialogHeader>
          {selectedCheque && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cheque Number</p>
                  <p className="font-bold">{selectedCheque.cheque_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCheque.status)}`}>
                    {selectedCheque.status}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payee</p>
                  <p className="font-bold">{selectedCheque.payee}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-bold text-lg">GH₵ {selectedCheque.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p>{new Date(selectedCheque.issue_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p>{new Date(selectedCheque.due_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bank Account</p>
                  <p>{getBankAccountName(selectedCheque.bank_account)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p>{getDepartmentName(selectedCheque.department_id)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Linked Expense</p>
                <p>{getExpenseDescription(selectedCheque.expenses_id)}</p>
              </div>
              {selectedCheque.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedCheque.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => openEdit(selectedCheque)} disabled={!canModify} className="flex-1">
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button onClick={handlePrint} variant="outline" className="flex-1">
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
                <Button onClick={() => setDeleteId(selectedCheque.id)} disabled={!canModify} variant="destructive" className="flex-1">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ChequeStatus)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2">
          <TabsTrigger value="ISSUED">
            Issued ({statusCounts.ISSUED})
          </TabsTrigger>
          <TabsTrigger value="PRESENTED">
            Presented ({statusCounts.PRESENTED})
          </TabsTrigger>
          <TabsTrigger value="CLEARED">
            Cleared ({statusCounts.CLEARED})
          </TabsTrigger>
          <TabsTrigger value="BOUNCED">
            Bounced ({statusCounts.BOUNCED})
          </TabsTrigger>
          <TabsTrigger value="CANCELLED">
            Cancelled ({statusCounts.CANCELLED})
          </TabsTrigger>
        </TabsList>

        {(["ISSUED", "PRESENTED", "CLEARED", "BOUNCED", "CANCELLED"] as ChequeStatus[]).map(status => (
          <TabsContent key={status} value={status}>
            <div className="bg-card rounded-xl border overflow-hidden">
              <div className="p-4 border-b bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Total for {status}: <span className="font-bold text-lg">GH₵ {filteredCheques.filter(c => c.status === status).reduce((sum, c) => sum + c.amount, 0).toFixed(2)}</span>
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cheque #</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cheques
                    .filter(c => c.status === status)
                    .map(cheque => (
                      <TableRow key={cheque.id}>
                        <TableCell className="font-mono font-bold">{cheque.cheque_number}</TableCell>
                        <TableCell className="font-medium">{cheque.payee}</TableCell>
                        <TableCell className="text-sm">{getDepartmentName(cheque.department_id)}</TableCell>
                        <TableCell className="text-sm">{new Date(cheque.issue_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm">{new Date(cheque.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-bold">GH₵ {cheque.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getBankAccountName(cheque.bank_account)}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCheque(cheque);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {status === "ISSUED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(cheque.id, "PRESENTED")}
                              disabled={!canModify}
                              title={!canModify ? "Only Admin and Treasurer can update cheques" : "Mark as presented"}
                            >
                              <CheckCircle className="w-4 h-4 text-yellow-600" />
                            </Button>
                          )}
                          {status === "PRESENTED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusUpdate(cheque.id, "CLEARED")}
                              disabled={!canModify}
                              title={!canModify ? "Only Admin and Treasurer can update cheques" : "Mark as cleared"}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {filteredCheques.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No {status.toLowerCase()} cheques
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Cheques;
