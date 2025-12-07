import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClipboardList, Loader2, Download, CalendarIcon, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  created_at: string;
  invoice_number: string;
  customer_name: string;
  issuer_name: string;
  total: number;
  products: { name: string; quantity: number; price: number }[];
}

const Audits = () => {
  const { user } = useAuth();
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  useEffect(() => {
    if (user) {
      fetchAudits();
    }
  }, [user, fromDate, toDate]);

  const fetchAudits = async () => {
    setLoading(true);
    let query = supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (fromDate) {
      query = query.gte("created_at", format(fromDate, "yyyy-MM-dd"));
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    const { data, error } = await query.limit(500);

    if (!error && data) {
      setAudits(data.map((inv) => ({
        id: inv.id,
        created_at: inv.created_at,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        issuer_name: inv.issuer_name,
        total: Number(inv.total),
        products: (inv.products as { name: string; quantity: number; price: number }[]) || [],
      })));
    }
    setLoading(false);
  };

  const downloadCSV = () => {
    if (audits.length === 0) return;

    const headers = ["Date", "Invoice #", "Customer", "Issued By", "Items", "Products Detail", "Total (₦)"];
    const rows = audits.map((audit) => [
      format(new Date(audit.created_at), "dd/MM/yyyy HH:mm"),
      audit.invoice_number,
      audit.customer_name,
      audit.issuer_name,
      audit.products.reduce((sum, p) => sum + p.quantity, 0),
      audit.products.map(p => `${p.name} x${p.quantity}`).join("; "),
      audit.total.toLocaleString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const dateRange = fromDate && toDate 
      ? `_${format(fromDate, "yyyyMMdd")}-${format(toDate, "yyyyMMdd")}`
      : fromDate 
        ? `_from_${format(fromDate, "yyyyMMdd")}`
        : toDate 
          ? `_to_${format(toDate, "yyyyMMdd")}`
          : "";
    
    link.setAttribute("href", url);
    link.setAttribute("download", `transaction_history${dateRange}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = () => {
    if (audits.length === 0) return;

    const doc = new jsPDF();
    
    const dateRange = fromDate && toDate 
      ? `${format(fromDate, "dd/MM/yyyy")} - ${format(toDate, "dd/MM/yyyy")}`
      : fromDate 
        ? `From ${format(fromDate, "dd/MM/yyyy")}`
        : toDate 
          ? `To ${format(toDate, "dd/MM/yyyy")}`
          : "All Time";

    doc.setFontSize(18);
    doc.text("Transaction History", 14, 22);
    doc.setFontSize(11);
    doc.text(`Period: ${dateRange}`, 14, 30);
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 36);

    const tableData = audits.map((audit) => [
      format(new Date(audit.created_at), "dd/MM/yyyy HH:mm"),
      audit.invoice_number,
      audit.customer_name,
      audit.issuer_name,
      audit.products.reduce((sum, p) => sum + p.quantity, 0).toString(),
      `₦${audit.total.toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [["Date", "Invoice #", "Customer", "Issued By", "Items", "Total"]],
      body: tableData,
      startY: 42,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    const filenameDateRange = fromDate && toDate 
      ? `_${format(fromDate, "yyyyMMdd")}-${format(toDate, "yyyyMMdd")}`
      : fromDate 
        ? `_from_${format(fromDate, "yyyyMMdd")}`
        : toDate 
          ? `_to_${format(toDate, "yyyyMMdd")}`
          : "";
    
    doc.save(`transaction_history${filenameDateRange}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-muted-foreground">Track all sales transactions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !fromDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "dd/MM/yyyy") : "From Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !toDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "dd/MM/yyyy") : "To Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>

              {(fromDate || toDate) && (
                <Button variant="ghost" size="sm" onClick={() => { setFromDate(undefined); setToDate(undefined); }}>
                  Clear
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={downloadCSV} disabled={audits.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button size="sm" onClick={downloadPDF} disabled={audits.length === 0}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : audits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions found</p>
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
