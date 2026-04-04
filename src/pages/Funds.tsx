import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, PiggyBank } from "lucide-react";
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

const Funds = () => {
  const { currentChurch } = useCurrentChurch();
  const [groups, setGroups] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [balances, setBalances] = useState<{ [key: number]: number }>({});
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    fund_group_id: "",
    local_percentage: 50,
    district_percentage: 0,
    conference_percentage: 50,
    allocation_type: "LOCAL",
    is_member_tracked: false,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetch = async () => {
    const [g, f] = await Promise.all([
      supabase.from("fund_groups").select("*").order("id"),
      (async () => {
        let q = (supabase.from("funds") as any).select("*, fund_groups(name)").order("id");
        return q;
      })(),
    ]);
    setGroups(g.data ?? []);
    setFunds(f.data ?? []);

    // Fetch balances for each fund
    if (f.data?.length) {
      const balanceMap: { [key: number]: number } = {};
      for (const fund of f.data!) {
        const { data: collections } = await supabase
          .from("collections")
          .select("amount")
          .eq("fund_id", fund.id);
        balanceMap[fund.id] = collections?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;
      }
      setBalances(balanceMap);
    }
  };

  useEffect(() => {
    fetch();
  }, [currentChurch?.id]);

  const deriveAllocationType = (localPct: number, districtPct: number, confPct: number): "LOCAL" | "CONFERENCE" | "SPLIT" => {
    if (districtPct >= 99) return "SPLIT";
    if (localPct >= 99) return "LOCAL";
    if (confPct >= 99) return "CONFERENCE";
    return "SPLIT";
  };

  const hasValidSplitTotal = (localPct: number, districtPct: number, confPct: number) => {
    const total = localPct + districtPct + confPct;
    return Math.abs(total - 100) < 0.001;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fund_group_id) {
      toast({ title: "Error", description: "Please select a fund group", variant: "destructive" });
      return;
    }

    if (!hasValidSplitTotal(form.local_percentage, form.district_percentage, form.conference_percentage)) {
      toast({ title: "Error", description: "Local + District + Conference percentages must total 100%", variant: "destructive" });
      return;
    }

    const allocation_type = deriveAllocationType(form.local_percentage, form.district_percentage, form.conference_percentage);
    const { error } = await supabase.from("funds").insert([{
      name: form.name,
      fund_group_id: parseInt(form.fund_group_id),
      local_percentage: form.local_percentage,
      district_percentage: form.district_percentage,
      conference_percentage: form.conference_percentage,
      allocation_type: allocation_type as any,
      is_member_tracked: form.is_member_tracked,
    }] as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fund added" });
      setForm({ name: "", fund_group_id: "", local_percentage: 50, district_percentage: 0, conference_percentage: 50, allocation_type: "LOCAL", is_member_tracked: false });
      setAddOpen(false);
      fetch();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    if (!hasValidSplitTotal(form.local_percentage, form.district_percentage, form.conference_percentage)) {
      toast({ title: "Error", description: "Local + District + Conference percentages must total 100%", variant: "destructive" });
      return;
    }

    const allocation_type = deriveAllocationType(form.local_percentage, form.district_percentage, form.conference_percentage);
    const { error } = await supabase
      .from("funds")
      .update({
        name: form.name,
        local_percentage: form.local_percentage,
        district_percentage: form.district_percentage,
        conference_percentage: form.conference_percentage,
        allocation_type: allocation_type as any,
        is_member_tracked: form.is_member_tracked,
      })
      .eq("id", editingId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fund updated" });
      setEditingId(null);
      setEditOpen(false);
      setForm({ name: "", fund_group_id: "", local_percentage: 50, district_percentage: 0, conference_percentage: 50, allocation_type: "LOCAL", is_member_tracked: false });
      fetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("funds").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fund deleted" });
      setDeleteId(null);
      fetch();
    }
  };

  const openEdit = (fund: any) => {
    setEditingId(fund.id);
    setForm({
      name: fund.name,
      fund_group_id: fund.fund_group_id.toString(),
      local_percentage: fund.local_percentage,
      district_percentage: fund.district_percentage ?? 0,
      conference_percentage: fund.conference_percentage,
      allocation_type: fund.allocation_type,
      is_member_tracked: fund.is_member_tracked,
    });
    setEditOpen(true);
  };

  const allocationColor = (t: string) => {
    if (t === "LOCAL") return "default";
    if (t === "CONFERENCE") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Funds" description="Manage tithe, offerings, and special fund categories" icon={<PiggyBank className="w-5 h-5" />}>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Fund</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Fund</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label>Fund Group</Label>
                <Select value={form.fund_group_id} onValueChange={(val) => setForm(f => ({ ...f, fund_group_id: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fund Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Local %</Label>
                  <Input type="number" min="0" max="100" value={form.local_percentage} onChange={e => setForm(f => ({ ...f, local_percentage: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>District %</Label>
                  <Input type="number" min="0" max="100" value={form.district_percentage} onChange={e => setForm(f => ({ ...f, district_percentage: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Conference %</Label>
                  <Input type="number" min="0" max="100" value={form.conference_percentage} onChange={e => setForm(f => ({ ...f, conference_percentage: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox checked={form.is_member_tracked} onCheckedChange={(checked) => setForm(f => ({ ...f, is_member_tracked: !!checked }))} />
                <Label>Member Tracked</Label>
              </div>
              <Button type="submit" className="w-full">Add Fund</Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Fund</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Fund Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Local %</Label>
                <Input type="number" min="0" max="100" value={form.local_percentage} onChange={e => setForm(f => ({ ...f, local_percentage: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>District %</Label>
                <Input type="number" min="0" max="100" value={form.district_percentage} onChange={e => setForm(f => ({ ...f, district_percentage: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Conference %</Label>
                <Input type="number" min="0" max="100" value={form.conference_percentage} onChange={e => setForm(f => ({ ...f, conference_percentage: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={form.is_member_tracked} onCheckedChange={(checked) => setForm(f => ({ ...f, is_member_tracked: !!checked }))} />
              <Label>Member Tracked</Label>
            </div>
            <Button type="submit" className="w-full">Update Fund</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fund</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this fund? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {groups.map(group => (
          <Card key={group.id} className="card-hover">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PiggyBank className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg">{group.name}</CardTitle>
                  {group.description && <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {funds.filter(f => f.fund_group_id === group.id).map(fund => (
                  <div key={fund.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group/item">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{fund.name}</p>
                        <span className="font-heading font-bold text-foreground">GH₵ {balances[fund.id]?.toFixed(2) || "0.00"}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Local: {fund.local_percentage}% · District: {fund.district_percentage ?? 0}% · Conference: {fund.conference_percentage}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-60 group-hover/item:opacity-100 transition-opacity">
                      {fund.is_member_tracked && <Badge variant="outline" className="text-[10px]">Tracked</Badge>}
                      <Badge variant={allocationColor(fund.allocation_type)} className="text-[10px]">{fund.allocation_type}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(fund)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(fund.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {funds.filter(f => f.fund_group_id === group.id).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No funds in this group</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Funds;
