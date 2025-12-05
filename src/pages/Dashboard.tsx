import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Package, FileText, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalInvoices: 0,
    lowStock: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    const [invoicesRes, productsRes] = await Promise.all([
      supabase.from("invoices").select("total").eq("user_id", user!.id),
      supabase.from("products").select("id, stock").eq("user_id", user!.id),
    ]);

    const totalSales = invoicesRes.data?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
    const totalProducts = productsRes.data?.length || 0;
    const totalInvoices = invoicesRes.data?.length || 0;
    const lowStock = productsRes.data?.filter((p) => p.stock < 10).length || 0;

    setStats({ totalSales, totalProducts, totalInvoices, lowStock });
  };

  const cards = [
    {
      title: "Total Sales",
      value: `₦${stats.totalSales.toLocaleString()}`,
      icon: TrendingUp,
      description: "All time revenue",
    },
    {
      title: "Total Invoices",
      value: stats.totalInvoices,
      icon: FileText,
      description: "Invoices generated",
    },
    {
      title: "Products",
      value: stats.totalProducts,
      icon: Package,
      description: "In catalog",
    },
    {
      title: "Low Stock",
      value: stats.lowStock,
      icon: ShoppingCart,
      description: "Items below 10 units",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to PURE TRUST POS</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
