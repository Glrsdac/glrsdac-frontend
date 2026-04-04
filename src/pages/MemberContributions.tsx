import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/LoadingState";
import { Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type SortField = "date" | "amount" | "fund" | "method";
type SortDirection = "asc" | "desc";

type MemberContribution = {
  id: string;
  amount: number;
  service_date: string;
  payment_method: string | null;
  funds: { name: string } | null;
  sabbath_accounts: {
    week_start: string;
    week_end: string;
  } | null;
};

const formatCurrency = (amount: number) => `GH₵ ${Number(amount || 0).toFixed(2)}`;

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export default function MemberContributions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [memberName, setMemberName] = useState<string>("");
  const [rows, setRows] = useState<MemberContribution[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: member, error: memberError } = await supabase
          .from("members")
          .select("id, first_name, last_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (!member) {
          setRows([]);
          setMemberName("");
          return;
        }

        setMemberName(`${member.first_name ?? ""} ${member.last_name ?? ""}`.trim());

        const { data, error } = await supabase
          .from("contributions")
          .select("id, amount, service_date, payment_method, funds(name), sabbath_accounts(week_start, week_end)")
.eq("member_id", String(member.id))
          .order("service_date", { ascending: false });

        if (error) throw error;

        setRows((data as unknown as MemberContribution[] | null) ?? []);
      } catch (error: any) {
        toast({
          title: "Unable to load contributions",
          description: error?.message || String(error),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast, user?.id]);

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (dateFrom && row.service_date < dateFrom) return false;
      if (dateTo && row.service_date > dateTo) return false;
      return true;
    });

    return [...filtered].sort((left, right) => {
      let result = 0;

      if (sortField === "amount") {
        result = Number(left.amount || 0) - Number(right.amount || 0);
      } else if (sortField === "fund") {
        result = (left.funds?.name || "").localeCompare(right.funds?.name || "");
      } else if (sortField === "method") {
        result = (left.payment_method || "").localeCompare(right.payment_method || "");
      } else {
        const leftDate = left.service_date ? new Date(left.service_date).getTime() : 0;
        const rightDate = right.service_date ? new Date(right.service_date).getTime() : 0;
        result = leftDate - rightDate;
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [dateFrom, dateTo, rows, sortDirection, sortField]);

  const totals = useMemo(() => {
    const amount = filteredRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return { count: filteredRows.length, amount };
  }, [filteredRows]);

  return (
    <div>
      <PageHeader
        title="My Contributions"
        description="View your contributions with sorting and date filters."
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Member</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {memberName || "No linked member profile"}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Records</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{totals.count}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Amount</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(totals.amount)}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters & Sorting</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="space-y-2">
              <Label className="text-[11px] sm:text-xs">From Date</Label>
              <Input className="h-9 px-2 text-[11px] sm:text-sm" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] sm:text-xs">To Date</Label>
              <Input className="h-9 px-2 text-[11px] sm:text-sm" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] sm:text-xs">Sort Field</Label>
              <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                <SelectTrigger className="h-9 px-2 text-[11px] sm:text-sm">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="fund">Fund</SelectItem>
                  <SelectItem value="method">Method</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] sm:text-xs">Direction</Label>
              <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                <SelectTrigger className="h-9 px-2 text-[11px] sm:text-sm">
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contribution History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState message="Loading contribution history..." />
            ) : filteredRows.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-10 w-10" />}
                title="No contributions found"
                description="No contribution records found for the selected filters."
              />
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.service_date)}</TableCell>
                        <TableCell className="font-medium">{row.funds?.name || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.sabbath_accounts
                            ? `${formatDate(row.sabbath_accounts.week_start)} - ${formatDate(row.sabbath_accounts.week_end)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.payment_method || "-"}</Badge>
                        </TableCell>
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
