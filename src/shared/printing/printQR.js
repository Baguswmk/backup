import jsPDF from "jspdf";
import QRCode from "qrcode";

export const printQR = async (data, size = 100) => {
  const doc = new jsPDF({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const textToDisplay = data.hull_no || data.hull_no_slr;
  const qrString = [
    data.no_do,
    data.contractor,
    data.hull_no,
    data.number_plate,
    data.product_brand,
    data.source,
    data.date_shift,
    data.shift,
    data.weighed_at,
    (data.gross_weight ?? 0).toFixed(3),
    (data.tare_weight ?? 0).toFixed(3),
    (data.net_weight ?? 0).toFixed(3),
    data.destination,
    data.loading_unit,
    data.coal_type,
    data.type_truck,
  ].join("| |");

  const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
    width: size * 4,
    margin: 1,
  });

  const qrX = (pageWidth - size) / 2;
  const qrY = (pageHeight - size) / 2 - 20;

  doc.addImage(qrCodeDataUrl, "PNG", qrX, qrY, size, size);

  const fontSize = 24;
  const fontStyle = "bold";
  doc.setFont("helvetica", fontStyle);
  doc.setFontSize(fontSize);

  const textWidth = doc.getTextWidth(textToDisplay);

  const boxPadding = 10;
  const boxWidth = textWidth + boxPadding * 2;
  const boxHeight = 15;
  const gap = 8;
  const boxX = (pageWidth - boxWidth) / 2;
  const boxY = qrY + size + gap;

  doc.rect(boxX, boxY, boxWidth, boxHeight);

  doc.text(textToDisplay, pageWidth / 2, boxY + boxHeight / 2, {
    align: "center",
    baseline: "middle",
  });

  doc.save(`QR_${textToDisplay}.pdf`);
};

export const generateTicketQR = async (data, operatorName) => {
  const timestamp = new Date(data.timestamp || new Date());
  
  const qrData = {
    hull_no: data.hull_no || data.dumptruck || data.unit_dump_truck || '',
    net_weight: (data.net_weight ?? 0).toFixed(2),
    date: timestamp.toLocaleDateString('id-ID', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }), // Format: DD/MM/YYYY
    time: timestamp.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }), // Format: HH:mm (24 jam)
    operator: operatorName || ''
  };
  
  // QR String dengan format yang lebih mudah dibaca
  const qrString = [
    `Unit: ${qrData.hull_no}`,
    `Berat: ${qrData.net_weight} ton`,
    `Tanggal: ${qrData.date}`,
    `Jam: ${qrData.time}`,
    `Operator: ${qrData.operator}`
  ].join('\n');
  
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M'
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};