import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, Invoice } from "@/types/invoice";
import { Plus, Trash2, Receipt } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface InvoiceFormProps {
  onGenerateInvoice: (invoice: Invoice) => void;
}

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const InvoiceForm = ({ onGenerateInvoice }: InvoiceFormProps) => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState("PURE TRUST TPS");
  const [companyAddress, setCompanyAddress] = useState("Lagos, Nigeria");
  const [companyPhone, setCompanyPhone] = useState("+234 800 000 0000");
  const [customerName, setCustomerName] = useState("");
  const [issuerName, setIssuerName] = useState("");
  const [products, setProducts] = useState<Product[]>([
    { id: "1", name: "", price: 0, quantity: 1 },
  ]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setCatalogProducts(data);
      const uniqueCategories = [...new Set(data.map(p => p.category))];
      setCategories(uniqueCategories.length > 0 ? uniqueCategories : ["Other"]);
    }
  };

  const addProduct = () => {
    setProducts([
      ...products,
      { id: Date.now().toString(), name: "", price: 0, quantity: 1 },
    ]);
  };

  const removeProduct = (id: string) => {
    if (products.length > 1) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const handleProductSelect = (productId: string, catalogProductId: string) => {
    if (catalogProductId === "custom") {
      setProducts(
        products.map((p) =>
          p.id === productId
            ? { ...p, name: "Custom Product", price: 0 }
            : p
        )
      );
      return;
    }
    
    const catalogProduct = catalogProducts.find(p => p.id === catalogProductId);
    if (catalogProduct) {
      setProducts(
        products.map((p) =>
          p.id === productId
            ? { ...p, name: catalogProduct.name, price: catalogProduct.price }
            : p
        )
      );
    }
  };

  const updateQuantity = (id: string, quantity: number) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, quantity } : p))
    );
  };

  const updateCustomPrice = (id: string, price: number) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, price } : p))
    );
  };

  const calculateTotals = () => {
    const subtotal = products.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );
    const tax = subtotal * 0.075;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter customer name",
        variant: "destructive",
      });
      return;
    }

    if (!issuerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter issuer name",
        variant: "destructive",
      });
      return;
    }

    const validProducts = products.filter(
      (p) => p.name.trim() && p.price > 0 && p.quantity > 0
    );

    if (validProducts.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one valid product",
        variant: "destructive",
      });
      return;
    }

    const { subtotal, tax, total } = calculateTotals();

    const invoice: Invoice = {
      id: `INV-${Date.now().toString().slice(-8)}`,
      companyName,
      companyAddress,
      companyPhone,
      customerName,
      issuerName,
      products: validProducts,
      date: new Date(),
      subtotal,
      tax,
      total,
    };

    onGenerateInvoice(invoice);
    toast({
      title: "Invoice Generated",
      description: "Your POS receipt is ready to print",
    });
  };

  const { subtotal, tax, total } = calculateTotals();

  const isCustomProduct = (productName: string) => productName === "Custom Product";

  return (
    <Card className="border-border/50 shadow-lg">
      <CardHeader className="border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Receipt className="h-5 w-5 text-primary" />
          Create POS Invoice
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Address</Label>
              <Input
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Phone</Label>
              <Input
                id="companyPhone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="Phone"
              />
            </div>
          </div>

          {/* Customer & Issuer Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuerName">Invoice Issuer *</Label>
              <Input
                id="issuerName"
                value={issuerName}
                onChange={(e) => setIssuerName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Products</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProduct}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </div>

            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="grid gap-3 p-3 rounded-lg bg-muted/50 md:grid-cols-[1fr_100px_100px_40px]"
                >
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Select Product
                    </Label>
                    <Select
                      onValueChange={(value) => handleProductSelect(product.id, value)}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Choose a product">
                          {product.name || "Choose a product"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border shadow-lg z-50">
                        {catalogProducts.length === 0 ? (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                            No products yet. Add products in the Products page.
                          </div>
                        ) : (
                          categories.map((category) => (
                            <div key={category}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                {category}
                              </div>
                              {catalogProducts
                                .filter((p) => p.category === category)
                                .map((catalogProduct) => (
                                  <SelectItem
                                    key={catalogProduct.id}
                                    value={catalogProduct.id}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex justify-between items-center w-full gap-4">
                                      <span>{catalogProduct.name}</span>
                                      <span className="text-muted-foreground text-xs">
                                        ₦{catalogProduct.price.toLocaleString()}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </div>
                          ))
                        )}
                        <div className="border-t border-border mt-1 pt-1">
                          <SelectItem value="custom" className="cursor-pointer">
                            <span className="text-primary">+ Custom Product</span>
                          </SelectItem>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Price (₦)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.price || ""}
                      onChange={(e) =>
                        updateCustomPrice(product.id, parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      disabled={!isCustomProduct(product.name)}
                      className={!isCustomProduct(product.name) ? "bg-muted" : ""}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) =>
                        updateQuantity(product.id, parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProduct(product.id)}
                      disabled={products.length === 1}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>₦{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT (7.5%):</span>
              <span>₦{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
              <span>Total:</span>
              <span className="text-primary">₦{total.toFixed(2)}</span>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg">
            <Receipt className="h-4 w-4 mr-2" />
            Generate POS Receipt
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
