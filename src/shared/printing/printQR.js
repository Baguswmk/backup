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