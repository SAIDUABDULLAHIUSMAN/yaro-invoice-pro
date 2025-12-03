import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InvoiceForm } from "@/components/InvoiceForm";
import { POSReceipt } from "@/components/POSReceipt";
import { Invoice } from "@/types/invoice";
import { Button } from "@/components/ui/button";
import { Printer, X, FileText, History, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printReceipt } from "@/utils/printReceipt";

const Index = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleGenerateInvoice = async (newInvoice: Invoice) => {
    setInvoice(newInvoice);
    
    if (user) {
      setSaving(true);
      const { error } = await supabase.from('invoices').insert({
        user_id: user.id,
        invoice_number: newInvoice.id,
        company_name: newInvoice.companyName,
        company_address: newInvoice.companyAddress || null,
        company_phone: newInvoice.companyPhone || null,
        customer_name: newInvoice.customerName,
        issuer_name: newInvoice.issuerName,
        subtotal: newInvoice.subtotal,
        tax: newInvoice.tax,
        total: newInvoice.total,
        products: newInvoice.products as unknown,
      } as never);
      setSaving(false);
      
      if (error) {
        console.error('Failed to save invoice:', error);
        toast.error('Failed to save invoice to history');
      } else {
        toast.success('Invoice saved to history');
      }
    }
  };

  const handlePrint = () => {
    if (receiptRef.current && invoice) {
      const success = printReceipt(receiptRef.current.innerHTML, invoice.id);
      if (!success) {
        toast.error("Unable to print. Please allow popups for this site.");
      }
    }
  };

  const handleCloseReceipt = () => {
    setInvoice(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">PURE TRUST TPS</h1>
                <p className="text-xs text-muted-foreground">POS Receipt System</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/history')} className="gap-2">
                <History className="h-4 w-4" />
                History
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          {/* Form */}
          <div className="no-print">
            <InvoiceForm onGenerateInvoice={handleGenerateInvoice} />
          </div>

          {/* Receipt Preview */}
          {invoice && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="bg-card rounded-xl p-6 shadow-lg border border-border/50">
                <div className="flex items-center justify-between mb-4 no-print">
                  <h2 className="font-semibold">Receipt Preview</h2>
                  <div className="flex gap-2">
                    <Button onClick={handlePrint} size="sm" className="gap-2" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                      Print
                    </Button>
                    <Button
                      onClick={handleCloseReceipt}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 flex justify-center">
                  <POSReceipt ref={receiptRef} invoice={invoice} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
