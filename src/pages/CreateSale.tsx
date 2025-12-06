import { useState, useRef } from "react";
import { InvoiceForm } from "@/components/InvoiceForm";
import { POSReceipt } from "@/components/POSReceipt";
import { Invoice } from "@/types/invoice";
import { Button } from "@/components/ui/button";
import { Printer, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
      
      // Deduct stock for each product using direct SQL call
      for (const product of newInvoice.products) {
        if (product.id !== 'custom') {
          const { data: currentProduct } = await supabase
            .from('products')
            .select('stock')
            .eq('id', product.id)
            .single();
          
          if (currentProduct) {
            await supabase
              .from('products')
              .update({ stock: Math.max((currentProduct.stock || 0) - product.quantity, 0) })
              .eq('id', product.id)
              .then(({ error }) => {
              if (error) console.error('Stock deduction error:', error);
            });
          }
        }
      }

      const { error } = await supabase.from("invoices").insert({
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
        console.error("Failed to save invoice:", error);
        toast.error("Failed to save invoice to history");
      } else {
        toast.success("Invoice saved to history");
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
