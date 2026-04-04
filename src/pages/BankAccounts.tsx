import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Landmark, Plus, Edit, Trash2 } from "lucide-react";
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

const bankAccountSchema = z.object({
  name: z.string().trim().min(1, "Account name is required").max(100, "Account name must be 100 characters or less"),
  account_number: z.string().trim().max(50, "Account number must be 50 characters or less").optional(),
  account_type: z.enum(["SAVINGS", "CHECKING", "OTHER"]),
  bank_name: z.string().trim().max(100, "Bank name must be 100 characters or less").optional(),
  is_active: z.boolean(),
});

const BankAccounts = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [balances, setBalances] = useState<{ [key: number]: number }>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    account_number: "",
    account_type: "SAVINGS",
    bank_name: "",
    is_active: true,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetch = async () => {
    const { data } = await supabase.from("bank_accounts").select("*").order("id");
    setAccounts(data ?? []);

    // Fetch balances for each account
    if (data?.length) {
      const balanceMap: { [key: number]: number } = {};
      for (const account of data) {
        const { data: transactions } = await supabase
          .from("bank_transactions")
          .select("amount")
          .eq("account_id", account.id);
        balanceMap[account.id] = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      }
      setBalances(balanceMap);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bankAccountSchema.safeParse({
      ...form,
      account_type: form.account_type as "SAVINGS" | "CHECKING" | "OTHER",
    });
    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("bank_accounts").insert({
      name: parsed.data.name,
      account_number: parsed.data.account_number || null,
      account_type: parsed.data.account_type,
      bank_name: parsed.data.bank_name || null,
      is_active: parsed.data.is_active,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account added" });
      setForm({ name: "", account_number: "", account_type: "SAVINGS", bank_name: "", is_active: true });
      setAddOpen(false);
      fetch();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const parsed = bankAccountSchema.safeParse({
      ...form,
      account_type: form.account_type as "SAVINGS" | "CHECKING" | "OTHER",
    });
    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("bank_accounts")
      .update({
        name: parsed.data.name,
        account_number: parsed.data.account_number || null,
        account_type: parsed.data.account_type,
        bank_name: parsed.data.bank_name || null,
        is_active: parsed.data.is_active,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account updated" });
      setEditingId(null);
      setEditOpen(false);
      setForm({ name: "", account_number: "", account_type: "SAVINGS", bank_name: "", is_active: true });
      fetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    // Check if account has a non-zero balance
    const balance = balances[deleteId] || 0;
    if (balance !== 0) {
      toast({
        title: "Cannot Delete Account",
        description: `This account has a balance of GH₵ ${Math.abs(balance).toFixed(2)}. Only accounts with zero balance can be deleted.`,
        variant: "destructive",
      });
      setDeleteId(null);
      return;
    }

    const { error } = await supabase.from("bank_accounts").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account deleted" });
      setDeleteId(null);
      fetch();
    }
  };

  const openEdit = (account: any) => {
    setEditingId(account.id);
    setForm({
      name: account.name,
      account_number: account.account_number || "",
      account_type: account.account_type,
      bank_name: account.bank_name || "",
      is_active: account.is_active,
    });
    setEditOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bank Accounts" description="Church financial accounts" icon={<Landmark className="w-5 h-5" />}>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select value={form.account_type} onValueChange={(val) => setForm(f => ({ ...f, account_type: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAVINGS">Savings</SelectItem>
                      <SelectItem value="CHECKING">Checking</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={form.is_active} onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: !!checked }))} />
                <Label>Active</Label>
              </div>
              <Button type="submit" className="w-full">Add Account</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Bank Account</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select value={form.account_type} onValueChange={(val) => setForm(f => ({ ...f, account_type: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAVINGS">Savings</SelectItem>
                    <SelectItem value="CHECKING">Checking</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={form.is_active} onCheckedChange={(checked) => setForm(f => ({ ...f, is_active: !!checked }))} />
              <Label>Active</Label>
            </div>
            <Button type="submit" className="w-full">Update Account</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this account? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map(a => (
          <Card key={a.id} className="animate-fade-in">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{a.name}</h3>
                    <p className="text-xs text-muted-foreground">{a.account_type}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  {a.account_number && <span className="text-sm font-mono text-muted-foreground block">{a.account_number}</span>}
                  <span className="text-lg font-bold text-foreground">GH₵ {balances[a.id]?.toFixed(2) || "0.00"}</span>
                </div>
                <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BankAccounts;
