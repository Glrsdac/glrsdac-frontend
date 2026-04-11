import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Info } from "lucide-react";
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

const expenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(500, "Description must be 500 characters or less"),
  amount: z.number().positive("Amount must be a positive number").max(1_000_000, "Amount seems too large"),
  expense_date: z.string().min(1, "Date is required"),
  receipt_no: z.string().trim().max(50, "Receipt number must be 50 characters or less").optional(),
  imprest_issue_id: z.string().optional(),
  department_id: z.string().min(1, "Department is required"),
  cheque_id: z.string().optional(),
}).refine(
  (data) => data.imprest_issue_id || data.cheque_id,
  {
    message: "Either an imprest issue or a cheque must be selected",
    path: ["imprest_issue_id"],
  }
);

const Expenses = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [imprests, setImprests] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [cheques, setCheques] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [departmentFunds, setDepartmentFunds] = useState<{ [key: string]: number[] }>({});
  const [paymentMethod, setPaymentMethod] = useState<"imprest" | "cheque">("imprest");
  const [addPaymentMethod, setAddPaymentMethod] = useState<"imprest" | "cheque">("imprest");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"imprest" | "cheque">("imprest");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    description: "",
    amount: 0,
    expense_date: new Date().toISOString().split("T")[0],
    receipt_no: "",
    imprest_issue_id: "",
    fund_id: "",
    session_id: "",
    department_id: "",
    supporting_department_id: "",
    cheque_id: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetch = async () => {
    const [exp, imp, fun, dep, ses, deptFunds, activeSes, chq] = await Promise.all([
      supabase
        .from("imprest_expenses")
        .select("*, imprest_issues(reference_no), funds(name), sabbath_sessions(date)")
        .order("expense_date", { ascending: false }),
      supabase.from("imprest_issues").select("id, purpose").eq("status", "OPEN"),
      supabase.from("funds").select("id, name"),
      supabase.from("departments").select("id, name").eq("is_active", true),
      supabase.from("sabbath_sessions").select("id, date"),
      supabase.from("fund_departments").select("department_id, fund_id"),
      supabase.from("sabbath_sessions").select("*").eq("status", "OPEN").maybeSingle(),
      supabase.from("cheques" as any).select("id, cheque_number, payee, amount").eq("status", "ISSUED"),
    ]);

    setExpenses(exp.data ?? []);
    setImprests(imp.data ?? []);
    setFunds(fun.data ?? []);
    setDepartments(dep.data ?? []);
    setSessions(ses.data ?? []);
    setActiveSession(activeSes.data || null);
    setCheques((chq.data as any) ?? []);

    // Build department-to-funds mapping
    const deptFundsMap: { [key: string]: number[] } = {};
    if (deptFunds.data) {
      deptFunds.data.forEach(item => {
        const deptId = item.department_id.toString();
        if (!deptFundsMap[deptId]) {
          deptFundsMap[deptId] = [];
        }
        deptFundsMap[deptId].push(item.fund_id);
      });
    }
    setDepartmentFunds(deptFundsMap);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activeSession) {
      toast({ title: "Error", description: "No active sabbath session. Please open a session first.", variant: "destructive" });
      return;
    }

    const parsed = expenseSchema.safeParse({
      description: form.description,
      amount: parseFloat(form.amount.toString()),
      expense_date: form.expense_date,
      receipt_no: form.receipt_no || undefined,
      imprest_issue_id: form.imprest_issue_id,
      department_id: form.department_id,
      cheque_id: form.cheque_id,
    });
    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    // Validate that selected fund belongs to the department (if a fund is selected)
    if (form.fund_id) {
      const availableFundIds = getAvailableFundsForDepartment().map(f => f.id.toString());
      if (!availableFundIds.includes(form.fund_id)) {
        toast({ title: "Error", description: "Selected fund does not belong to this department", variant: "destructive" });
        return;
      }
    }

    const dept = departments.find(d => d.id.toString() === form.department_id);
    let descriptionWithDept = form.department_id === "church" ? `${form.description} (Church)` : `${form.description} (${dept?.name})`;
    
    // Add supporting department if church is supporting another department
    if (form.department_id === "church" && form.supporting_department_id) {
      const supportedDept = departments.find(d => d.id.toString() === form.supporting_department_id);
      if (supportedDept) {
        descriptionWithDept += ` [Supporting: ${supportedDept.name}]`;
      }
    }

    const { error } = await supabase.from("imprest_expenses").insert({
      description: descriptionWithDept,
      amount: parseFloat(form.amount.toString()),
      expense_date: form.expense_date,
      receipt_no: form.receipt_no || null,
      imprest_issue_id: form.imprest_issue_id ? parseInt(form.imprest_issue_id) : null,
      fund_id: form.fund_id ? parseInt(form.fund_id) : null,
      session_id: activeSession.id,
      cheque_id: form.cheque_id ? parseInt(form.cheque_id) : null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Expense added" });
      resetForm();
      setAddOpen(false);
      fetch();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const parsed = expenseSchema.safeParse({
      description: form.description,
      amount: parseFloat(form.amount.toString()),
      expense_date: form.expense_date,
      receipt_no: form.receipt_no || undefined,
      imprest_issue_id: form.imprest_issue_id || "edit",
      department_id: form.department_id,
    });
    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    // Validate that selected fund belongs to the department (if a fund is selected)
    if (form.fund_id) {
      const availableFundIds = getAvailableFundsForDepartment().map(f => f.id.toString());
      if (!availableFundIds.includes(form.fund_id)) {
        toast({ title: "Error", description: "Selected fund does not belong to this department", variant: "destructive" });
        return;
      }
    }

    const dept = departments.find(d => d.id.toString() === form.department_id);
    let descriptionWithDept = form.department_id === "church" ? `${parsed.data.description} (Church)` : `${parsed.data.description} (${dept?.name})`;
    
    if (form.department_id === "church" && form.supporting_department_id) {
      const supportedDept = departments.find(d => d.id.toString() === form.supporting_department_id);
      if (supportedDept) {
        descriptionWithDept += ` [Supporting: ${supportedDept.name}]`;
      }
    }

    const { error } = await supabase
      .from("imprest_expenses")
      .update({
        description: descriptionWithDept,
        amount: parsed.data.amount,
        expense_date: parsed.data.expense_date,
        receipt_no: parsed.data.receipt_no || null,
        fund_id: form.fund_id ? parseInt(form.fund_id) : null,
        session_id: form.session_id ? parseInt(form.session_id) : null,
        cheque_id: form.cheque_id ? parseInt(form.cheque_id) : null,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Expense updated" });
      setEditingId(null);
      setEditOpen(false);
      resetForm();
      fetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("imprest_expenses").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Expense deleted" });
      setDeleteId(null);
      fetch();
    }
  };

  const resetForm = () => {
    setForm({
      description: "",
      amount: 0,
      expense_date: new Date().toISOString().split("T")[0],
      receipt_no: "",
      imprest_issue_id: "",
      fund_id: "",
      session_id: "",
      department_id: "",
      supporting_department_id: "",
      cheque_id: "",
    });
    setAddPaymentMethod("imprest");
  };

  const openEdit = (expense: any) => {
    // Extract department from description
    let dept = "";
    let supportingDept = "";
    let desc = expense.description;
    
    // Extract main department
    const match = expense.description.match(/\((.*?)\)(?:\s*\[|$)/);
    if (match) {
      const deptName = match[1];
      if (deptName === "Church") {
        dept = "church";
      } else {
        const foundDept = departments.find(d => d.name === deptName);
        if (foundDept) dept = foundDept.id.toString();
      }
      desc = expense.description.replace(/ \(.*?\)/, "");
    }
    
    // Extract supporting department if present
    const supportMatch = expense.description.match(/\[Supporting: (.*?)\]/);
    if (supportMatch) {
      const supportedDeptName = supportMatch[1];
      const foundDept = departments.find(d => d.name === supportedDeptName);
      if (foundDept) supportingDept = foundDept.id.toString();
      desc = desc.replace(/ \[Supporting: .*?\]/, "");
    }

    setEditingId(expense.id);
    setForm({
      description: desc.trim(),
      amount: expense.amount,
      expense_date: expense.expense_date,
      receipt_no: expense.receipt_no || "",
      imprest_issue_id: expense.imprest_issue_id.toString(),
      fund_id: expense.fund_id ? expense.fund_id.toString() : "",
      session_id: expense.session_id ? expense.session_id.toString() : "",
      department_id: dept,
      supporting_department_id: supportingDept,
      cheque_id: expense.cheque_id ? expense.cheque_id.toString() : "",
    });
    setEditPaymentMethod(expense.cheque_id ? "cheque" : "imprest");
    setEditOpen(true);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const getAvailableFundsForDepartment = () => {
    if (!form.department_id) return [];
    if (form.department_id === "church") {
      // Church can only use unassigned funds (loose offering, thanksgiving, combined, etc.)
      const assignedFundIds = new Set<number>();
      Object.values(departmentFunds).forEach(fundIds => {
        fundIds.forEach(id => assignedFundIds.add(id));
      });
      return funds.filter(f => !assignedFundIds.has(f.id));
    }
    // Department can only use funds assigned to them
    const deptId = form.department_id;
    const assignedFundIds = departmentFunds[deptId] || [];
    return funds.filter(f => assignedFundIds.includes(f.id));
  };

  const handleDepartmentChange = (deptId: string) => {
    setForm(f => ({ ...f, department_id: deptId, fund_id: "", supporting_department_id: "" })); // Reset fund when department changes
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track and manage imprest expenses" icon={<Info className="w-5 h-5" />}>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold">GH₵ {totalExpenses.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Sabbath Session</p>
            <p className={`text-lg font-bold ${activeSession ? "text-green-600" : "text-red-600"}`}>
              {activeSession ? "ACTIVE" : "CLOSED"}
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={(open) => {
            if (open && !activeSession) {
              toast({ title: "Error", description: "No active sabbath session. Please open a session in Sabbath Sessions first.", variant: "destructive" });
              return;
            }
            if (!open) {
              resetForm();
            }
            setAddOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!activeSession}>
                <Plus className="w-4 h-4 mr-1" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setAddPaymentMethod("imprest")}
                      className={`flex items-center gap-2 px-4 py-2 border rounded cursor-pointer transition ${
                        addPaymentMethod === "imprest"
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="payment" 
                        checked={addPaymentMethod === "imprest"}
                        onChange={() => setAddPaymentMethod("imprest")}
                        className="cursor-pointer"
                      />
                      <label className="text-sm cursor-pointer">Imprest</label>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddPaymentMethod("cheque")}
                      className={`flex items-center gap-2 px-4 py-2 border rounded cursor-pointer transition ${
                        addPaymentMethod === "cheque"
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="payment" 
                        checked={addPaymentMethod === "cheque"}
                        onChange={() => setAddPaymentMethod("cheque")}
                        className="cursor-pointer"
                      />
                      <label className="text-sm cursor-pointer">Cheque</label>
                    </button>
                  </div>
                </div>
                {addPaymentMethod === "imprest" && (
                  <div className="space-y-2">
                    <Label>Imprest Issue *</Label>
                    <Select value={form.imprest_issue_id} onValueChange={(val) => setForm(f => ({ ...f, imprest_issue_id: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select imprest" />
                      </SelectTrigger>
                      <SelectContent>
                        {imprests.map(i => (
                          <SelectItem key={i.id} value={i.id.toString()}>
                            {i.reference_no}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {addPaymentMethod === "cheque" && (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800">Payment will be processed via the linked cheque</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Department/Source *</Label>
                  <Select value={form.department_id} onValueChange={handleDepartmentChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department or source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="church">Church (General)</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Expense Date *</Label>
                    <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Receipt No</Label>
                  <Input value={form.receipt_no} onChange={e => setForm(f => ({ ...f, receipt_no: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fund (Optional)</Label>
                    <Select value={form.fund_id} onValueChange={(val) => setForm(f => ({ ...f, fund_id: val }))} disabled={!form.department_id}>
                      <SelectTrigger>
                        <SelectValue placeholder={form.department_id ? "Select fund for this department" : "Select department first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableFundsForDepartment().map(f => (
                          <SelectItem key={f.id} value={f.id.toString()}>
                            {f.name}
                          </SelectItem>
                        ))}
                        {getAvailableFundsForDepartment().length === 0 && form.department_id && (
                          <SelectItem value="" disabled>No funds available for this department</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Active Session</Label>
                    <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
                      <span className="text-sm font-medium">{activeSession?.date ? new Date(activeSession.date).toLocaleDateString() : "No active session"}</span>
                    </div>
                  </div>
                </div>
                {form.department_id === "church" && (
                  <div className="space-y-2">
                    <Label>Supporting Department (Optional)</Label>
                    <Select value={form.supporting_department_id} onValueChange={(val) => setForm(f => ({ ...f, supporting_department_id: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select if this supports a specific department" />
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
                )}
                {addPaymentMethod === "cheque" && (
                  <div className="space-y-2">
                    <Label>Linked Cheque</Label>
                    <Select value={form.cheque_id} onValueChange={(val) => setForm(f => ({ ...f, cheque_id: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a cheque" />
                      </SelectTrigger>
                      <SelectContent>
                        {cheques.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.cheque_number} - {c.payee} (GH₵ {c.amount.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full">
                  Add Expense
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Dialog open={editOpen} onOpenChange={(open) => { 
        setEditOpen(open); 
        if (!open) {
          resetForm();
          setEditingId(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setEditPaymentMethod("imprest")}
                  className={`flex items-center gap-2 px-4 py-2 border rounded cursor-pointer transition ${
                    editPaymentMethod === "imprest"
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={editPaymentMethod === "imprest"}
                    onChange={() => setEditPaymentMethod("imprest")}
                    className="cursor-pointer"
                  />
                  <label className="text-sm cursor-pointer">Imprest</label>
                </button>
                <button
                  type="button"
                  onClick={() => setEditPaymentMethod("cheque")}
                  className={`flex items-center gap-2 px-4 py-2 border rounded cursor-pointer transition ${
                    editPaymentMethod === "cheque"
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input 
                    type="radio" 
                    name="payment" 
                    checked={editPaymentMethod === "cheque"}
                    onChange={() => setEditPaymentMethod("cheque")}
                    className="cursor-pointer"
                  />
                  <label className="text-sm cursor-pointer">Cheque</label>
                </button>
              </div>
            </div>
            {editPaymentMethod === "imprest" && (
              <div className="space-y-2">
                <Label>Imprest Issue *</Label>
                <Select value={form.imprest_issue_id} onValueChange={(val) => setForm(f => ({ ...f, imprest_issue_id: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select imprest" />
                  </SelectTrigger>
                  <SelectContent>
                    {imprests.map(i => (
                      <SelectItem key={i.id} value={i.id.toString()}>
                        {i.reference_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editPaymentMethod === "cheque" && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">Payment will be processed via the linked cheque</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Department/Source *</Label>
              <Select value={form.department_id} onValueChange={(val) => setForm(f => ({ ...f, department_id: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department or source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="church">Church (General)</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} required />
              </div>
              <div className="space-y-2">
                <Label>Expense Date *</Label>
                <Input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Receipt No</Label>
              <Input value={form.receipt_no} onChange={e => setForm(f => ({ ...f, receipt_no: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fund (Optional)</Label>
                <Select value={form.fund_id} onValueChange={(val) => setForm(f => ({ ...f, fund_id: val }))} disabled={!form.department_id}>
                  <SelectTrigger>
                    <SelectValue placeholder={form.department_id ? "Select fund for this department" : "Select department first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFundsForDepartment().map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.name}
                      </SelectItem>
                    ))}
                    {getAvailableFundsForDepartment().length === 0 && form.department_id && (
                      <SelectItem value="" disabled>No funds available for this department</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session</Label>
                <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
                  <span className="text-sm font-medium">{activeSession?.date ? new Date(activeSession.date).toLocaleDateString() : "No active session"}</span>
                </div>
              </div>
            </div>
            {form.department_id === "church" && (
              <div className="space-y-2">
                <Label>Supporting Department (Optional)</Label>
                <Select value={form.supporting_department_id} onValueChange={(val) => setForm(f => ({ ...f, supporting_department_id: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select if this supports a specific department" />
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
            )}
            {editPaymentMethod === "cheque" && (
              <div className="space-y-2">
                <Label>Linked Cheque</Label>
                <Select value={form.cheque_id} onValueChange={(val) => setForm(f => ({ ...f, cheque_id: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a cheque" />
                  </SelectTrigger>
                  <SelectContent>
                    {cheques.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.cheque_number} - {c.payee} (GH₵ {c.amount.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" className="w-full">
              Update Expense
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this expense? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Department/Source</TableHead>
              <TableHead>Imprest</TableHead>
              <TableHead>Fund</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map(expense => {
              const match = expense.description.match(/\((.*?)\)$/);
              const deptName = match ? match[1] : "-";
              const desc = expense.description.replace(/ \(.*?\)$/, "");
              return (
                <TableRow key={expense.id}>
                  <TableCell className="font-mono text-sm">{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{desc}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{deptName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{expense.imprest_issues?.reference_no}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{expense.funds?.name || "-"}</TableCell>
                  <TableCell className="text-right font-bold">GH₵ {expense.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{expense.receipt_no || "-"}</TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(expense)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(expense.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No expenses found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Expenses;
