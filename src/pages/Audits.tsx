import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  created_at: string;
  invoice_number: string;
  customer_name: string;
  issuer_name: string;
  total: number;
  products: { name: string; quantity: number }[];
}

const Audits = () => {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAudits();
    }
  }, [user]);

  const fetchAudits = async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setAudits(data.map((inv) => ({
        id: inv.id,
        created_at: inv.created_at,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        issuer_name: inv.issuer_name,
        total: Number(inv.total),
        products: (inv.products as { name: string; quantity: number }[]) || [],
      })));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground">Track all sales transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : audits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="text-sm">
                      {format(new Date(audit.created_at), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{audit.invoice_number}</Badge>
                    </TableCell>
                    <TableCell>{audit.customer_name}</TableCell>
                    <TableCell>{audit.issuer_name}</TableCell>
                    <TableCell>
                      {audit.products.reduce((sum, p) => sum + p.quantity, 0)} items
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₦{audit.total.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Audits;
