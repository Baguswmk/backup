import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const printSJB = (data) => {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");

  doc.setFontSize(10);
  doc.text("Jembatan Timbang", 14, 15);
  doc.text(": TB", 50, 15);
  doc.text("Area Kerja", 14, 20);
  doc.text(": FOB-MV ROM 118", 50, 20);

  doc.setFontSize(12);
  doc.text("PT BUKIT ASAM, Tbk", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(11);
  doc.text("SURAT JALAN BATUBARA SKEMA FOB MV", pageWidth / 2, 27, {
    align: "center",
  });
  doc.text("DASAR UNTUK PENAGIHAN", pageWidth / 2, 34, { align: "center" });

  const leftColumnData = [
    ["No. DO", `: ${data.no_do}`],
    ["No. Lambung", `: ${data.hull_no}`],
    ["No. Polisi", `: ${data.number_plate}`],
    ["Kontraktor", `: ${data.contractor}`],
    ["Lokasi Dumping", `: ${data.destination}`],
    ["Waktu Timbang", `: ${data.weighed_at}`],
    ["Tanggal Shift", `: ${data.date_shift}`],
    ["Shift", `: ${data.shift}`],
  ];

  const rightColumnData = [
    ["Lokasi Loading", `: ${data.source}`],
    ["Product Brand", `: ${data.product_brand}`],
    ["Tipe Batubara", `: ${data.coal_type}`],
    ["Alat Muat", `: ${data.loading_unit}`],
    ["Berat Isi", `: ${data.gross_weight} kg`],
    ["Berat Kosong", `: ${data.tare_weight} kg`],
    ["Berat Bersih", `: ${data.net_weight} kg`],
    ["Jenis Truck", `: ${data.type_truck}`],
  ];

  autoTable(doc, {
    startY: 45,
    body: leftColumnData,
    theme: "plain",
    tableWidth: 120,
    margin: { left: 14 },
    styles: {
      fontSize: 10,
      cellPadding: 1,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: "auto" },
    },
  });

  autoTable(doc, {
    startY: 45,
    body: rightColumnData,
    theme: "plain",
    tableWidth: 120,
    margin: { left: pageWidth / 2 },
    styles: {
      fontSize: 10,
      cellPadding: 1,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: "auto" },
    },
  });

  const signatureY = doc.lastAutoTable.finalY + 20;
  const signatureLabels = [
    "Opr. Timbangan",
    "ROM PTBA",
    "Pos Batas IUP",
    "Surveyor Batas IUP",
    "Surveyor Lokasi Dumping",
    "Lokasi Dumping PTBA",
  ];
  const signatureSpacing = pageWidth / (signatureLabels.length + 1);

  doc.setFontSize(9);
  signatureLabels.forEach((label, index) => {
    const xPos = signatureSpacing * (index + 0.7);
    doc.text(label, xPos, signatureY, { align: "center" });
    doc.text("(             )", xPos, signatureY + 15, { align: "center" });
  });

  doc.setFontSize(8);
  const keteranganText =
    "Keterangan: Lembar 1 berwarna putih menjadi dasar penagihan jika dilengkapi dengan tanda tangan lengkap beserta CAP di lokasi dumping.\n" +
    "Lembar 1 dan 4 Pelaksana Pekerjaan. Lembar 2 dan 3 Surveyor dan PTBA Lokasi Dumping. Lembar 5 ROM PTBA";
  doc.text(keteranganText, 14, pageHeight - 20);

  doc.save(`SJB_${data.no_do}.pdf`);
};
