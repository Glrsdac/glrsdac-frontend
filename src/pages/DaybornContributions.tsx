import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface DayBornSummary {
  weekday: string;
  day_number: number;
  member_count: number;
  total_amount: number;
  contribution_count: number;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  dob?: string;
  weekday?: string;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DaybornContributions = () => {
  const { toast } = useToast();
  const [summaryData, setSummaryData] = useState<DayBornSummary[]>([]);
  const [weekdayMembers, setWeekdayMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeekday, setSelectedWeekday] = useState<string>("Sunday");
  const [openDialog, setOpenDialog] = useState(false);
  const [newRecord, setNewRecord] = useState({
    member_id: "",
    amount: "",
    fund_id: "1",
  });

  useEffect(() => {
    loadDaybornData();
  }, [selectedWeekday]);

  const loadDaybornData = async () => {
    setLoading(true);
    try {
      // Fetch all members with DOB
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select("*")
        .not("dob", "is", null);

      if (membersError) throw membersError;

      // Group members and contributions by birth weekday
      const groupedByWeekday: { [key: string]: DayBornSummary } = {};

      for (let i = 0; i < 7; i++) {
        groupedByWeekday[WEEKDAYS[i]] = {
          weekday: WEEKDAYS[i],
          day_number: i,
          member_count: 0,
          total_amount: 0,
          contribution_count: 0,
        };
      }

      // Build members list with weekday
      const membersWithWeekday = members.map((member) => {
        const date = new Date(member.dob!);
        const weekday = WEEKDAYS[date.getDay()];
        return { ...member, weekday };
      });

      // Count members by weekday
      membersWithWeekday.forEach((member) => {
        if (member.weekday) {
          groupedByWeekday[member.weekday].member_count++;
        }
      });

      // Fetch contributions
      const { data: contributions, error: contribError } = await supabase
        .from("contributions")
        .select("member_id, amount");

      if (contribError) throw contribError;

      // Calculate contributions by weekday
      contributions.forEach((contrib) => {
        const member = membersWithWeekday.find((m) => m.id === contrib.member_id);
        if (member && member.weekday) {
          groupedByWeekday[member.weekday].total_amount += contrib.amount;
          groupedByWeekday[member.weekday].contribution_count++;
        }
      });

      const summary = Object.values(groupedByWeekday).sort(
        (a, b) => a.day_number - b.day_number
      );
      setSummaryData(summary);

      // Get members for selected weekday
      const selected = membersWithWeekday.filter(
        (m) => m.weekday === selectedWeekday
      );
      setWeekdayMembers(selected);
    } catch (error) {
      console.error("Error loading dayborn data:", error);
      toast({
        title: "Error",
        description: "Failed to load dayborn data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordContribution = async () => {
    if (!newRecord.member_id || !newRecord.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current sabbath session or create one if needed
      const today = new Date();
      const { data: sessions, error: sesError } = await supabase
        .from("sabbath_sessions")
        .select("id")
        .gte("session_date", format(today, "yyyy-MM-dd"))
        .lte("session_date", format(today, "yyyy-MM-dd"))
        .limit(1);

      if (sesError && sesError.code !== "PGRST116") throw sesError;

      let sessionId = sessions?.[0]?.id;

      const { error } = await supabase.from("contributions").insert([
        {
          member_id: newRecord.member_id,
          amount: parseFloat(newRecord.amount),
          fund_id: parseInt(newRecord.fund_id),
          service_date: format(today, "yyyy-MM-dd"),
          sabbath_account_id: sessionId || 1,
          payment_method: "CASH",
        },
      ] as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contribution recorded successfully",
      });

      setNewRecord({
        member_id: "",
        amount: "",
        fund_id: "1",
      });
      setOpenDialog(false);
      await loadDaybornData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record contribution",
        variant: "destructive",
      });
    }
  };

  const totalContributions = summaryData.reduce((sum, d) => sum + d.total_amount, 0);
  const totalMembers = summaryData.reduce((sum, d) => sum + d.member_count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Day Born Contributions"
        description="Track contributions by member birth weekday"
      />

      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Summary by Weekday</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Members</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalMembers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Contributions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  GHS {totalContributions.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Average per Member</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  GHS {(totalContributions / (totalMembers || 1)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Contributions by Birth Weekday
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Weekday</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Contributions</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.map((row) => (
                      <TableRow key={row.weekday}>
                        <TableCell className="font-medium">{row.weekday}</TableCell>
                        <TableCell className="text-right">{row.member_count}</TableCell>
                        <TableCell className="text-right">{row.contribution_count}</TableCell>
                        <TableCell className="text-right">
                          GHS {row.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          GHS {(row.total_amount / (row.contribution_count || 1)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{selectedWeekday} Members</h3>
              <p className="text-sm text-muted-foreground">
                {weekdayMembers.length} members born on {selectedWeekday}
              </p>
            </div>
            <Select value={selectedWeekday} onValueChange={setSelectedWeekday}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekdayMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No members found for this weekday
                    </TableCell>
                  </TableRow>
                ) : (
                  weekdayMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell>
                        {member.dob ? format(new Date(member.dob), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setNewRecord({ ...newRecord, member_id: String(member.id) })
                              }
                            >
                              Record
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Record Contribution</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Member</Label>
                                <Input
                                  disabled
                                  value={`${newRecord.member_id ? weekdayMembers.find(m => String(m.id) === newRecord.member_id)?.first_name || '' : ''} ${newRecord.member_id ? weekdayMembers.find(m => String(m.id) === newRecord.member_id)?.last_name || '' : ''}`}
                                />
                              </div>
                              <div>
                                <Label>Fund</Label>
                                <Select value={newRecord.fund_id} onValueChange={(value) =>
                                  setNewRecord({ ...newRecord, fund_id: value })
                                }>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">Tithe</SelectItem>
                                    <SelectItem value="2">First Fruit</SelectItem>
                                    <SelectItem value="3">Offering</SelectItem>
                                    <SelectItem value="4">Building Fund</SelectItem>
                                    <SelectItem value="5">Outreach</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Amount (GHS)</Label>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  step="0.01"
                                  value={newRecord.amount}
                                  onChange={(e) =>
                                    setNewRecord({ ...newRecord, amount: e.target.value })
                                  }
                                />
                              </div>
                              <Button onClick={handleRecordContribution} className="w-full">
                                Record Contribution
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
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

export default DaybornContributions;
