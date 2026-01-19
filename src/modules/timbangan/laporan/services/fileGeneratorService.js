import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * File Generator Service
 * ✅ Generate PDF, Excel, CSV dengan date range
 * ✅ Fixed jsPDF autoTable import issue
 */

/**
 * ✅ Generate PDF dengan date range
 */
export const generatePDF = (data, params) => {
  const { startDate, endDate, shift } = params;

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Laporan Tonase Ritase", 14, 20);

  doc.setFontSize(11);
  doc.text(
    `Periode: ${format(new Date(startDate), "dd MMM yyyy", { locale: localeId })} - ${format(new Date(endDate), "dd MMM yyyy", { locale: localeId })}`,
    14,
    30,
  );
  doc.text(`Shift: ${shift}`, 14, 36);

  const tableData = data.map((item, index) => [
    index + 1,
    item.unit_dump_truck || "-",
    item.unit_exca || "-",
    item.loading_location || "-",
    item.dumping_location || "-",
    item.net_weight || 0,
    item.coal_type || "-",
    item.spph || "-",
  ]);

  autoTable(doc, {
    head: [
      [
        "No",
        "Dump Truck",
        "Excavator",
        "Loading",
        "Dumping",
        "Net Weight",
        "Coal Type",
        "SPPH",
      ],
    ],
    body: tableData,
    startY: 45,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Total Data: ${data.length} | Halaman ${i} dari ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10,
    );
    doc.text(
      `Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: localeId })}`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 10,
      { align: "right" },
    );
  }

  const filename = `laporan-tonase-${startDate}-to-${endDate}-shift-${shift}.pdf`;

  doc.save(filename);

  return { filename, success: true };
};

/**
 * ✅ Generate Excel dengan date range
 */
export const generateExcel = (data, params) => {
  const { startDate, endDate, shift } = params;

  const worksheetData = [
    ["LAPORAN TONASE RITASE"],
    [
      `Periode: ${format(new Date(startDate), "dd MMM yyyy", { locale: localeId })} - ${format(new Date(endDate), "dd MMM yyyy", { locale: localeId })}`,
    ],
    [`Shift: ${shift}`],
    [],
    [
      "No",
      "Dump Truck",
      "Excavator",
      "Loading",
      "Dumping",
      "Net Weight",
      "Distance",
      "Coal Type",
      "SPPH",
      "Operator",
      "Checker",
    ],
    ...data.map((item, index) => [
      index + 1,
      item.unit_dump_truck || "-",
      item.unit_exca || "-",
      item.loading_location || "-",
      item.dumping_location || "-",
      item.net_weight || 0,
      item.distance || 0,
      item.coal_type || "-",
      item.spph || "-",
      item.operator || "-",
      item.checker || "-",
    ]),
    [],
    [`Total Data: ${data.length}`],
    [
      `Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: localeId })}`,
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Laporan");

  ws["!cols"] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
  ];

  const filename = `laporan-tonase-${startDate}-to-${endDate}-shift-${shift}.xlsx`;

  XLSX.writeFile(wb, filename);

  return { filename, success: true };
};

/**
 * ✅ Generate CSV dengan date range
 */
export const generateCSV = (data, params) => {
  const { startDate, endDate, shift } = params;

  const csvData = data.map((item, index) => ({
    No: index + 1,
    Periode: `${startDate} - ${endDate}`,
    Shift: shift,
    SPPH: item.spph || "-",
    "Dump Truck": item.unit_dump_truck || "-",
    Excavator: item.unit_exca || "-",
    Loading: item.loading_location || "-",
    Dumping: item.dumping_location || "-",
    "Net Weight": item.net_weight || 0,
    Distance: item.distance || 0,
    "Coal Type": item.coal_type || "-",
    Operator: item.operator || "-",
    Checker: item.checker || "-",
    Inspector: item.inspector || "-",
    "Weigh Bridge": item.weigh_bridge || "-",
  }));

  const csv = Papa.unparse(csvData);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const filename = `laporan-tonase-${startDate}-to-${endDate}-shift-${shift}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { filename, success: true };
};

/**
 * ✅ Main function - Generate file based on format
 */
export const generateFile = (data, format, params) => {
  if (!data || data.length === 0) {
    throw new Error("Tidak ada data untuk diexport");
  }

  switch (format) {
    case "pdf":
      return generatePDF(data, params);
    case "excel":
      return generateExcel(data, params);
    case "csv":
      return generateCSV(data, params);
    default:
      throw new Error(`Format '${format}' tidak didukung`);
  }
};

export default {
  generatePDF,
  generateExcel,
  generateCSV,
  generateFile,
};
