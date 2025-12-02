import { forwardRef } from "react";
import { Invoice } from "@/types/invoice";
import { format } from "date-fns";

interface POSReceiptProps {
  invoice: Invoice;
}

export const POSReceipt = forwardRef<HTMLDivElement, POSReceiptProps>(
  ({ invoice }, ref) => {
    return (
      <div ref={ref} className="receipt-paper mx-auto">
        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-lg font-bold uppercase tracking-wide">
            {invoice.companyName}
          </h1>
          {invoice.companyAddress && (
            <p className="text-[10px] mt-1">{invoice.companyAddress}</p>
          )}
          {invoice.companyPhone && (
            <p className="text-[10px]">Tel: {invoice.companyPhone}</p>
          )}
        </div>

        <div className="receipt-double-line" />

        {/* Invoice Info */}
        <div className="text-[10px] space-y-1">
          <div className="flex justify-between">
            <span>Invoice #:</span>
            <span className="font-medium">{invoice.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{format(invoice.date, "dd/MM/yyyy")}</span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>{format(invoice.date, "HH:mm:ss")}</span>
          </div>
        </div>

        <div className="receipt-divider" />

        {/* Customer Info */}
        <div className="text-[10px] space-y-1">
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-medium truncate ml-2 max-w-[120px]">
              {invoice.customerName}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span className="truncate ml-2 max-w-[120px]">
              {invoice.issuerName}
            </span>
          </div>
        </div>

        <div className="receipt-divider" />

        {/* Products Header */}
        <div className="text-[10px] font-bold flex justify-between mb-1">
          <span className="flex-1">ITEM</span>
          <span className="w-8 text-center">QTY</span>
          <span className="w-16 text-right">PRICE</span>
          <span className="w-16 text-right">TOTAL</span>
        </div>

        <div className="receipt-divider" />

        {/* Products List */}
        <div className="space-y-2">
          {invoice.products.map((product) => (
            <div key={product.id} className="text-[10px]">
              <div className="flex justify-between">
                <span className="flex-1 truncate pr-2">{product.name}</span>
                <span className="w-8 text-center">{product.quantity}</span>
                <span className="w-16 text-right">
                  {product.price.toFixed(2)}
                </span>
                <span className="w-16 text-right font-medium">
                  {(product.price * product.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="receipt-double-line" />

        {/* Totals */}
        <div className="text-[10px] space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₦{invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (7.5%):</span>
            <span>₦{invoice.tax.toFixed(2)}</span>
          </div>
        </div>

        <div className="receipt-divider" />

        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL:</span>
          <span>₦{invoice.total.toFixed(2)}</span>
        </div>

        <div className="receipt-double-line" />

        {/* Footer */}
        <div className="text-center text-[9px] space-y-2 mt-3">
          <p className="font-medium">Thank you for your patronage!</p>
          <p>Please keep this receipt for your records</p>
          <p className="text-[8px] opacity-70">
            Powered by YAROTECH Invoice Pro
          </p>
        </div>

        {/* Barcode placeholder */}
        <div className="mt-3 flex justify-center">
          <div className="flex gap-[1px]">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="bg-black"
                style={{
                  width: Math.random() > 0.5 ? "2px" : "1px",
                  height: "24px",
                }}
              />
            ))}
          </div>
        </div>
        <p className="text-center text-[8px] mt-1">{invoice.id}</p>
      </div>
    );
  }
);

POSReceipt.displayName = "POSReceipt";
