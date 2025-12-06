import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, FileText, TrendingUp, AlertTriangle, Bell, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  category: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalInvoices: 0,
    lowStock: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    const [invoicesRes, productsRes] = await Promise.all([
      supabase.from("invoices").select("total").eq("user_id", user!.id),
      supabase.from("products").select("id, name, stock, category").eq("user_id", user!.id),
    ]);

    const products = productsRes.data || [];
    const totalSales = invoicesRes.data?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
    const totalProducts = products.length;
    const totalInvoices = invoicesRes.data?.length || 0;
    const lowStockItems = products.filter((p) => (p.stock || 0) < 10);

    setStats({ totalSales, totalProducts, totalInvoices, lowStock: lowStockItems.length });
    setLowStockProducts(lowStockItems.sort((a, b) => (a.stock || 0) - (b.stock || 0)));
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
      alert: stats.lowStock > 0,
    },
  ];

  const getStockSeverity = (stock: number) => {
    if (stock === 0) return "destructive";
    if (stock < 5) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to PURE TRUST POS</p>
      </div>

      {/* Low Stock Alerts */}
      {showAlerts && lowStockProducts.length > 0 && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Low Stock Alert
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowAlerts(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="mt-3">
            <p className="mb-3 text-sm">
              {lowStockProducts.length} product{lowStockProducts.length > 1 ? "s" : ""} running low on stock:
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <Badge
                  key={product.id}
                  variant={getStockSeverity(product.stock || 0)}
                  className={
                    product.stock === 0
                      ? "bg-destructive/20 text-destructive border-destructive/30"
                      : product.stock < 5
                      ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                      : ""
                  }
                >
                  {product.name}: {product.stock || 0} left
                </Badge>
              ))}
              {lowStockProducts.length > 5 && (
                <Badge variant="outline">+{lowStockProducts.length - 5} more</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/products")}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Manage Products
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.title}
            className={card.alert ? "border-amber-500/50 bg-amber-500/5" : ""}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon
                className={`h-4 w-4 ${card.alert ? "text-amber-500" : "text-muted-foreground"}`}
              />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.alert ? "text-amber-500" : ""}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Table */}
      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Products Needing Restock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <Badge
                    variant={getStockSeverity(product.stock || 0)}
                    className={
                      product.stock === 0
                        ? "bg-destructive text-destructive-foreground"
                        : product.stock < 5
                        ? "bg-amber-500 text-white"
                        : "bg-amber-500/20 text-amber-600"
                    }
                  >
                    {product.stock === 0 ? "OUT OF STOCK" : `${product.stock} left`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
