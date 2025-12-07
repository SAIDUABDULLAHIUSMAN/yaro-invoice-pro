import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, eachDayOfInterval, eachWeekOfInterval } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface SalesData {
  date: string;
  total: number;
  count: number;
}

const Analysis = () => {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<SalesData[]>([]);
  const [monthlyData, setMonthlyData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    thisWeekTotal: 0,
    lastWeekTotal: 0,
    thisMonthTotal: 0,
    lastMonthTotal: 0,
  });

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const now = new Date();
    
    // Get data for the last 4 weeks
    const fourWeeksAgo = subWeeks(now, 4);
    const { data: recentInvoices } = await supabase
      .from("invoices")
      .select("created_at, total")
      .eq("user_id", user!.id)
      .gte("created_at", fourWeeksAgo.toISOString())
      .order("created_at", { ascending: true });

    // Get data for the last 6 months
    const sixMonthsAgo = subMonths(now, 6);
    const { data: monthlyInvoices } = await supabase
      .from("invoices")
      .select("created_at, total")
      .eq("user_id", user!.id)
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    if (recentInvoices) {
      // Process weekly data (daily breakdown for current week)
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      const dailyData = days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayInvoices = recentInvoices.filter(inv => 
          format(new Date(inv.created_at), "yyyy-MM-dd") === dayStr
        );
        return {
          date: format(day, "EEE"),
          total: dayInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
          count: dayInvoices.length,
        };
      });
      setWeeklyData(dailyData);

      // Calculate this week vs last week
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subWeeks(thisWeekStart, 1);
      const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

      const thisWeekTotal = recentInvoices
        .filter(inv => new Date(inv.created_at) >= thisWeekStart)
        .reduce((sum, inv) => sum + Number(inv.total), 0);

      const lastWeekTotal = recentInvoices
        .filter(inv => {
          const date = new Date(inv.created_at);
          return date >= lastWeekStart && date <= lastWeekEnd;
        })
        .reduce((sum, inv) => sum + Number(inv.total), 0);

      setStats(prev => ({ ...prev, thisWeekTotal, lastWeekTotal }));
    }

    if (monthlyInvoices) {
      // Process monthly data (weekly breakdown)
      const weeks = eachWeekOfInterval({ 
        start: subMonths(now, 3), 
        end: now 
      }, { weekStartsOn: 1 });

      const weeklyAggregated = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekInvoices = monthlyInvoices.filter(inv => {
          const date = new Date(inv.created_at);
          return date >= weekStart && date <= weekEnd;
        });
        return {
          date: format(weekStart, "MMM d"),
          total: weekInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
          count: weekInvoices.length,
        };
      });
      setMonthlyData(weeklyAggregated);

      // Calculate this month vs last month
      const thisMonthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      const thisMonthTotal = monthlyInvoices
        .filter(inv => new Date(inv.created_at) >= thisMonthStart)
        .reduce((sum, inv) => sum + Number(inv.total), 0);

      const lastMonthTotal = monthlyInvoices
        .filter(inv => {
          const date = new Date(inv.created_at);
          return date >= lastMonthStart && date <= lastMonthEnd;
        })
        .reduce((sum, inv) => sum + Number(inv.total), 0);

      setStats(prev => ({ ...prev, thisMonthTotal, lastMonthTotal }));
    }

    setLoading(false);
  };

  const weeklyChange = stats.lastWeekTotal > 0 
    ? ((stats.thisWeekTotal - stats.lastWeekTotal) / stats.lastWeekTotal * 100).toFixed(1)
    : stats.thisWeekTotal > 0 ? "100" : "0";

  const monthlyChange = stats.lastMonthTotal > 0 
    ? ((stats.thisMonthTotal - stats.lastMonthTotal) / stats.lastMonthTotal * 100).toFixed(1)
    : stats.thisMonthTotal > 0 ? "100" : "0";

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sales Analysis</h1>
        <p className="text-muted-foreground">Track your sales performance trends</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisWeekTotal)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {Number(weeklyChange) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={Number(weeklyChange) >= 0 ? "text-green-500" : "text-red-500"}>
                {weeklyChange}%
              </span>
              vs last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Week</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.lastWeekTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Previous week total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.thisMonthTotal)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {Number(monthlyChange) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={Number(monthlyChange) >= 0 ? "text-green-500" : "text-red-500"}>
                {monthlyChange}%
              </span>
              vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.lastMonthTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Previous month total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly">Weekly Trend</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>This Week's Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Sales"]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>3-Month Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} className="text-xs" />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Sales"]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analysis;
