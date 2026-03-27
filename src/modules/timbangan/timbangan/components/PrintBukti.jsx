import React, {
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import { Button } from "@/shared/components/ui/button";
import { Printer } from "lucide-react";
import RitaseTicket from "@/modules/timbangan/ritase/components/RitaseTicket";
import { generateTicketQR } from "@/shared/printing/printQR";
import { calculateCurrentShiftAndGroup } from "@/shared/utils/group";

const PrintBukti = forwardRef(
  (
    {
      data,
      onAfterPrint,
      variant = "outline",
      size = "default",
      className = "",
      children,
      autoPrint = false,
    },
    ref,
  ) => {
    const componentRef = useRef();
    const buttonRef = useRef();
    const iframeRef = useRef(null);
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [operatorName, setOperatorName] = useState("");

    // Load operator name from localStorage
    useEffect(() => {
      const savedName = localStorage.getItem("internal_operator_sib_name");
      if (savedName) {
        setOperatorName(savedName);
      }
    }, []);

    if (!data) {
      console.warn("⚠️ PrintBukti: No data provided, skipping render");
      return null;
    }

    const hasRequiredData =
      data &&
      (data.hull_no || data.dumptruck || data.unit_dump_truck || data.id);

    if (!hasRequiredData) {
      console.warn("⚠️ PrintBukti: Invalid data structure", data);
      return null;
    }

    // Generate QR code when component mounts or data changes
    useEffect(() => {
      const generateQR = async () => {
        const qrUrl = await generateTicketQR(data, operatorName);
        setQrCodeUrl(qrUrl);
      };
      generateQR();
    }, [data, operatorName]);

    // Get current date, time, and shift info
    const getCurrentDateTime = () => {
      const now = new Date(data.timestamp || data.weighed_at || data.createdAt || new Date());
      const shiftInfo = calculateCurrentShiftAndGroup(now);

      return {
        date: now.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        time: now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        shift: shiftInfo.currentShift.split(" ")[1] || "1", // Extract shift number
      };
    };

    const dateTimeInfo = getCurrentDateTime();

    // Format weight to display with 2 decimal places
    const formatWeight = (weight) => {
      return (weight ?? 0).toFixed(2);
    };

    // Silent print using hidden iframe
    const handleSilentPrint = async () => {
      const content = componentRef.current;

      if (!content) {
        console.error("❌ Print content not found");
        return;
      }

      // Refresh operator name from local storage right before printing
      const currentOperatorName =
        localStorage.getItem("internal_operator_sib_name") || operatorName;
      if (currentOperatorName !== operatorName) {
        setOperatorName(currentOperatorName);
      }

      // Generate a fresh QR code URL to make sure it contains the latest operator name
      let printQrCodeUrl = qrCodeUrl;
      try {
        printQrCodeUrl = await generateTicketQR(data, currentOperatorName);
        setQrCodeUrl(printQrCodeUrl);
      } catch (e) {
        console.error("Error generating QR code for print", e);
      }

      // Remove existing iframe if any
      if (iframeRef.current) {
        document.body.removeChild(iframeRef.current);
      }

      // Create hidden iframe for printing
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";

      document.body.appendChild(iframe);
      iframeRef.current = iframe;

      const iframeDoc = iframe.contentWindow || iframe.contentDocument;
      const doc = iframeDoc.document || iframeDoc;

      const hullNo =
        data.hull_no || data.dumptruck || data.unit_dump_truck || "-";
      const grossWeight = formatWeight(data.gross_weight);
      const tareWeight = formatWeight(data.tare_weight);
      const netWeight = formatWeight(data.net_weight || data.bypass_tonnage);

      const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Karcis Ritase - ${hullNo}</title>
      <meta charset="UTF-8">
      <style>
        @page {
          size: 75mm 100mm;
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
          font-family: Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-adjust: exact;
          background-color: white;
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

        .ticket-container {
          border: 2px solid black;
          padding: 3mm;
          width: 75mm;
          height: 100mm;
          display: flex;
          flex-direction: column;
        }

        .company-name {
          text-align: center;
          font-weight: bold;
          font-size: 1rem;
          padding-bottom: 0.4rem;
        }

        .doc-info {
          border: 1px solid black;
          padding: 0.4rem;
          margin-bottom: 0.8rem;
        }

        .doc-row {
          display: grid;
          grid-template-columns: 75px 10px 1fr;
          margin-bottom: 0.2rem;
          font-size: 0.65rem;
        }

        .doc-separator {
          text-align: center;
        }

        .doc-row:last-child {
          margin-bottom: 0;
        }

        .info-section {
          margin-bottom: 0.8rem;
        }

        .info-row {
          display: grid;
          grid-template-columns: 110px 10px 1fr;
          margin-bottom: 0.25rem;
          font-size: 0.7rem;
        }

        .info-label {
          font-weight: normal;
        }

        .info-separator {
          text-align: center;
        }

        .info-value {
          font-weight: normal;
        }

        .info-value.highlight {
          font-weight: bold;
          font-size: 0.9rem;
        }

        .qr-section {
          text-align: center;
        }

        .qr-code {
          width: 100px;
          height: 100px;
          margin: 0 auto;
        }

        .operator-title {
          text-align: center;
          font-weight: bold;
          font-size: 0.65rem;
          margin-bottom: 0.4rem;  
        }

        .operator-name {
          text-align: center;
          font-size: 0.65rem;
        }
      </style>
    </head>
    <body>
      <div class="ticket-container">
        <div class="company-name">
          PT BUKIT ASAM, Tbk
        </div>

        <div class="doc-info">
          <div class="doc-row">
            <span>No Dokumen</span>
            <span class="doc-separator">:</span>
            <span><strong>BAMSF:PAB:8.5.1:02:05:06</strong></span>
          </div>
          <div class="doc-row">
            <span>No. Revisi</span>
            <span class="doc-separator">:</span>
            <span><strong>-</strong></span>
          </div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">No DT </span>
            <span class="info-separator">:</span>
            <span class="info-value">${hullNo}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Berat Kotor</span>
            <span class="info-separator">:</span>
            <span class="info-value">${grossWeight} ton</span>
          </div>
          <div class="info-row">
            <span class="info-label">Berat Kosong</span>
            <span class="info-separator">:</span>
            <span class="info-value">${tareWeight} ton</span>
          </div>
          <div class="info-row">
            <span class="info-label">Berat Isi</span>
            <span class="info-separator">:</span>
            <span class="info-value highlight">${netWeight} ton</span>
          </div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Tanggal</span>
            <span class="info-separator">:</span>
            <span class="info-value">${dateTimeInfo.date}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Shift</span>
            <span class="info-separator">:</span>
            <span class="info-value">${dateTimeInfo.shift}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Jam</span>
            <span class="info-separator">:</span>
            <span class="info-value">${dateTimeInfo.time}</span>
          </div>
        </div>

        <div class="operator-title">
          Operator Jembatan Timbang
        </div>

                ${
                  printQrCodeUrl
                    ? `
        <div class="qr-section">
          <img src="${printQrCodeUrl}" alt="QR Code" class="qr-code" />
        </div>
        `
                    : ""
                }

        <div class="operator-name">
          ${currentOperatorName || "-"}
        </div>
      </div>
    </body>
    </html>
    `;

      doc.open();
      doc.write(html);
      doc.close();

      // Wait for content to load before printing
      iframe.contentWindow.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();

          if (onAfterPrint) {
            setTimeout(() => {
              onAfterPrint();
            }, 1000);
          }
        }, 250);
      };
    };

    // Use silent print as default
    const handlePrint = handleSilentPrint;

    useImperativeHandle(ref, () => ({
      click: handlePrint,
      printSilent: handleSilentPrint,
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

PrintBukti.displayName = "PrintBukti";

export default PrintBukti;
