import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CalendarDays, TrendingUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface ReturnCalculation {
  fund_id: number;
  fund_name: string;
  total_contributions: number;
  local_amount: number;
  district_amount: number;
  conference_amount: number;
  local_pct: number;
  district_pct: number;
  conference_pct: number;
}

const AutomatedReturns = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [returns, setReturns] = useState<ReturnCalculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [isTreasurer, setIsTreasurer] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      loadMonthlyReturns();
    }
  }, [user, selectedMonth]);

  const fetchUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role_id,roles(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle() as { data: any; error: any };
    
    const roleName = data?.roles?.name || null;
    setUserRole(roleName);
    setIsTreasurer(roleName === "TREASURER" || roleName === "ADMIN");
  };

  const loadMonthlyReturns = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split("-");
      
      const { data, error } = await supabase
        .rpc("calculate_monthly_returns", {
          target_year: parseInt(year),
          target_month: parseInt(month),
        });

      if (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "Failed to load return calculations",
          variant: "destructive",
        });
        return;
      }

      setReturns(data || []);
    } catch (error) {
      console.error("Error loading returns:", error);
      toast({
        title: "Error",
        description: "Failed to load return calculations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const recordReturn = async (fundId: number, fundName: string, amount: number, recipient: "DISTRICT" | "CONFERENCE") => {
    try {
      const { error } = await supabase.from("fund_returns").insert([
        {
          return_date: format(new Date(), "yyyy-MM-dd"),
          recipient,
          fund_name: fundName,
          amount: amount,
          payment_method: "BANK_TRANSFER",
          description: `Automated ${recipient.toLowerCase()} return for ${fundName}`,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${recipient} return recorded for ${fundName}`,
      });

      loadMonthlyReturns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record return",
        variant: "destructive",
      });
    }
  };

  const totalContributions = returns.reduce((sum, r) => sum + r.total_contributions, 0);
  const totalDistrict = returns.reduce((sum, r) => sum + r.district_amount, 0);
  const totalConference = returns.reduce((sum, r) => sum + r.conference_amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Returns"
        description="Manage scheduled conference and district returns"
      />

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList>
          <TabsTrigger value="schedule">Monthly Schedule</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Monthly Return Calculation</CardTitle>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const months = [];
                      for (let i = 0; i < 12; i++) {
                        const d = new Date();
                        d.setMonth(d.getMonth() - i);
                        const value = format(d, "yyyy-MM");
                        months.push(
                          <SelectItem key={value} value={value}>
                            {format(d, "MMMM yyyy")}
                          </SelectItem>
                        );
                      }
                      return months;
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading calculations...</div>
              ) : returns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No contributions recorded for this month
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Total Contributions</p>
                        <p className="text-2xl font-bold">GHS {totalContributions.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">District Return</p>
                        <p className="text-2xl font-bold">GHS {totalDistrict.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Conference Return</p>
                        <p className="text-2xl font-bold">GHS {totalConference.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fund</TableHead>
                        <TableHead className="text-right">Contributions</TableHead>
                        <TableHead className="text-right">Local %</TableHead>
                        <TableHead className="text-right">District</TableHead>
                        <TableHead className="text-right">Conference</TableHead>
                        {isTreasurer && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returns.map((ret) => (
                        <TableRow key={ret.fund_id}>
                          <TableCell className="font-medium">{ret.fund_name}</TableCell>
                          <TableCell className="text-right">GHS {ret.total_contributions.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">{ret.local_pct.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">GHS {ret.district_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right">GHS {ret.conference_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                          {isTreasurer && (
                            <TableCell className="space-x-2">
                              {ret.district_amount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    recordReturn(ret.fund_id, ret.fund_name, ret.district_amount, "DISTRICT")
                                  }
                                >
                                  Record District
                                </Button>
                              )}
                              {ret.conference_amount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    recordReturn(ret.fund_id, ret.fund_name, ret.conference_amount, "CONFERENCE")
                                  }
                                >
                                  Record Conference
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Auto-Calculation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  System automatically calculates district and conference returns based on fund allocation percentages
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Monthly Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View monthly return calculations for any period and record returns to district or conference
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Full history of all recorded returns with timestamps and allocations for compliance
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Automatic Calculation</h4>
                <p className="text-sm text-muted-foreground">
                  The system calculates returns monthly by analyzing contributions and applying fund-specific allocation percentages (local, district, conference)
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Review Returns</h4>
                <p className="text-sm text-muted-foreground">
                  Treasurers can view calculated returns for any month and verify amounts before recording
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Record Transfers</h4>
                <p className="text-sm text-muted-foreground">
                  Once verified, record the actual return payment to district or conference with payment method and reference number
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4. Track History</h4>
                <p className="text-sm text-muted-foreground">
                  All recorded returns create an audit trail with full details for reconciliation and reporting
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomatedReturns;
