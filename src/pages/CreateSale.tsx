import { useState, useRef } from "react";
import { InvoiceForm } from "@/components/InvoiceForm";
import { POSReceipt } from "@/components/POSReceipt";
import { Invoice } from "@/types/invoice";
import { Button } from "@/components/ui/button";
import { Printer, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { printReceipt } from "@/utils/printReceipt";

const CreateSale = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const handleGenerateInvoice = async (newInvoice: Invoice) => {
    setInvoice(newInvoice);

    if (user) {
      setSaving(true);
      
      try {
        // Create invoice via API (stock decrement happens on backend)
        await api.createInvoice({
          invoice_number: newInvoice.id,
          company_name: newInvoice.companyName,
          company_address: newInvoice.companyAddress,
          company_phone: newInvoice.companyPhone,
          customer_name: newInvoice.customerName,
          issuer_name: newInvoice.issuerName,
          subtotal: newInvoice.subtotal,
          tax: newInvoice.tax,
          total: newInvoice.total,
          products: newInvoice.products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            quantity: p.quantity
          })),
        });
        
        toast.success("Invoice saved to history");
      } catch (error) {
        console.error("Failed to save invoice:", error);
        toast.error("Failed to save invoice to history");
      }
      
      setSaving(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Sale</h1>
        <p className="text-muted-foreground">Generate a new invoice</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="no-print">
          <InvoiceForm onGenerateInvoice={handleGenerateInvoice} />
        </div>

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
                  <Button onClick={handleCloseReceipt} size="sm" variant="ghost">
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
    </div>
  );
};

export default CreateSale;
