import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type MonthlyData = { month: string; total: number };
type FundData = { name: string; total: number };
type MethodData = { method: string; total: number };

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210 60% 50%)",
  "hsl(340 65% 55%)",
  "hsl(160 50% 45%)",
];

const formatCurrency = (v: number) => `GH₵${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function ContributionCharts() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [fundData, setFundData] = useState<FundData[]>([]);
  const [methodData, setMethodData] = useState<MethodData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from("contributions")
        .select("amount, service_date, fund_id, payment_method, funds(name)")
        .order("service_date", { ascending: true }) as { data: any[] | null };

      if (!rows || rows.length === 0) {
        setMonthlyData([]);
        setFundData([]);
        setMethodData([]);
        return;
      }

      // Monthly trend
      const monthMap = new Map<string, number>();
      const fundMap = new Map<string, number>();
      const methodMap = new Map<string, number>();

      for (const r of rows) {
        const amt = Number(r.amount || 0);
        // Month
        const d = r.service_date ? r.service_date.slice(0, 7) : "Unknown";
        monthMap.set(d, (monthMap.get(d) || 0) + amt);
        // Fund
        const fundName = (r.funds as any)?.name || "Other";
        fundMap.set(fundName, (fundMap.get(fundName) || 0) + amt);
        // Method
        const method = r.payment_method || "Unknown";
        methodMap.set(method, (methodMap.get(method) || 0) + amt);
      }

      setMonthlyData(
        Array.from(monthMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([month, total]) => ({
            month: new Date(month + "-01").toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
            total,
          }))
      );

      setFundData(
        Array.from(fundMap.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8)
          .map(([name, total]) => ({ name, total }))
      );

      setMethodData(
        Array.from(methodMap.entries())
          .map(([method, total]) => ({ method: method.replace("_", " "), total }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className={i === 1 ? "lg:col-span-2" : ""}>
            <CardHeader><CardTitle className="font-heading text-lg">Loading…</CardTitle></CardHeader>
            <CardContent><div className="h-64 animate-pulse rounded bg-muted/50" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (monthlyData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Monthly Trend - full width */}
      <Card className="lg:col-span-2 border-primary/10">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Monthly Contribution Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), "Total"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Funds bar chart */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Top Funds</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={fundData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip formatter={(v: number) => [formatCurrency(v), "Total"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {fundData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Payment method pie */}
      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="font-heading text-lg">By Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={methodData} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3} label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}>
                {methodData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [formatCurrency(v), "Total"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
