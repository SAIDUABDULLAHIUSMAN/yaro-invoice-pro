export const printReceiptStyles = `
  @page {
    size: 80mm auto;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { 
    width: 80mm;
    margin: 0;
    padding: 0;
  }
  body { 
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    background: white;
    padding: 0;
  }
  .receipt-paper {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    background: white;
    color: black;
    width: 80mm;
    max-width: 80mm;
    padding: 4mm 3mm;
    position: relative;
    page-break-inside: avoid;
  }
  .receipt-paper::before,
  .receipt-paper::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 6px;
    background: repeating-linear-gradient(
      135deg,
      transparent,
      transparent 3px,
      #ddd 3px,
      #ddd 6px
    );
  }
  .receipt-paper::before { top: 0; }
  .receipt-paper::after { bottom: 0; }
  .receipt-divider {
    border-top: 1px dashed #999;
    margin: 6px 0;
  }
  .receipt-double-line {
    border-top: 1px solid black;
    border-bottom: 1px solid black;
    height: 3px;
    margin: 6px 0;
  }
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
  .items-center { align-items: center; }
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
  @media print {
    html, body { 
      width: 80mm;
      background: white !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-paper { 
      box-shadow: none; 
      margin: 0; 
      width: 80mm;
      max-width: 80mm;
    }
  }
`;

export const printReceipt = (content: string, invoiceId: string): boolean => {
  try {
    const printWindow = window.open("", "_blank", "width=350,height=600");
    
    if (!printWindow) {
      console.error("Print window blocked - please allow popups");
      return false;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>POS Receipt - ${invoiceId}</title>
          <meta charset="UTF-8">
          <style>${printReceiptStyles}</style>
        </head>
        <body onload="window.print()">
          ${content}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    return true;
  } catch (error) {
    console.error("Print error:", error);
    return false;
  }
};
