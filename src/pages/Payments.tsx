import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CreditCard, ArrowUpDown, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface Payment {
  id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  category: string;
  vendor: string;
  reference_number?: string;
  description?: string;
}

interface FundReturn {
  id: number;
  return_date: string;
  recipient: string;
  fund_name: string;
  amount: number;
  reference_number?: string;
  payment_method: string;
}

const Payments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fundReturns, setFundReturns] = useState<FundReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({
    payment_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    payment_method: "CASH",
    category: "",
    vendor: "",
    reference_number: "",
    description: "",
  });

  const [returnForm, setReturnForm] = useState({
    return_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    recipient: "DISTRICT",
    fund_name: "",
    payment_method: "BANK_TRANSFER",
    reference_number: "",
    description: "",
  });

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, returnsRes] = await Promise.all([
        supabase.from("payments").select("*").order("payment_date", { ascending: false }),
        supabase.from("fund_returns").select("*").order("return_date", { ascending: false }),
      ]);

      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (returnsRes.data) setFundReturns(returnsRes.data);
    } catch (error) {
      console.error("Error fetching payment data:", error);
      toast({
        title: "Error",
        description: "Failed to load payment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || !paymentForm.category || !paymentForm.vendor) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("payments").insert([
        {
          payment_date: paymentForm.payment_date,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method as any,
          category: paymentForm.category,
          vendor: paymentForm.vendor,
          reference_number: paymentForm.reference_number || null,
          description: paymentForm.description || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      setPaymentForm({
        payment_date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        payment_method: "CASH",
        category: "",
        vendor: "",
        reference_number: "",
        description: "",
      });

      setOpenPaymentDialog(false);
      await fetchPaymentData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleRecordReturn = async () => {
    if (!returnForm.amount || !returnForm.fund_name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("fund_returns").insert([
        {
          return_date: returnForm.return_date,
          amount: parseFloat(returnForm.amount),
          recipient: returnForm.recipient,
          fund_name: returnForm.fund_name,
          payment_method: returnForm.payment_method as any,
          reference_number: returnForm.reference_number || null,
          description: returnForm.description || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fund return recorded successfully",
      });

      setReturnForm({
        return_date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        recipient: "DISTRICT",
        fund_name: "",
        payment_method: "BANK_TRANSFER",
        reference_number: "",
        description: "",
      });

      setOpenReturnDialog(false);
      await fetchPaymentData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record return",
        variant: "destructive",
      });
    }
  };

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalReturns = fundReturns.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments & Returns"
        description="Manage church payments and fund returns"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">GHS {totalPayments.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">{payments.length} payment records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Total Returns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">GHS {totalReturns.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">{fundReturns.length} return records</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="returns">Fund Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Payment Records</h3>
            <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record New Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                    <Label>Vendor</Label>
                    <Input
                      placeholder="Vendor name"
                      value={paymentForm.vendor}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, vendor: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={paymentForm.category} onValueChange={(value) =>
                      setPaymentForm({ ...paymentForm, category: value })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONFERENCE">Conference</SelectItem>
                        <SelectItem value="UTILITIES">Utilities</SelectItem>
                        <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                        <SelectItem value="SUPPLIES">Supplies</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount</Label>
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
                    <Label>Payment Method</Label>
                    <Select value={paymentForm.payment_method} onValueChange={(value) =>
                      setPaymentForm({ ...paymentForm, payment_method: value })
                    }>
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
                  <div>
                    <Label>Reference Number</Label>
                    <Input
                      placeholder="Optional"
                      value={paymentForm.reference_number}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, reference_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      placeholder="Optional"
                      value={paymentForm.description}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, description: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleRecordPayment} className="w-full">
                    Record Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No payment records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{payment.vendor}</TableCell>
                      <TableCell>{payment.category}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell className="text-right">GHS {payment.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Fund Return Records</h3>
            <Dialog open={openReturnDialog} onOpenChange={setOpenReturnDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Record Return
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Fund Return</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Return Date</Label>
                    <Input
                      type="date"
                      value={returnForm.return_date}
                      onChange={(e) =>
                        setReturnForm({ ...returnForm, return_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Recipient</Label>
                    <Select value={returnForm.recipient} onValueChange={(value) =>
                      setReturnForm({ ...returnForm, recipient: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DISTRICT">District</SelectItem>
                        <SelectItem value="CONFERENCE">Conference</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fund Name</Label>
                    <Input
                      placeholder="Fund name"
                      value={returnForm.fund_name}
                      onChange={(e) =>
                        setReturnForm({ ...returnForm, fund_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={returnForm.amount}
                      onChange={(e) =>
                        setReturnForm({ ...returnForm, amount: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={returnForm.payment_method} onValueChange={(value) =>
                      setReturnForm({ ...returnForm, payment_method: value })
                    }>
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
                  <div>
                    <Label>Reference Number</Label>
                    <Input
                      placeholder="Optional"
                      value={returnForm.reference_number}
                      onChange={(e) =>
                        setReturnForm({ ...returnForm, reference_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      placeholder="Optional"
                      value={returnForm.description}
                      onChange={(e) =>
                        setReturnForm({ ...returnForm, description: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleRecordReturn} className="w-full">
                    Record Return
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fundReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No fund return records yet
                    </TableCell>
                  </TableRow>
                ) : (
                  fundReturns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell>{format(new Date(ret.return_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{ret.fund_name}</TableCell>
                      <TableCell>{ret.recipient}</TableCell>
                      <TableCell>{ret.payment_method}</TableCell>
                      <TableCell className="text-right">GHS {ret.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payments;
