import React, { useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/shared/components/ui/button";
import { Printer } from "lucide-react";
import RitaseTicket from "@/modules/timbangan/ritase/components/RitaseTicket";

const PrintTicketButton = forwardRef(
  (
    {
      data,
      onAfterPrint,
      variant = "outline",
      size = "default",
      className = "",
      children,
    },
    ref,
  ) => {
    const componentRef = useRef();
    const buttonRef = useRef();

    if (!data) {
      console.warn("⚠️ PrintTicketButton: No data provided, skipping render");
      return null;
    }

    const hasRequiredData =
      data &&
      (data.hull_no || data.dumptruck || data.unit_dump_truck || data.id);

    if (!hasRequiredData) {
      console.warn("⚠️ PrintTicketButton: Invalid data structure", data);
      return null;
    }

    const handlePrint = () => {
      const content = componentRef.current;

      if (!content) {
        console.error("❌ Print content not found");
        return;
      }

      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        console.error("❌ Could not open print window - popup blocked?");
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Karcis Ritase - ${data.id || "XXXXX"}</title>
            <meta charset="UTF-8">
            <style>
              @page {
                size: 105mm 160mm;
                margin: 0;
              }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              color-adjust: exact;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }
              
              @page {
                margin: 0;
              }
            }

           
            .p-8 { padding: 2rem; }
            .pb-4 { padding-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-12 { margin-bottom: 3rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-6 { margin-top: 1.5rem; }
            .mt-8 { margin-top: 2rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-4 { padding-top: 1rem; }
            .p-4 { padding: 1rem; }
            .p-6 { padding: 1.5rem; }
            
            .bg-neutral-50 { background-color: #ffffff; }
            .bg-linear-to-r { background-image: linear-gradient(to right, var(--tw-gradient-stops)); }
            .from-green-50 { --tw-gradient-from: #f0fdf4; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(240, 253, 244, 0)); }
            .to-blue-50 { --tw-gradient-to: #eff6ff; }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .text-xs { font-size: 0.75rem; line-height: 1rem; }
            .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .text-base { font-size: 1rem; line-height: 1.5rem; }
            .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
            .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
            
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .font-mono { font-family: ui-monospace, monospace; }
            
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-700 { color: #374151; }
            .text-gray-800 { color: #1f2937; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-700 { color: #1d4ed8; }
            .text-red-600 { color: #dc2626; }
            .text-green-600 { color: #16a34a; }
            .text-orange-600 { color: #ea580c; }
            
            .border { border-width: 1px; }
            .border-2 { border-width: 2px; }
            .border-4 { border-width: 4px; }
            .border-t { border-top-width: 1px; }
            .border-t-2 { border-top-width: 2px; }
            .border-b { border-bottom-width: 1px; }
            .border-b-2 { border-bottom-width: 2px; }
            .border-b-4 { border-bottom-width: 4px; }
            
            .border-gray-300 { border-color: #d1d5db; }
            .border-gray-800 { border-color: #1f2937; }
            .border-orange-300 { border-color: #fdba74; }
            .border-blue-300 { border-color: #93c5fd; }
            .border-green-500 { border-color: #22c55e; }
            .border-green-600 { border-color: #16a34a; }
            
            .rounded-lg { border-radius: 0.5rem; }
            
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            .gap-8 { gap: 2rem; }
            .gap-x-8 { column-gap: 2rem; }
            .gap-y-3 { row-gap: 0.75rem; }
            
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: 0.025em; }
            
            .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 250);
            };
            
            window.onafterprint = function() {
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `;

      printWindow.document.write(html);
      printWindow.document.close();

      if (onAfterPrint) {
        setTimeout(() => {
          onAfterPrint();
        }, 1000);
      }
    };

    useImperativeHandle(ref, () => ({
      click: handlePrint,
    }));

    return (
      <>
        <Button
          ref={buttonRef}
          type="button"
          variant={variant}
          size={size}
          onClick={handlePrint}
          className={`flex items-center cursor-pointer gap-2 hover:bg-gray-200  dark:text-gray-200 dark:hover:bg-gray-600 ${className}`}
        >
          <Printer className="w-4 h-4" />
          {children || "Cetak Karcis"}
        </Button>
        <div style={{ display: "none" }}>
          <RitaseTicket ref={componentRef} data={data} />
        </div>
      </>
    );
  },
);

PrintTicketButton.displayName = "PrintTicketButton";

export default PrintTicketButton;
