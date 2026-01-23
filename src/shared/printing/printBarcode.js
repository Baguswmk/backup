import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";

export const printBarcode128 = async (data, barWidth = 2, barHeight = 80) => {
  const doc = new jsPDF({ orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const canvas = document.createElement("canvas");

  JsBarcode(canvas, data, {
    format: "CODE128",
    lineColor: "#000000",
    width: barWidth,
    height: barHeight,
    displayValue: true,
    fontSize: 18,
    textAlign: "center",
    textPosition: "bottom",
    margin: 10,
  });

  const barcodeDataUrl = canvas.toDataURL("image/png");
  const desiredWidthInPDF = pageWidth * 0.6;
  const aspectRatio = canvas.width / canvas.height;
  const desiredHeightInPDF = desiredWidthInPDF / aspectRatio;

  const x = (pageWidth - desiredWidthInPDF) / 2;
  const y = (pageHeight - desiredHeightInPDF) / 2;

  doc.addImage(
    barcodeDataUrl,
    "PNG",
    x,
    y,
    desiredWidthInPDF,
    desiredHeightInPDF,
  );

  doc.save(`BARCODE_${data}.pdf`);
};
