import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3,
  Users,
  DollarSign,
  Crown,
  Building2,
  TrendingUp,
  Calendar,
  RefreshCw
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

type ChurchAnalytics = {
  church_id: string;
  church_name: string;
  organization_name?: string;
  organization_type?: string;
  member_count: number;
  active_members: number;
  leaders_count: number;
  total_contributions: number;
  latest_member_join?: string;
};

type GlobalStats = {
  total_churches: number;
  total_members: number;
  total_active_members: number;
  total_leaders: number;
  total_contributions: number;
  avg_members_per_church: number;
  top_contributing_church: string;
  newest_church: string;
};

const GlobalAnalytics = () => {
  const [analytics, setAnalytics] = useState<ChurchAnalytics[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("church_analytics")
        .select("*")
        .order("total_contributions", { ascending: false });

      if (error) {
        console.error("Error fetching analytics:", error);
        toast({
          title: "Error loading analytics",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setAnalytics(data || []);

        // Calculate global stats
        const stats: GlobalStats = {
          total_churches: data?.length || 0,
          total_members: data?.reduce((sum, church) => sum + church.member_count, 0) || 0,
          total_active_members: data?.reduce((sum, church) => sum + church.active_members, 0) || 0,
          total_leaders: data?.reduce((sum, church) => sum + church.leaders_count, 0) || 0,
          total_contributions: data?.reduce((sum, church) => sum + Number(church.total_contributions), 0) || 0,
          avg_members_per_church: 0,
          top_contributing_church: "",
          newest_church: ""
        };

        if (data && data.length > 0) {
          stats.avg_members_per_church = Math.round(stats.total_members / stats.total_churches);
          stats.top_contributing_church = data[0].church_name;

          // Find newest church
          const sortedByNewest = data
            .filter(church => church.latest_member_join)
            .sort((a, b) => new Date(b.latest_member_join!).getTime() - new Date(a.latest_member_join!).getTime());
          stats.newest_church = sortedByNewest[0]?.church_name || "N/A";
        }

        setGlobalStats(stats);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Global Analytics"
          description="Church performance metrics and insights"
        />
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Analytics"
        description="Comprehensive church performance metrics and insights"
        actions={
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-sm text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button onClick={fetchAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Global Statistics Cards */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Churches</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.total_churches}</div>
              <p className="text-xs text-muted-foreground">
                Active SDA churches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.total_members.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {globalStats.total_active_members.toLocaleString()} active members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Church Leaders</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.total_leaders.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Active leaders across churches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(globalStats.total_contributions)}</div>
              <p className="text-xs text-muted-foreground">
                Last 12 months
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key Insights */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Average Church Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{globalStats.avg_members_per_church}</div>
              <p className="text-xs text-muted-foreground">
                Members per church
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Top Contributor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold truncate">{globalStats.top_contributing_church}</div>
              <p className="text-xs text-muted-foreground">
                Highest contribution church
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Most Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold truncate">{globalStats.newest_church}</div>
              <p className="text-xs text-muted-foreground">
                Most recent member additions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Church Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Church Performance Metrics
          </CardTitle>
          <CardDescription>
            Detailed analytics for each church including membership, leadership, and financial data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.map((church, index) => {
              const memberUtilization = church.member_count > 0
                ? Math.round((church.active_members / church.member_count) * 100)
                : 0;

              return (
                <div key={church.church_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{church.church_name}</h3>
                        {church.organization_name && (
                          <p className="text-sm text-muted-foreground">
                            {church.organization_name} ({church.organization_type})
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">
                      Rank #{index + 1}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{church.member_count}</div>
                      <div className="text-xs text-muted-foreground">Total Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{church.active_members}</div>
                      <div className="text-xs text-muted-foreground">Active Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{church.leaders_count}</div>
                      <div className="text-xs text-muted-foreground">Church Leaders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{formatCurrency(church.total_contributions)}</div>
                      <div className="text-xs text-muted-foreground">Contributions</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Member Engagement</span>
                      <span>{memberUtilization}%</span>
                    </div>
                    <Progress value={memberUtilization} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {church.active_members} of {church.member_count} members are active
                    </div>
                  </div>

                  {church.latest_member_join && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Latest member joined: {formatDate(church.latest_member_join)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalAnalytics;