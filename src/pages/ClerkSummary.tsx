import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SummaryRow = {
  id: string;
  type: "contribution" | "expense";
  date: string;
  amount: number;
  title: string;
  fundName: string;
  currencyCode: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDate = (value: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const ClerkSummary = () => {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<"all" | "contribution" | "expense">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "title" | "type">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [contributionsRes, expensesRes] = await Promise.all([
        supabase
          .from("contributions")
          .select("id, amount, currency_code, service_date, created_at, funds(name), members(first_name, last_name)")
          .order("service_date", { ascending: false })
          .limit(200),
        supabase
          .from("imprest_expenses")
          .select("id, description, amount, expense_date, created_at, funds(name)")
          .order("expense_date", { ascending: false })
          .limit(200),
      ]);

      const contributionRows: SummaryRow[] = (contributionsRes.data ?? []).map((item: any) => {
        const memberName = item.members
          ? `${item.members.first_name ?? ""} ${item.members.last_name ?? ""}`.trim() || "Contribution"
          : "Contribution";

        return {
          id: `contribution-${item.id}`,
          type: "contribution",
          date: item.service_date || item.created_at || "",
          amount: Number(item.amount || 0),
          title: memberName,
          fundName: item.funds?.name || "-",
          currencyCode: item.currency_code || "GHS",
        };
      });

      const expenseRows: SummaryRow[] = (expensesRes.data ?? []).map((item: any) => ({
        id: `expense-${item.id}`,
        type: "expense",
        date: item.expense_date || item.created_at || "",
        amount: Number(item.amount || 0),
        title: item.description || "Expense",
        fundName: item.funds?.name || "-",
        currencyCode: "GHS",
      }));

      setRows([...contributionRows, ...expenseRows]);
      setLoading(false);
    };

    load();
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;

      if (dateFrom && row.date && row.date < dateFrom) return false;
      if (dateTo && row.date && row.date > dateTo) return false;

      if (!normalizedSearch) return true;

      const haystack = `${row.title} ${row.fundName} ${row.type}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    const sorted = [...filtered].sort((left, right) => {
      let comparison = 0;

      if (sortField === "amount") {
        comparison = left.amount - right.amount;
      } else if (sortField === "title") {
        comparison = left.title.localeCompare(right.title);
      } else if (sortField === "type") {
        comparison = left.type.localeCompare(right.type);
      } else {
        const leftDate = left.date ? new Date(left.date).getTime() : 0;
        const rightDate = right.date ? new Date(right.date).getTime() : 0;
        comparison = leftDate - rightDate;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [rows, typeFilter, search, dateFrom, dateTo, sortField, sortDirection]);

  const totals = useMemo(() => {
    const contributions = filteredRows
      .filter((row) => row.type === "contribution")
      .reduce((sum, row) => sum + row.amount, 0);

    const expenses = filteredRows
      .filter((row) => row.type === "expense")
      .reduce((sum, row) => sum + row.amount, 0);

    return {
      contributions,
      expenses,
      balance: contributions - expenses,
    };
  }, [filteredRows]);

  return (
    <div>
      <PageHeader
        title="Clerk Contributions & Expenses Summary"
        description="Review recent contribution and expense records with filters and sorting."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Total Contributions</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {currencyFormatter.format(totals.contributions)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {currencyFormatter.format(totals.expenses)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Net Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {currencyFormatter.format(totals.balance)}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Filters & Sorting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={(value: "all" | "contribution" | "expense") => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="contribution">Contributions</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, fund, or type"
              />
            </div>

            <div className="space-y-2">
              <Label>Sort Field</Label>
              <Select value={sortField} onValueChange={(value: "date" | "amount" | "title" | "type") => setSortField(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sort Direction</Label>
              <Select value={sortDirection} onValueChange={(value: "asc" | "desc") => setSortDirection(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Loading records...</TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No records found for the current filters.</TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.date)}</TableCell>
                    <TableCell className="capitalize">{row.type}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{row.fundName}</TableCell>
                    <TableCell className="text-right">{currencyFormatter.format(row.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClerkSummary;
