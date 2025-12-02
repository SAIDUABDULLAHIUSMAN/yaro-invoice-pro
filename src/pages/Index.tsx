import { useState, useRef } from "react";
import { InvoiceForm } from "@/components/InvoiceForm";
import { POSReceipt } from "@/components/POSReceipt";
import { Invoice } from "@/types/invoice";
import { Button } from "@/components/ui/button";
import { Printer, X, FileText } from "lucide-react";

const Index = () => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open("", "", "width=350,height=600");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>POS Receipt - ${invoice?.id}</title>
              <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: 'JetBrains Mono', monospace;
                  background: white;
                  display: flex;
                  justify-content: center;
                  padding: 0;
                }
                .receipt-paper {
                  font-family: 'JetBrains Mono', monospace;
                  background: white;
                  color: black;
                  width: 80mm;
                  padding: 8mm 4mm;
                  position: relative;
                }
                .receipt-paper::before,
                .receipt-paper::after {
                  content: '';
                  position: absolute;
                  left: 0;
                  right: 0;
                  height: 8px;
                  background: repeating-linear-gradient(
                    135deg,
                    transparent,
                    transparent 4px,
                    #ddd 4px,
                    #ddd 8px
                  );
                }
                .receipt-paper::before { top: 0; }
                .receipt-paper::after { bottom: 0; }
                .receipt-divider {
                  border-top: 1px dashed #ccc;
                  margin: 8px 0;
                }
                .receipt-double-line {
                  border-top: 1px solid black;
                  border-bottom: 1px solid black;
                  height: 4px;
                  margin: 8px 0;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .font-medium { font-weight: 500; }
                .uppercase { text-transform: uppercase; }
                .tracking-wide { letter-spacing: 0.05em; }
                .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .justify-center { justify-content: center; }
                .items-center { align-items: center; }
                .gap-\\[1px\\] { gap: 1px; }
                .space-y-1 > * + * { margin-top: 4px; }
                .space-y-2 > * + * { margin-top: 8px; }
                .mb-1 { margin-bottom: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mt-1 { margin-top: 4px; }
                .mt-3 { margin-top: 12px; }
                .ml-2 { margin-left: 8px; }
                .pr-2 { padding-right: 8px; }
                .text-lg { font-size: 18px; line-height: 28px; }
                .text-sm { font-size: 14px; line-height: 20px; }
                .text-\\[10px\\] { font-size: 10px; line-height: 14px; }
                .text-\\[9px\\] { font-size: 9px; line-height: 12px; }
                .text-\\[8px\\] { font-size: 8px; line-height: 10px; }
                .opacity-70 { opacity: 0.7; }
                .flex-1 { flex: 1; }
                .w-8 { width: 32px; }
                .w-16 { width: 64px; }
                .max-w-\\[120px\\] { max-width: 120px; }
                .bg-black { background: black; }
                @media print {
                  body { background: white; }
                  .receipt-paper { box-shadow: none; margin: 0; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  };

  const handleCloseReceipt = () => {
    setInvoice(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">YAROTECH Invoice Pro</h1>
              <p className="text-xs text-muted-foreground">POS Receipt System</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          {/* Form */}
          <div className="no-print">
            <InvoiceForm onGenerateInvoice={setInvoice} />
          </div>

          {/* Receipt Preview */}
          {invoice && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="bg-card rounded-xl p-6 shadow-lg border border-border/50">
                <div className="flex items-center justify-between mb-4 no-print">
                  <h2 className="font-semibold">Receipt Preview</h2>
                  <div className="flex gap-2">
                    <Button onClick={handlePrint} size="sm" className="gap-2">
                      <Printer className="h-4 w-4" />
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
