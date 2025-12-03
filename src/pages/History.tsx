import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { POSReceipt } from '@/components/POSReceipt';
import { Invoice, Product } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, Printer, ArrowLeft, Trash2, History as HistoryIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface DBInvoice {
  id: string;
  invoice_number: string;
  company_name: string;
  company_address: string | null;
  company_phone: string | null;
  customer_name: string;
  issuer_name: string;
  subtotal: number;
  tax: number;
  total: number;
  products: Product[];
  created_at: string;
}

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<DBInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load invoices');
    } else {
      const mapped = (data || []).map(d => ({
        ...d,
        products: d.products as unknown as Product[]
      })) as DBInvoice[];
      setInvoices(mapped);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete invoice');
    } else {
      toast.success('Invoice deleted');
      setInvoices(invoices.filter(inv => inv.id !== id));
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    }
  };

  const handleViewInvoice = (dbInvoice: DBInvoice) => {
    const invoice: Invoice = {
      id: dbInvoice.invoice_number,
      companyName: dbInvoice.company_name,
      companyAddress: dbInvoice.company_address || undefined,
      companyPhone: dbInvoice.company_phone || undefined,
      customerName: dbInvoice.customer_name,
      issuerName: dbInvoice.issuer_name,
      products: dbInvoice.products,
      date: new Date(dbInvoice.created_at),
      subtotal: Number(dbInvoice.subtotal),
      tax: Number(dbInvoice.tax),
      total: Number(dbInvoice.total),
    };
    setSelectedInvoice(invoice);
  };

  const handlePrint = () => {
    if (!receiptRef.current || !selectedInvoice) return;
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=350,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>POS Receipt - ${selectedInvoice.id}</title>
            <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              @page { size: 80mm auto; margin: 0; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 80mm; margin: 0; padding: 0; }
              body { font-family: 'JetBrains Mono', monospace; background: white; }
              .receipt-paper { font-family: 'JetBrains Mono', monospace; background: white; color: black; width: 80mm; max-width: 80mm; padding: 4mm 3mm; position: relative; page-break-inside: avoid; }
              .receipt-paper::before, .receipt-paper::after { content: ''; position: absolute; left: 0; right: 0; height: 6px; background: repeating-linear-gradient(135deg, transparent, transparent 3px, #ddd 3px, #ddd 6px); }
              .receipt-paper::before { top: 0; }
              .receipt-paper::after { bottom: 0; }
              .receipt-divider { border-top: 1px dashed #999; margin: 6px 0; }
              .receipt-double-line { border-top: 1px solid black; border-bottom: 1px solid black; height: 3px; margin: 6px 0; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .font-medium { font-weight: 500; }
              .uppercase { text-transform: uppercase; }
              .tracking-wide { letter-spacing: 0.025em; }
              .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .justify-center { justify-content: center; }
              .gap-\\[1px\\] { gap: 1px; }
              .space-y-1 > * + * { margin-top: 3px; }
              .space-y-2 > * + * { margin-top: 5px; }
              .mb-1 { margin-bottom: 3px; }
              .mb-2 { margin-bottom: 6px; }
              .mt-1 { margin-top: 3px; }
              .mt-3 { margin-top: 8px; }
              .ml-2 { margin-left: 6px; }
              .pr-2 { padding-right: 6px; }
              .text-lg { font-size: 14px; line-height: 18px; }
              .text-sm { font-size: 11px; line-height: 14px; }
              .text-\\[10px\\] { font-size: 9px; line-height: 12px; }
              .text-\\[9px\\] { font-size: 8px; line-height: 10px; }
              .text-\\[8px\\] { font-size: 7px; line-height: 9px; }
              .opacity-70 { opacity: 0.7; }
              .flex-1 { flex: 1; }
              .w-8 { width: 24px; }
              .w-16 { width: 48px; }
              .max-w-\\[120px\\] { max-width: 90px; }
              .bg-black { background: black; }
              @media print { html, body { width: 80mm; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .receipt-paper { box-shadow: none; margin: 0; width: 80mm; max-width: 80mm; } }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <HistoryIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Invoice History</h1>
                <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No invoices yet</p>
                </CardContent>
              </Card>
            ) : (
              invoices.map((inv) => (
                <Card
                  key={inv.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedInvoice?.id === inv.invoice_number ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => handleViewInvoice(inv)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <p className="font-medium">{inv.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">{inv.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₦{Number(inv.total).toFixed(2)}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-1"
                        onClick={(e) => { e.stopPropagation(); handleDelete(inv.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {selectedInvoice && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Receipt Preview</h2>
                  <Button onClick={handlePrint} size="sm" className="gap-2">
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 flex justify-center">
                  <POSReceipt ref={receiptRef} invoice={selectedInvoice} />
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
