import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Receipt, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { format, startOfYear, endOfYear, getQuarter, getMonth } from 'date-fns';

interface TaxData {
  month: string;
  monthNum: number;
  tax: number;
  sales: number;
  invoiceCount: number;
}

interface QuarterlyData {
  quarter: string;
  tax: number;
  sales: number;
  invoiceCount: number;
}

const QUARTER_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const TaxTracking = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [monthlyData, setMonthlyData] = useState<TaxData[]>([]);
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ tax: 0, sales: 0, invoices: 0 });

  useEffect(() => {
    if (user) {
      fetchAvailableYears();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedYear) {
      fetchTaxData();
    }
  }, [user, selectedYear]);

  const fetchAvailableYears = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('created_at')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const years = [...new Set(data.map(inv => new Date(inv.created_at).getFullYear().toString()))];
      setAvailableYears(years);
      if (!years.includes(selectedYear)) {
        setSelectedYear(years[years.length - 1]);
      }
    } else {
      setAvailableYears([new Date().getFullYear().toString()]);
    }
  };

  const fetchTaxData = async () => {
    setLoading(true);
    const yearNum = parseInt(selectedYear);
    const yearStart = startOfYear(new Date(yearNum, 0, 1));
    const yearEnd = endOfYear(new Date(yearNum, 0, 1));

    const { data } = await supabase
      .from('invoices')
      .select('tax, total, subtotal, created_at')
      .eq('user_id', user?.id)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', yearEnd.toISOString());

    if (data) {
      // Process monthly data
      const monthlyMap = new Map<number, { tax: number; sales: number; count: number }>();
      
      for (let i = 0; i < 12; i++) {
        monthlyMap.set(i, { tax: 0, sales: 0, count: 0 });
      }

      let totalTax = 0;
      let totalSales = 0;

      data.forEach(invoice => {
        const month = getMonth(new Date(invoice.created_at));
        const current = monthlyMap.get(month)!;
        current.tax += Number(invoice.tax) || 0;
        current.sales += Number(invoice.total) || 0;
        current.count += 1;
        totalTax += Number(invoice.tax) || 0;
        totalSales += Number(invoice.total) || 0;
      });

      const monthly: TaxData[] = Array.from(monthlyMap.entries()).map(([month, values]) => ({
        month: format(new Date(yearNum, month, 1), 'MMM'),
        monthNum: month,
        tax: values.tax,
        sales: values.sales,
        invoiceCount: values.count
      }));

      setMonthlyData(monthly);

      // Process quarterly data
      const quarterlyMap = new Map<number, { tax: number; sales: number; count: number }>();
      for (let i = 1; i <= 4; i++) {
        quarterlyMap.set(i, { tax: 0, sales: 0, count: 0 });
      }

      data.forEach(invoice => {
        const quarter = getQuarter(new Date(invoice.created_at));
        const current = quarterlyMap.get(quarter)!;
        current.tax += Number(invoice.tax) || 0;
        current.sales += Number(invoice.total) || 0;
        current.count += 1;
      });

      const quarterly: QuarterlyData[] = Array.from(quarterlyMap.entries()).map(([q, values]) => ({
        quarter: `Q${q}`,
        tax: values.tax,
        sales: values.sales,
        invoiceCount: values.count
      }));

      setQuarterlyData(quarterly);
      setTotals({ tax: totalTax, sales: totalSales, invoices: data.length });
    }

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const taxRate = totals.sales > 0 ? ((totals.tax / (totals.sales - totals.tax)) * 100).toFixed(2) : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Tracking</h1>
          <p className="text-muted-foreground">Annual tax collection summary and breakdown</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tax Collected</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.tax)}</div>
            <p className="text-xs text-muted-foreground">For year {selectedYear}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.sales)}</div>
            <p className="text-xs text-muted-foreground">Gross revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Effective Tax Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxRate}%</div>
            <p className="text-xs text-muted-foreground">Average rate applied</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.invoices}</div>
            <p className="text-xs text-muted-foreground">Transactions recorded</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Breakdown</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Tax Collection</CardTitle>
                <CardDescription>Tax collected each month in {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Tax']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="tax" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Details</CardTitle>
                <CardDescription>Detailed breakdown by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Invoices</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.sales)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.tax)}</TableCell>
                          <TableCell className="text-right">{row.invoiceCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quarterly" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quarterly Tax Distribution</CardTitle>
                <CardDescription>Tax collected by quarter in {selectedYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={quarterlyData.filter(q => q.tax > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ quarter, percent }) => `${quarter} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="tax"
                      >
                        {quarterlyData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={QUARTER_COLORS[index % QUARTER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Tax']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quarterly Summary</CardTitle>
                <CardDescription>Performance by quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quarterlyData.map((q, index) => (
                    <div key={q.quarter} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: QUARTER_COLORS[index] }}
                        />
                        <div>
                          <p className="font-medium">{q.quarter}</p>
                          <p className="text-sm text-muted-foreground">{q.invoiceCount} invoices</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(q.tax)}</p>
                        <p className="text-sm text-muted-foreground">of {formatCurrency(q.sales)} sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaxTracking;
