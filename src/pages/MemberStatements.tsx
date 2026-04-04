import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { FileDown, Printer, Receipt } from "lucide-react";
import { LoadingState, EmptyState } from "@/components/LoadingState";

type DurationPreset = "1m" | "3m" | "6m" | "12m" | "custom";

type StatementRow = {
  id: string;
  amount: number;
  service_date: string;
  payment_method: string | null;
  funds: { name: string } | null;
};

type DuesSummary = {
  totalDue: number;
  totalPaid: number;
  totalOutstanding: number;
};

const formatCurrency = (amount: number) => `GH₵ ${Number(amount || 0).toFixed(2)}`;

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getPresetStartDate = (preset: Exclude<DurationPreset, "custom">) => {
  const now = new Date();
  const start = new Date(now);

  if (preset === "1m") start.setMonth(now.getMonth() - 1);
  if (preset === "3m") start.setMonth(now.getMonth() - 3);
  if (preset === "6m") start.setMonth(now.getMonth() - 6);
  if (preset === "12m") start.setMonth(now.getMonth() - 12);

  return toIsoDate(start);
};

export default function MemberStatements() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [featureUnavailable, setFeatureUnavailable] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [duesSummary, setDuesSummary] = useState<DuesSummary>({
    totalDue: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });

  const [duration, setDuration] = useState<DurationPreset>("3m");
  const [dateFrom, setDateFrom] = useState(getPresetStartDate("3m"));
  const [dateTo, setDateTo] = useState(toIsoDate(new Date()));

  useEffect(() => {
    if (duration === "custom") return;
    setDateFrom(getPresetStartDate(duration));
    setDateTo(toIsoDate(new Date()));
  }, [duration]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get member info
        const { data: member, error: memberError } = await supabase
          .from("members")
          .select("id, first_name, last_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (!member) {
          setRows([]);
          setMemberName("");
          setDuesSummary({ totalDue: 0, totalPaid: 0, totalOutstanding: 0 });
          setLoading(false);
          return;
        }

        setMemberName(`${member.first_name ?? ""} ${member.last_name ?? ""}`.trim());

        // Load contributions
        const { data: contributionData, error: contributionError } = await supabase
          .from("contributions")
          .select("id, amount, service_date, payment_method, funds(name)")
          .eq("member_id", member.id)
          .order("service_date", { ascending: false });

        if (contributionError) throw contributionError;

        setRows((contributionData as unknown as StatementRow[] | null) ?? []);

        // Load dues data
        const { data: duesData, error: duesError } = await supabase
          .from("department_dues" as any)
          .select("due_amount, paid_amount, departments(dues_enabled)")
          .eq("member_id", member.id);

        if (duesError) {
          console.warn("Department dues table not available:", duesError.message);
          setFeatureUnavailable(true);
          setDuesSummary({ totalDue: 0, totalPaid: 0, totalOutstanding: 0 });
          setLoading(false);
          return;
        }

        // Process dues data
        const normalizedDues = ((duesData ?? []) as any[])
          .filter((row) => row.departments?.dues_enabled !== false)
          .map((row) => {
            const dueAmount = Number(row.due_amount || 0);
            const paidAmount = Number(row.paid_amount || 0);
            return {
              due_amount: dueAmount,
              paid_amount: paidAmount,
              outstanding: dueAmount - paidAmount,
            };
          });

        setDuesSummary({
          totalDue: normalizedDues.reduce((sum: number, row: any) => sum + Number(row.due_amount || 0), 0),
          totalPaid: normalizedDues.reduce((sum: number, row: any) => sum + Number(row.paid_amount || 0), 0),
          totalOutstanding: normalizedDues.reduce((sum: number, row: any) => sum + Number(row.outstanding || 0), 0),
        });

        setFeatureUnavailable(false);
      } catch (error: any) {
        toast({
          title: "Unable to load statement data",
          description: error?.message || String(error),
          variant: "destructive",
        });
        setFeatureUnavailable(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast, user?.id]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (dateFrom && row.service_date < dateFrom) return false;
      if (dateTo && row.service_date > dateTo) return false;
      return true;
    });
  }, [dateFrom, dateTo, rows]);

  const contributionTotal = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [filteredRows]
  );

  const statementTitle = `Member Statement (${dateFrom || "-"} to ${dateTo || "-"})`;

  const buildPrintableHtml = () => {
    const rowHtml = filteredRows
      .map(
        (row) => `
          <tr>
            <td>${formatDate(row.service_date)}</td>
            <td>${row.funds?.name || "-"}</td>
            <td>${row.payment_method || "-"}</td>
            <td style="text-align:right;">${formatCurrency(row.amount)}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>${statementTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
          h1 { margin-bottom: 4px; }
          .muted { color: #6B7280; margin-bottom: 16px; }
          .summary { margin: 16px 0; }
          .summary div { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 13px; }
          th { background: #F9FAFB; text-align: left; }
        </style>
      </head>
      <body>
        <h1>${memberName || "Member"} - Statement</h1>
        <div class="muted">Period: ${dateFrom || "-"} to ${dateTo || "-"}</div>

        <div class="summary">
          <div><strong>Total Contributions:</strong> ${formatCurrency(contributionTotal)}</div>
          <div><strong>Total Dues Paid:</strong> ${formatCurrency(duesSummary.totalPaid)}</div>
          <div><strong>Total Dues Outstanding:</strong> ${formatCurrency(duesSummary.totalOutstanding)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Fund</th>
              <th>Method</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowHtml || '<tr><td colspan="4" style="text-align:center;">No records for selected duration.</td></tr>'}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) {
      toast({
        title: "Popup blocked",
        description: "Allow popups to print or download the statement.",
        variant: "destructive",
      });
      return;
    }

    popup.document.write(buildPrintableHtml());
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div>
      <PageHeader
        title="My Statements"
        description="Choose a duration and download your contribution and dues statement as PDF."
      />

      {featureUnavailable && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Note:</strong> Department dues information is currently unavailable. Only contribution data is shown.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statement Options</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={(value) => setDuration(value as DurationPreset)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">Last 1 Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="12m">Last 12 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDuration("custom");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDuration("custom");
                }}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handlePrint} className="w-full" disabled={loading}>
                <FileDown className="h-4 w-4 mr-2" />
                Download Statement (PDF)
              </Button>
              <Button variant="outline" onClick={handlePrint} disabled={loading}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Member</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{memberName || "No linked member profile"}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contributions</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(contributionTotal)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dues Paid</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(duesSummary.totalPaid)}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outstanding Dues</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(duesSummary.totalOutstanding)}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statement Entries ({filteredRows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState message="Loading statement data..." />
            ) : filteredRows.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-10 w-10" />}
                title="No contributions found"
                description="No contributions found in selected duration."
              />
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.service_date)}</TableCell>
                        <TableCell className="font-medium">{row.funds?.name || "-"}</TableCell>
                        <TableCell>{row.payment_method || "-"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
