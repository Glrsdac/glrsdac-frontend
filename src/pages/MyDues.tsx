import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Calendar, TrendingUp, CheckCircle2, AlertCircle, Inbox, Plus } from "lucide-react";
import { LoadingState, EmptyState } from "@/components/LoadingState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

type MyDue = {
  id: number;
  department_id: number | string;
  monthly_amount: number;
  due_amount: number;
  paid_amount: number;
  outstanding: number;
  is_active: boolean;
  department_name: string;
  department_description: string | null;
  assigned_role: string | null;
  months_paid: number;
  payment_history: Array<{
    payment_month: string;
    payment_amount: number;
    payment_date: string;
    payment_method: string;
  }> | null;
};

const MyDues = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myDues, setMyDues] = useState<MyDue[]>([]);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedDueId, setSelectedDueId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "CASH",
    payment_date: format(new Date(), "yyyy-MM-dd"),
  });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setMyDues([]);
        return;
      }

      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!memberData?.id) {
        setMyDues([]);
        return;
      }

      const [duesRes, rolesRes] = await Promise.all([
        supabase
          .from("department_dues" as any)
          .select("id, department_id, due_amount, paid_amount, monthly_amount, is_active, departments(name, description, dues_enabled)")
          .eq("member_id", memberData.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("department_members" as any)
          .select("department_id, assigned_role")
          .eq("member_id", memberData.id),
      ]);

      if (duesRes.error) {
        console.warn("Department dues table not available:", duesRes.error.message);
        toast({
          title: "Note",
          description: "Department dues data is not currently available.",
          variant: "default",
        });
        setMyDues([]);
        setLoading(false);
        return;
      }

      if (rolesRes.error) throw rolesRes.error;

      const duesRows = (duesRes.data ?? []) as any[];
      if (duesRows.length === 0) {
        setMyDues([]);
        return;
      }

      const dueIds = duesRows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
      const { data: paymentsData, error: paymentsError } = dueIds.length
        ? await supabase
            .from("department_due_payments" as any)
            .select("department_due_id, payment_month, payment_amount, payment_date, payment_method")
            .in("department_due_id", dueIds)
            .order("payment_date", { ascending: false })
        : { data: [], error: null as any };

      if (paymentsError) throw paymentsError;

      const paymentsByDueId = new Map<number, any[]>();
      for (const payment of (paymentsData ?? []) as any[]) {
        const dueId = Number(payment.department_due_id);
        if (!paymentsByDueId.has(dueId)) paymentsByDueId.set(dueId, []);
        paymentsByDueId.get(dueId)?.push(payment);
      }

      const roleByDepartmentId = new Map<string, string | null>();
      for (const row of (rolesRes.data ?? []) as any[]) {
        roleByDepartmentId.set(String(row.department_id), row.assigned_role ?? null);
      }

      const mapped: MyDue[] = duesRows
        .filter((row) => row.departments?.dues_enabled !== false)
        .map((row) => {
        const id = Number(row.id);
        const dueAmount = Number(row.due_amount || 0);
        const paidAmount = Number(row.paid_amount || 0);
        const paymentHistory = (paymentsByDueId.get(id) ?? []).map((payment) => ({
          payment_month: String(payment.payment_month ?? ""),
          payment_amount: Number(payment.payment_amount || 0),
          payment_date: String(payment.payment_date ?? ""),
          payment_method: String(payment.payment_method ?? "CASH"),
        }));

        return {
          id,
          department_id: row.department_id,
          monthly_amount: Number(row.monthly_amount || 0),
          due_amount: dueAmount,
          paid_amount: paidAmount,
          outstanding: dueAmount - paidAmount,
          is_active: Boolean(row.is_active),
          department_name: String(row.departments?.name ?? "Department"),
          department_description: row.departments?.description ?? null,
          assigned_role: roleByDepartmentId.get(String(row.department_id)) ?? null,
          months_paid: paymentHistory.length,
          payment_history: paymentHistory,
        };
      });

      setMyDues(mapped);
    } catch (err: any) {
      toast({
        title: "Load error",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handleRecordPayment = async () => {
    if (!selectedDueId || !paymentForm.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const paymentMonth = format(new Date(paymentForm.payment_date), "yyyy-MM");
      
      const { error } = await (supabase.from("department_due_payments") as any).insert([
        {
          department_due_id: selectedDueId,
          payment_amount: parseFloat(paymentForm.amount),
          payment_date: paymentForm.payment_date,
          payment_month: paymentMonth,
          payment_method: paymentForm.payment_method,
          recorded_by: user?.id,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setPaymentForm({
        amount: "",
        payment_method: "CASH",
        payment_date: format(new Date(), "yyyy-MM-dd"),
      });
      setSelectedDueId(null);
      setOpenPaymentDialog(false);
      await load();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const getTotalStats = () => {
    const totalDue = myDues.reduce((sum, d) => sum + Number(d.due_amount || 0), 0);
    const totalPaid = myDues.reduce((sum, d) => sum + Number(d.paid_amount || 0), 0);
    const totalOutstanding = myDues.reduce((sum, d) => sum + Number(d.outstanding || 0), 0);
    const activeDues = myDues.filter(d => d.is_active).length;

    return { totalDue, totalPaid, totalOutstanding, activeDues };
  };

  const stats = getTotalStats();

  const formatCurrency = (amount: number | null) => {
    if (amount == null) return "GH₵ 0.00";
    return `GH₵ ${Number(amount).toFixed(2)}`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  };

  const getCurrentMonth = () => {
    return new Date().toISOString().slice(0, 7);
  };

  const hasCurrentMonthPayment = (due: MyDue) => {
    if (!due.payment_history) return false;
    const currentMonth = getCurrentMonth();
    return due.payment_history.some(p => p.payment_month === currentMonth);
  };

  return (
    <div>
      <PageHeader
        title="My Department Dues"
        description="View and track your department dues and payment history"
      />

      {loading ? (
        <LoadingState message="Loading your dues..." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Due</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalDue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{formatCurrency(stats.totalPaid)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalOutstanding)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Dues</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeDues}</div>
              </CardContent>
            </Card>
          </div>

          {myDues.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={<Inbox className="h-10 w-10" />}
                  title="No department dues"
                  description="You have no department dues at this time."
                />
              </CardContent>
            </Card>
          ) : (
            myDues.map((due) => {
              const isPaidThisMonth = hasCurrentMonthPayment(due);
              
              return (
                <Card key={due.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {due.department_name}
                          {isPaidThisMonth && (
                            <Badge variant="outline" className="text-success border-success">
                              Paid This Month
                            </Badge>
                          )}
                        </CardTitle>
                        {due.department_description && (
                          <CardDescription>{due.department_description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2 items-start">
                        <Badge variant={due.is_active ? "default" : "secondary"}>
                          {due.is_active ? "Active" : "Settled"}
                        </Badge>
                        {due.outstanding > 0 && (
                          <Dialog open={openPaymentDialog && selectedDueId === due.id} onOpenChange={setOpenPaymentDialog}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                className="gap-2"
                                onClick={() => setSelectedDueId(due.id)}
                              >
                                <Plus className="h-4 w-4" />
                                Pay
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Record Payment for {due.department_name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Outstanding Amount</Label>
                                  <Input disabled value={formatCurrency(due.outstanding)} />
                                </div>
                                <div>
                                  <Label>Payment Amount (GHS)</Label>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    value={paymentForm.amount}
                                    onChange={(e) =>
                                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Payment Date</Label>
                                  <Input
                                    type="date"
                                    value={paymentForm.payment_date}
                                    onChange={(e) =>
                                      setPaymentForm({ ...paymentForm, payment_date: e.target.value })
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Payment Method</Label>
                                  <Select
                                    value={paymentForm.payment_method}
                                    onValueChange={(value) =>
                                      setPaymentForm({ ...paymentForm, payment_method: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="CASH">Cash</SelectItem>
                                      <SelectItem value="MOMO">Mobile Money</SelectItem>
                                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={handleRecordPayment} className="w-full">
                                  Record Payment
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {due.monthly_amount > 0 && (
                        <div className="border rounded-lg p-3">
                          <div className="text-xs text-muted-foreground mb-1">Monthly Due</div>
                          <div className="text-lg font-semibold text-info">
                            {formatCurrency(due.monthly_amount)}
                          </div>
                        </div>
                      )}
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Total Due</div>
                        <div className="text-lg font-semibold">{formatCurrency(due.due_amount)}</div>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Total Paid</div>
                        <div className="text-lg font-semibold text-success">
                          {formatCurrency(due.paid_amount)}
                        </div>
                      </div>
                      <div className="border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Outstanding</div>
                        <div className="text-lg font-semibold text-destructive">
                          {formatCurrency(due.outstanding)}
                        </div>
                      </div>
                    </div>

                    {due.payment_history && due.payment_history.length > 0 ? (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Payment History ({due.months_paid} month{due.months_paid !== 1 ? 's' : ''})
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead>Month</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Method</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {due.payment_history.map((payment, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {formatMonth(payment.payment_month)}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {formatDate(payment.payment_date)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono font-semibold text-success">
                                    {formatCurrency(payment.payment_amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">{payment.payment_method}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground border rounded-lg bg-muted/30">
                        No payments recorded yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default MyDues;
