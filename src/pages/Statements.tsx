import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { FileText, Printer } from "lucide-react";
import * as api from "@/integrations/supabase/api";

type StatementType = "session" | "fund" | "member";

const STATEMENT_TYPES: { value: StatementType; label: string; description: string }[] = [
  { value: "session", label: "Session summary", description: "All contributions for a selected sabbath week (session)." },
  { value: "fund", label: "Fund statement", description: "Contributions to a specific fund, with optional date range." },
  { value: "member", label: "Member contribution statement", description: "Contributions by a specific member, with optional date range." },
];

const Statements = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statementType, setStatementType] = useState<StatementType | "">("");
  const [sessionId, setSessionId] = useState<string>("");
  const [fundId, setFundId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ total: number; conference: number; district: number; local: number; title: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [accountsRes, fundsRes, membersRes] = await Promise.all([
          api.getSabbathAccounts(),
          api.getFunds(),
          api.getMembers(),
        ]);
        setAccounts(accountsRes.data ?? []);
        setFunds(fundsRes.data ?? []);
        setMembers(membersRes.data ?? []);
      } catch (e: any) {
        toast({ title: "Load error", description: e?.message || String(e), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const handleGenerate = async () => {
    if (!statementType) {
      toast({ title: "Choose a statement type", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setRows([]);
    setSummary(null);
    try {
      const opts: Parameters<typeof api.getContributionsFiltered>[0] = {};
      let title = "";

      if (statementType === "session") {
        if (!sessionId) {
          toast({ title: "Select a session", variant: "destructive" });
          setGenerating(false);
          return;
        }
        opts.sabbath_account_id = parseInt(sessionId);
        const acc = accounts.find((a) => a.id === parseInt(sessionId));
        title = acc
          ? `Session: ${new Date(acc.week_start).toLocaleDateString()} – ${new Date(acc.week_end).toLocaleDateString()}`
          : "Session statement";
      }

      if (statementType === "fund") {
        if (!fundId) {
          toast({ title: "Select a fund", variant: "destructive" });
          setGenerating(false);
          return;
        }
        opts.fund_id = parseInt(fundId);
        if (dateFrom) opts.date_from = dateFrom;
        if (dateTo) opts.date_to = dateTo;
        const fund = funds.find((f) => f.id === parseInt(fundId));
        title = fund ? `${fund.name}${dateFrom || dateTo ? ` (${dateFrom || "…"} to ${dateTo || "…"})` : ""}` : "Fund statement";
      }

      if (statementType === "member") {
        if (!memberId) {
          toast({ title: "Select a member", variant: "destructive" });
          setGenerating(false);
          return;
        }
        opts.member_id = parseInt(memberId);
        if (dateFrom) opts.date_from = dateFrom;
        if (dateTo) opts.date_to = dateTo;
        const member = members.find((m) => m.id === parseInt(memberId));
        title = member
          ? `${member.first_name} ${member.last_name}${dateFrom || dateTo ? ` (${dateFrom || "…"} to ${dateTo || "…"})` : ""}`
          : "Member statement";
      }

      const { data, error } = await api.getContributionsFiltered(opts);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setGenerating(false);
        return;
      }

      const list = data ?? [];
      setRows(list);

      const total = list.reduce((s, c) => s + Number(c.amount || 0), 0);
      const conference = list.reduce((s, c) => s + Number(c.conference_portion || 0), 0);
      const local = list.reduce((s, c) => s + Number(c.local_portion || 0), 0);
      const district = 0;
      setSummary({ total, conference, district, local, title });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <PageHeader
        title="Statements"
        description="Choose a statement type and options, then generate."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">1. Choose statement type</CardTitle>
          <p className="text-sm text-muted-foreground">Select which kind of statement you want to generate.</p>
        </CardHeader>
        <CardContent>
          <Select
            value={statementType}
            onValueChange={(v) => {
              setStatementType(v as StatementType);
              setSummary(null);
              setRows([]);
            }}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select statement type…" />
            </SelectTrigger>
            <SelectContent>
              {STATEMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="font-medium">{t.label}</span>
                  <span className="text-muted-foreground hidden sm:inline"> — {t.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statementType && (
            <p className="text-sm text-muted-foreground mt-2">
              {STATEMENT_TYPES.find((t) => t.value === statementType)?.description}
            </p>
          )}
        </CardContent>
      </Card>

      {statementType && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">2. Set options & generate</CardTitle>
            <p className="text-sm text-muted-foreground">
              {statementType === "session" && "Pick a sabbath session (week)."}
              {statementType === "fund" && "Pick a fund and optional date range."}
              {statementType === "member" && "Pick a member and optional date range."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {statementType === "session" && (
              <>
                <div className="space-y-2">
                  <Label>Session (week)</Label>
                  <Select value={sessionId} onValueChange={setSessionId} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {new Date(a.week_start).toLocaleDateString()} – {new Date(a.week_end).toLocaleDateString()} ({a.status ?? ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? "Generating…" : "Generate statement"}
                </Button>
              </>
            )}

            {statementType === "fund" && (
              <>
                <div className="space-y-2">
                  <Label>Fund</Label>
                  <Select value={fundId} onValueChange={setFundId} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fund" />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From date (optional)</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>To date (optional)</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? "Generating…" : "Generate statement"}
                </Button>
              </>
            )}

            {statementType === "member" && (
              <>
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select value={memberId} onValueChange={setMemberId} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.first_name} {m.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From date (optional)</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>To date (optional)</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? "Generating…" : "Generate statement"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="mt-6 print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 print:block">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {summary.title}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              <span><strong>Total (GHS):</strong> {summary.total.toFixed(2)}</span>
              <span className="text-blue-700"><strong>Conference (GHS):</strong> {summary.conference.toFixed(2)}</span>
              <span className="text-amber-700"><strong>District (GHS):</strong> {summary.district.toFixed(2)}</span>
              <span className="text-green-700"><strong>Local (GHS):</strong> {summary.local.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Contribution splits and totals are reported in GHS. Original entry currency is shown per row.</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Fund</TableHead>
                    {statementType !== "fund" && <TableHead>Member</TableHead>}
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Conference</TableHead>
                    <TableHead className="text-right">District</TableHead>
                    <TableHead className="text-right">Local</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.service_date).toLocaleDateString()}</TableCell>
                      <TableCell>{(r.funds as any)?.name ?? "—"}</TableCell>
                      {statementType !== "fund" && (
                        <TableCell>
                          {r.members
                            ? `${(r.members as any).first_name} ${(r.members as any).last_name}`
                            : "—"}
                        </TableCell>
                      )}
                      <TableCell>{r.currency_code || "GHS"}</TableCell>
                      <TableCell className="text-right font-mono">{Number(r.amount_original ?? r.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{Number(r.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-blue-700">{Number(r.conference_portion || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-amber-700">{Number(r.district_portion || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-green-700">{Number(r.local_portion || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length === 0 && (
              <p className="text-muted-foreground text-center py-6">No contributions in this period.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Statements;
