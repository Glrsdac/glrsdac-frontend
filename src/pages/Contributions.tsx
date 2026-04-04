import { useCallback, useEffect, useState } from "react";
import React from "react";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useCurrentChurch } from "@/hooks/use-current-church";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Receipt } from "lucide-react";
import * as api from "@/integrations/supabase/api";

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const isDaybornFundName = (fundName?: string | null) => {
  const normalized = String(fundName || "").toLowerCase();
  return normalized.includes("day born") || normalized.includes("dayborn");
};

const Contributions = () => {
  const SUPPORTED_CURRENCIES = ["GHS", "USD", "EUR", "GBP", "NGN"];
  const { currentChurch } = useCurrentChurch();
  const resolveFundSplitPercentages = (fund?: any) => {
    if (isDaybornFundName(fund?.name)) {
      return {
        conference: 0,
        district: 0,
        local: 100,
      };
    }

    const conferenceBase = Number(fund?.conference_percentage ?? 0);
    const districtBase = Number(fund?.district_percentage ?? 0);
    const localBase = Number(fund?.local_percentage ?? 0);

    const conference = Number.isFinite(conferenceBase) ? conferenceBase : 0;
    const district = Number.isFinite(districtBase) ? districtBase : 0;
    const local = Number.isFinite(localBase) ? localBase : 0;

    const total = conference + district + local;

    if (total < 100) {
      return {
        conference,
        district: district + (100 - total),
        local,
      };
    }

    if (total > 100 && total > 0) {
      const factor = 100 / total;
      return {
        conference: conference * factor,
        district: district * factor,
        local: local * factor,
      };
    }

    return { conference, district, local };
  };
  const [contributions, setContributions] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<{ id: number; week_start: string; week_end: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    sabbath_account_id: "",
    fund_id: "",
    member_id: "",
    amount: "",
    currency_code: "GHS",
    exchange_rate_to_ghs: "1",
    payment_method: "CASH",
    service_date: "",
  });
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [openAccount, fundsRes, membersRes] = await Promise.all([
        api.getOpenSabbathAccount(),
        api.getFunds(currentChurch?.id),
        api.getMembers(currentChurch?.id),
      ]);

      setFunds(fundsRes.data ?? []);
      setMembers(membersRes.data ?? []);

      if (!openAccount) {
        setActiveSession(null);
        setContributions([]);
        setForm((f) => ({ ...f, sabbath_account_id: "" }));
      } else {
        setActiveSession(openAccount);
        setForm((f) => ({ ...f, sabbath_account_id: String(openAccount.id) }));
        const { data: contribs } = await api.getContributionsBySession(openAccount.id);
        setContributions(contribs ?? []);
      }
    } catch (err: any) {
      toast({ title: "Load error", description: err.message || String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, currentChurch?.id]);

  useEffect(() => { load(); }, [load]);

  useRealtimeRefresh({
    channelName: "contributions-rt",
    subscriptions: [{ table: "contributions" }],
    onRefresh: load,
    mode: "auto",
  });

  const onChange = (key: string) => (e: any) => setForm(s => ({ ...s, [key]: e.target ? e.target.value : e }));

  const getWeekdayFromDob = (dob: string | null | undefined) => {
    if (!dob) return null;
    const parsed = new Date(`${dob}T00:00:00`);
    const day = parsed.getDay();
    return Number.isNaN(day) ? null : day;
  };

  const selectedFund = funds.find(f => f.id === Number(form.fund_id));
  const selectedMember = members.find((m) => m.id === Number(form.member_id));
  const isDaybornFundSelected = isDaybornFundName(selectedFund?.name);
  const selectedMemberWeekday = getWeekdayFromDob(selectedMember?.dob);

  const getFundTotals = () => {
    const totals: { [key: number]: { name: string; total: number; conference: number; district: number; local: number } } = {};
    contributions.forEach(c => {
      const fundId = c.fund_id;
      const amount = Number(c.amount || 0);
      const conference = Number(c.conference_portion || 0);
      const district = Number(c.district_portion || 0);
      const local = Number(c.local_portion || 0);
      if (!totals[fundId]) {
        totals[fundId] = { name: (c.funds as any)?.name || "Unknown", total: 0, conference: 0, district: 0, local: 0 };
      }
      totals[fundId].total += amount;
      totals[fundId].conference += conference;
      totals[fundId].district += district;
      totals[fundId].local += local;
    });
    return Object.entries(totals).map(([_, value]) => value).sort((a, b) => b.total - a.total);
  };

  const fundTotals = getFundTotals();
  const grandTotal = fundTotals.reduce((sum, f) => sum + f.total, 0);

  const getMemberTotals = () => {
    const totals: { [key: number]: { name: string; total: number; conference: number; district: number; local: number } } = {};
    contributions.forEach(c => {
      if (!c.member_id) return;
      const memberId = c.member_id;
      const amount = Number(c.amount || 0);
      const conference = Number(c.conference_portion || 0);
      const district = Number(c.district_portion || 0);
      const local = Number(c.local_portion || 0);
      if (!totals[memberId]) {
        const memberName = c.members ? `${(c.members as any).first_name} ${(c.members as any).last_name}` : "Unknown";
        totals[memberId] = { name: memberName, total: 0, conference: 0, district: 0, local: 0 };
      }
      totals[memberId].total += amount;
      totals[memberId].conference += conference;
      totals[memberId].district += district;
      totals[memberId].local += local;
    });
    return Object.entries(totals).map(([_, value]) => value).sort((a, b) => b.total - a.total);
  };

  const memberTotals = getMemberTotals();

  const getMemberFundMatrix = () => {
    const matrix: { [memberId: number]: { name: string; funds: { [fundId: number]: { name: string; amount: number; conference: number; district: number; local: number } }; total: number } } = {};
    const allFunds = new Set<number>();
    const UNASSIGNED_MEMBER_ID = 0;

    contributions.forEach(c => {
      const memberId = c.member_id ? Number(c.member_id) : UNASSIGNED_MEMBER_ID;
      const fundId = c.fund_id;
      const amount = Number(c.amount || 0);
      const conference = Number(c.conference_portion || 0);
      const district = Number(c.district_portion || 0);
      const local = Number(c.local_portion || 0);

      allFunds.add(fundId);

      if (!matrix[memberId]) {
        const memberName = memberId === UNASSIGNED_MEMBER_ID
          ? "Unassigned / Anonymous"
          : (c.members ? `${(c.members as any).first_name} ${(c.members as any).last_name}` : "Unknown");
        matrix[memberId] = { name: memberName, funds: {}, total: 0 };
      }

      if (!matrix[memberId].funds[fundId]) {
        const fundName = (c.funds as any)?.name || "Unknown";
        matrix[memberId].funds[fundId] = { name: fundName, amount: 0, conference: 0, district: 0, local: 0 };
      }

      matrix[memberId].funds[fundId].amount += amount;
      matrix[memberId].funds[fundId].conference += conference;
      matrix[memberId].funds[fundId].district += district;
      matrix[memberId].funds[fundId].local += local;
      matrix[memberId].total += amount;
    });

    return { matrix, fundIds: Array.from(allFunds).sort((a, b) => a - b) };
  };

  const { matrix: memberFundMatrix, fundIds } = getMemberFundMatrix();
  const fundNames = fundIds.map(id => funds.find(f => f.id === id)?.name || "Unknown");

  const getFundDemarcations = () => {
    const demarcations: { [fundId: number]: { hasConf: boolean; hasDistrict: boolean; hasLocal: boolean } } = {};
    fundIds.forEach(fundId => {
      let hasConf = false;
      let hasDistrict = false;
      let hasLocal = false;
      Object.values(memberFundMatrix).forEach(member => {
        const fundData = member.funds[fundId];
        if (fundData) {
          if (fundData.conference > 0) hasConf = true;
          if (fundData.district > 0) hasDistrict = true;
          if (fundData.local > 0) hasLocal = true;
        }
      });
      demarcations[fundId] = { hasConf, hasDistrict, hasLocal };
    });
    return demarcations;
  };

  const fundDemarcations = getFundDemarcations();

  const getFundDemarcationsFromConfig = () => {
    const demarcations: { [fundId: number]: { hasConf: boolean; hasDistrict: boolean; hasLocal: boolean } } = {};
    fundIds.forEach(fundId => {
      const fund = funds.find(f => f.id === fundId);
      const split = resolveFundSplitPercentages(fund);
      const confPercent = split.conference;
      const districtPercent = split.district;
      const localPercent = split.local;
      const hasConf = confPercent > 0;
      const hasDistrict = districtPercent > 0;
      const hasLocal = localPercent > 0;
      demarcations[fundId] = { hasConf, hasDistrict, hasLocal };
    });
    return demarcations;
  };

  const fundDemarcationsConfig = getFundDemarcationsFromConfig();

  const submit = async (e: any) => {
    e.preventDefault();
    try {
      const isDaybornFund = isDaybornFundName(selectedFund?.name);
      const originalAmount = Number(form.amount);
      const currencyCode = (form.currency_code || "GHS").toUpperCase();
      const exchangeRate = currencyCode === "GHS" ? 1 : Number(form.exchange_rate_to_ghs || "0");

      if (!originalAmount || Number.isNaN(originalAmount)) {
        toast({ title: "Validation error", description: "Enter a valid amount.", variant: "destructive" });
        return;
      }

      if (currencyCode !== "GHS" && (!exchangeRate || Number.isNaN(exchangeRate) || exchangeRate <= 0)) {
        toast({ title: "Validation error", description: "Enter a valid exchange rate to GHS.", variant: "destructive" });
        return;
      }

      if (isDaybornFund) {
        if (!form.member_id) {
          toast({ title: "Validation error", description: "Select a member for Day Born contribution.", variant: "destructive" });
          return;
        }
        if (!selectedMember?.dob) {
          toast({ title: "Validation error", description: "Selected member has no DOB. Please update member DOB first.", variant: "destructive" });
          return;
        }
      }

      const amountInGhs = currencyCode === "GHS" ? originalAmount : originalAmount * exchangeRate;
      const split = resolveFundSplitPercentages(selectedFund);
      const confPercent = split.conference;
      const districtPercent = split.district;
      const localPercent = split.local;
      
      const derivedContributionDay = isDaybornFund ? getWeekdayFromDob(selectedMember?.dob) : null;

      if (isDaybornFund && derivedContributionDay === null) {
        toast({ title: "Validation error", description: "Could not derive weekday from member DOB.", variant: "destructive" });
        return;
      }

      const payload: any = {
        amount: amountInGhs,
        amount_original: originalAmount,
        currency_code: currencyCode,
        exchange_rate_to_ghs: exchangeRate,
        fund_id: Number(form.fund_id),
        member_id: form.member_id ? Number(form.member_id) : null,
        payment_method: form.payment_method || null,
        sabbath_account_id: Number(form.sabbath_account_id),
        service_date: form.service_date || new Date().toISOString().slice(0, 10),
        conference_portion: (amountInGhs * confPercent) / 100,
        district_portion: (amountInGhs * districtPercent) / 100,
        local_portion: (amountInGhs * localPercent) / 100,
        contribution_day: derivedContributionDay,
      };
      const { error } = await api.createContribution(payload);
      if (error) {
        toast({ title: "Save error", description: error.message || String(error), variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: "Contribution recorded" });
      setForm((f) => ({
        ...f,
        fund_id: "",
        member_id: "",
        amount: "",
        currency_code: "GHS",
        exchange_rate_to_ghs: "1",
        service_date: "",
      }));
      await load();
    } catch (err: any) {
      toast({ title: "Save error", description: err.message || String(err), open: true });
    }
  };

  const noSession = !loading && !activeSession;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contributions"
        icon={<Receipt className="w-5 h-5" />}
        description={
          activeSession
            ? `Session: ${new Date(activeSession.week_start).toLocaleDateString()} – ${new Date(activeSession.week_end).toLocaleDateString()} (Open)`
            : noSession
              ? "No active session. Open a new session to record contributions."
              : "Record tithes and offerings"
        }
      />

      {loading && (
        <div className="mb-6 rounded-lg border bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      )}

      {noSession && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-6 text-center text-sm text-amber-800 dark:text-amber-200">
          No active session. Data will appear here when a new session is opened. Open a session from <strong>Sabbath Sessions</strong> to start recording contributions.
        </div>
      )}

      {activeSession && (
      <form onSubmit={submit} className="mb-6 grid grid-cols-1 md:grid-cols-7 gap-4">
        <div>
          <Label>Fund</Label>
          <Select value={form.fund_id} onValueChange={(v) => setForm(s => ({ ...s, fund_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select fund" />
            </SelectTrigger>
            <SelectContent>
              {funds.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Member (optional)</Label>
          <Select value={form.member_id} onValueChange={(v) => setForm(s => ({ ...s, member_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {members.map(m => <SelectItem key={m.id} value={String(m.id)}>{`${m.first_name} ${m.last_name}`}</SelectItem>)}
            </SelectContent>
          </Select>
          {isDaybornFundSelected && form.member_id && selectedMemberWeekday !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Day Born weekday: <strong>{WEEKDAY_NAMES[selectedMemberWeekday]}</strong>
            </p>
          )}
        </div>

        <div>
          <Label>Amount (selected currency)</Label>
          <Input 
            value={form.amount} 
            onChange={onChange("amount")} 
            placeholder="0.00" 
            type="number"
            step="0.01"
          />
        </div>

        <div>
          <Label>Currency</Label>
          <Select value={form.currency_code} onValueChange={(v) => setForm(s => ({ ...s, currency_code: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Rate to GHS</Label>
          <Input
            value={form.exchange_rate_to_ghs}
            onChange={onChange("exchange_rate_to_ghs")}
            placeholder="1.00"
            type="number"
            step="0.0001"
            disabled={form.currency_code === "GHS"}
          />
        </div>

        <div>
          <Label>Payment method</Label>
          <Select value={form.payment_method} onValueChange={(v) => setForm(s => ({ ...s, payment_method: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="MOMO">Mobile Money</SelectItem>
              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-1 flex items-end">
          <Button type="submit">Record</Button>
        </div>

        <div className="md:col-span-7 text-xs text-muted-foreground">
          Entries are posted in GHS for accounting. Foreign currency amounts are stored with exchange rate and converted to GHS totals.
          {form.amount && Number(form.amount) && (
            <span className="ml-2 font-medium">
              GHS Equivalent: {(
                (form.currency_code === "GHS" ? Number(form.amount) : Number(form.amount) * Number(form.exchange_rate_to_ghs || "0")) || 0
              ).toFixed(2)}
            </span>
          )}
          {(() => {
            const selectedFund = funds.find((f) => f.id === Number(form.fund_id));
            const selectedMember = members.find((m) => m.id === Number(form.member_id));
            const isDaybornFund = isDaybornFundName(selectedFund?.name);
            if (!isDaybornFund) return null;

            if (!selectedMember?.dob) {
              return <span className="ml-2 text-amber-700">Day Born weekday will be auto-set from selected member DOB.</span>;
            }

            const weekday = getWeekdayFromDob(selectedMember.dob);
            if (weekday == null) {
              return <span className="ml-2 text-amber-700">Day Born weekday could not be derived from selected DOB.</span>;
            }

            return <span className="ml-2 text-blue-700">Day Born weekday auto-set to {WEEKDAY_NAMES[weekday]} from member DOB.</span>;
          })()}
        </div>
      </form>
      )}

      {activeSession && fundTotals.length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {fundTotals.map((fund, idx) => (
            <div key={idx} className="bg-card rounded-lg border p-4">
              <div className="text-xs text-muted-foreground mb-1">Fund</div>
              <div className="font-semibold text-sm mb-3">{fund.name}</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-mono font-bold">{fund.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span className="text-muted-foreground">Conf:</span>
                  <span className="font-mono font-bold">{fund.conference.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-600">
                  <span className="text-muted-foreground">District:</span>
                  <span className="font-mono font-bold">{fund.district.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="text-muted-foreground">Local:</span>
                  <span className="font-mono font-bold">{fund.local.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-primary/10 rounded-lg border border-primary/30 p-4">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="font-semibold text-sm mb-3">All Funds</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-mono font-bold">{grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span className="text-muted-foreground">Conf:</span>
                <span className="font-mono font-bold">{fundTotals.reduce((sum, f) => sum + f.conference, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span className="text-muted-foreground">District:</span>
                <span className="font-mono font-bold">{fundTotals.reduce((sum, f) => sum + f.district, 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span className="text-muted-foreground">Local:</span>
                <span className="font-mono font-bold">{fundTotals.reduce((sum, f) => sum + f.local, 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSession && (
      <div className="bg-card rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <TableRow className="border-b-2 border-primary/20">
              <TableHead className="font-bold text-sm text-primary px-4 py-3">Member</TableHead>
              {fundNames.map((fname, idx) => {
                const fundId = fundIds[idx];
                const { hasConf, hasDistrict, hasLocal } = fundDemarcationsConfig[fundId];
                const colspan = (hasConf ? 1 : 0) + (hasDistrict ? 1 : 0) + (hasLocal ? 1 : 0);
                return colspan > 0 ? (
                  <TableHead key={idx} colSpan={colspan} className="text-center font-bold text-sm text-primary px-4 py-3 border-l border-primary/20">{fname}</TableHead>
                ) : null;
              })}
              <TableHead className="text-right font-bold text-sm text-primary px-4 py-3 border-l border-primary/20">Total</TableHead>
            </TableRow>
            <TableRow className="bg-primary/5">
              <TableHead className="px-4 py-2"></TableHead>
              {fundNames.map((_, idx) => {
                const fundId = fundIds[idx];
                const { hasConf, hasDistrict, hasLocal } = fundDemarcationsConfig[fundId];
                return (
                  <React.Fragment key={idx}>
                    {hasConf && <TableHead className="text-right text-xs font-semibold text-blue-700 px-3 py-2">Conf</TableHead>}
                    {hasDistrict && <TableHead className="text-right text-xs font-semibold text-amber-700 px-3 py-2">District</TableHead>}
                    {hasLocal && <TableHead className="text-right text-xs font-semibold text-green-700 px-3 py-2">Local</TableHead>}
                  </React.Fragment>
                );
              })}
              <TableHead className="px-4 py-2"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(memberFundMatrix).map(([idx, member], rowIdx) => (
              <TableRow key={member.name} className={`border-b transition-colors hover:bg-muted/50 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}`}>
                <TableCell className="font-bold text-sm text-foreground px-4 py-3 sticky left-0 bg-inherit">{member.name}</TableCell>
                {fundIds.map(fundId => {
                  const fundData = member.funds[fundId];
                  const { hasConf, hasDistrict, hasLocal } = fundDemarcationsConfig[fundId];
                  return (
                    <React.Fragment key={fundId}>
                      {hasConf && (
                        <TableCell className="text-right px-3 py-3 font-mono text-sm">
                          {fundData ? (
                            <div className="font-semibold text-blue-700 bg-blue-50 rounded px-2 py-1 inline-block">{fundData.conference.toFixed(2)}</div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {hasDistrict && (
                        <TableCell className="text-right px-3 py-3 font-mono text-sm">
                          {fundData ? (
                            <div className="font-semibold text-amber-700 bg-amber-50 rounded px-2 py-1 inline-block">{fundData.district.toFixed(2)}</div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      {hasLocal && (
                        <TableCell className="text-right px-3 py-3 font-mono text-sm">
                          {fundData ? (
                            <div className="font-semibold text-green-700 bg-green-50 rounded px-2 py-1 inline-block">{fundData.local.toFixed(2)}</div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                    </React.Fragment>
                  );
                })}
                <TableCell className="text-right px-4 py-3 font-mono font-bold text-lg text-primary bg-primary/5 border-l border-primary/20">{member.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
            {Object.keys(memberFundMatrix).length === 0 && (
              <TableRow><TableCell colSpan={fundIds.reduce((sum, id) => sum + ((fundDemarcationsConfig[id].hasConf ? 1 : 0) + (fundDemarcationsConfig[id].hasDistrict ? 1 : 0) + (fundDemarcationsConfig[id].hasLocal ? 1 : 0)), 1) + 1} className="text-center text-muted-foreground py-8">No contributions recorded yet</TableCell></TableRow>
            )}
          </TableBody>
          {Object.keys(memberFundMatrix).length > 0 && (
            <TableBody>
              <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-t-2 border-primary/30 font-bold">
                <TableCell className="text-left text-sm font-bold text-primary px-4 py-3">TOTALS</TableCell>
                {fundIds.map(fundId => {
                  const { hasConf, hasDistrict, hasLocal } = fundDemarcationsConfig[fundId];
                  const confTotal = Object.values(memberFundMatrix).reduce((sum, m) => sum + (m.funds[fundId]?.conference || 0), 0);
                  const districtTotal = Object.values(memberFundMatrix).reduce((sum, m) => sum + (m.funds[fundId]?.district || 0), 0);
                  const localTotal = Object.values(memberFundMatrix).reduce((sum, m) => sum + (m.funds[fundId]?.local || 0), 0);
                  return (
                    <React.Fragment key={fundId}>
                      {hasConf && <TableCell className="text-right font-mono text-sm font-bold text-blue-700 px-3 py-3 bg-blue-50/50">{confTotal.toFixed(2)}</TableCell>}
                      {hasDistrict && <TableCell className="text-right font-mono text-sm font-bold text-amber-700 px-3 py-3 bg-amber-50/50">{districtTotal.toFixed(2)}</TableCell>}
                      {hasLocal && <TableCell className="text-right font-mono text-sm font-bold text-green-700 px-3 py-3 bg-green-50/50">{localTotal.toFixed(2)}</TableCell>}
                    </React.Fragment>
                  );
                })}
                <TableCell className="text-right font-mono text-lg font-bold text-primary px-4 py-3 bg-primary/10 border-l border-primary/30">{Object.values(memberFundMatrix).reduce((sum, m) => sum + m.total, 0).toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </div>
      )}
    </div>
  );
};

export default Contributions;
