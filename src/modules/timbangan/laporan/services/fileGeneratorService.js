import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ============ PDF GENERATORS ============

export const generatePDF_SPPH = (data, params) => {
  const { startDate, endDate, shift } = params;

  const doc = new jsPDF({
    orientation: "landscape",
  });

  doc.setFontSize(18);
  doc.text("Laporan Tonase SPPH", 14, 20);

  doc.setFontSize(11);
  doc.text(
    `Periode: ${format(new Date(startDate), "dd MMM yyyy", { locale: localeId })} - ${format(new Date(endDate), "dd MMM yyyy", { locale: localeId })}`,
    14,
    30,
  );
  doc.text(`Shift: ${shift}`, 14, 36);

  const tableDataSPPH = data.map((item) => [
    item.date || "-",
    item.shift || "-",
    item.spph || "-",
    item.loading_location || "-",
    item.dumping_location || "-",
    item.coal_type || "-",
    item.measurement_type || "-",
    item.net_weight || "-",
    item.ritase || "-",
    item.distance || "-",
    item.jumlah_dt || "-",
    item.unit_exca || "-",
    item.grup || "-",
    item.status || "-",
    item.input_type || "-",
  ]);

  autoTable(doc, {
    head: [
      [
        "Date",
        "Shift",
        "Contract",
        "Loading Point",
        "Dumping Point",
        "Jenis BB",
        "Pengukuran",
        "Tonnage",
        "Ritase",
        "Jarak (m)",
        "Jumlah Dump Truck",
        "Exca",
        "Group",
        "Status",
        "Input Type",
      ],
    ],
    body: tableDataSPPH,
    startY: 45,
    styles: { fontSize: 7 },
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

  const filename = `laporan-spph-${startDate}-to-${endDate}-shift-${shift}.pdf`;
  doc.save(filename);

  return { filename, success: true };
};

export const generatePDF_DumpTruck = (data, params) => {
  const { startDate, endDate, shift } = params;

  const doc = new jsPDF({
    orientation: "landscape",
  });

  doc.setFontSize(18);
  doc.text("Laporan Tonase Dump Truck", 14, 20);

  doc.setFontSize(11);
  doc.text(
    `Periode: ${format(new Date(startDate), "dd MMM yyyy", { locale: localeId })} - ${format(new Date(endDate), "dd MMM yyyy", { locale: localeId })}`,
    14,
    30,
  );
  doc.text(`Shift: ${shift}`, 14, 36);

  const tableDataDT = data.map((item) => [
    item.date || "-",
    item.shift || "-",
    item.spph || "-",
    item.unit_dump_truck || "-",
    item.unit_exca || "-",
    item.net_weight || "-",
    item.jam_dumping || "-",
    item.loading_location || "-",
    item.dumping_location || "-",
    item.distance || "-",
    item.measurement_type || "-",
    item.coal_type || "-",
    item.grup || "-",
    item.status || "-",
    item.input_type || "-",
    item.input_by || "-",
    item.nama_operator || "-",
    item.lokasi || "-",
    item.tonase_adjustment || "-",
    item.contract || "-",
    item.kategori_jam || "-",
  ]);

  autoTable(doc, {
    head: [
      [
        "Date",
        "Shift",
        "SPPH",
        "Dump Truck",
        "Exca",
        "Tonase",
        "Jam Dumping",
        "Loading Point",
        "Dumping Point",
        "Jarak (m)",
        "Pengukuran",
        "Jenis BB",
        "Group",
        "Status",
        "Input Type",
        "Input By",
        "Nama Operator",
        "Lokasi",
        "Tonase Adjustment",
        "Contract",
        "Kategori Jam",
      ],
    ],
    body: tableDataDT,
    startY: 45,
    styles: { fontSize: 6 },
    headStyles: { fillColor: [255, 140, 0] },
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

  const filename = `laporan-dump-truck-${startDate}-to-${endDate}-shift-${shift}.pdf`;
  doc.save(filename);

  return { filename, success: true };
};

// ============ EXCEL GENERATORS ============

export const generateExcel_SPPH = (data, params) => {
  const { startDate, endDate, shift } = params;

  const wb = XLSX.utils.book_new();

  const headers = [
    "Date",
    "Shift",
    "SPPH",
    "Dump Truck",
    "Exca",
    "Tonase",
    "Jam Dumping",
    "Loading Point",
    "Dumping Point",
    "Jarak (m)",
    "Pengukuran",
    "Jenis BB",
    "Group",
    "Status",
    "Input Type",
  ];

  const columnWidths = [
    { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
  ];

  // Transform data
  const transformData = (items) => {
    return items.map((item) => [
      item.date || "-",
      item.shift || "-",
      item.spph || "-",
      item.unit_dump_truck || "-",
      item.unit_exca || "-",
      item.net_weight || 0,
      item.jam_dumping || "-",
      item.loading_location || "-",
      item.dumping_location || "-",
      item.distance || 0,
      item.measurement_type || "-",
      item.coal_type || "-",
      item.grup || "-",
      item.status || "-",
      item.input || "-",
    ]);
  };

  // Sheet ALL
  const allData = [headers, ...transformData(data)];
  const wsAll = XLSX.utils.aoa_to_sheet(allData);
  wsAll["!cols"] = columnWidths;
  XLSX.utils.book_append_sheet(wb, wsAll, "ALL");

  // Group by date
  const dataByDate = {};
  data.forEach((item) => {
    const date = item.date || "Unknown";
    if (!dataByDate[date]) {
      dataByDate[date] = [];
    }
    dataByDate[date].push(item);
  });

  // Sheet per tanggal
  Object.keys(dataByDate).sort().forEach((date) => {
    const dateSheetData = [headers, ...transformData(dataByDate[date])];
    const wsDate = XLSX.utils.aoa_to_sheet(dateSheetData);
    wsDate["!cols"] = columnWidths;
    
    // Format sheet name (max 31 karakter untuk Excel)
    let sheetName = date.replace(/\//g, "-").replace(/:/g, "-");
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 31);
    }
    
    XLSX.utils.book_append_sheet(wb, wsDate, sheetName);
  });

  const filename = `laporan-spph-${startDate}-to-${endDate}-shift-${shift}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { filename, success: true };
};

export const generateExcel_DumpTruck = (data, params) => {
  const { startDate, endDate, shift } = params;

  const wb = XLSX.utils.book_new();

  const headers = [
    "Date",
    "Shift",
    "SPPH",
    "Dump Truck",
    "Exca",
    "Tonase",
    "Jam Dumping",
    "Loading Point",
    "Dumping Point",
    "Jarak (m)",
    "Pengukuran",
    "Jenis BB",
    "Group",
    "Status",
    "Input Type",
    "Input By",
    "Nama Operator",
    "Lokasi",
    "Tonase Adjustment",
    "Contract",
    "Kategori Jam",
  ];

  const columnWidths = [
    { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 12 },
  ];

  // Transform data
  const transformData = (items) => {
    return items.map((item) => [
      item.date || "-",
      item.shift || "-",
      item.spph || "-",
      item.unit_dump_truck || "-",
      item.unit_exca || "-",
      item.net_weight || 0,
      item.jam_dumping || "-",
      item.loading_location || "-",
      item.dumping_location || "-",
      item.distance || 0,
      item.measurement_type || "-",
      item.coal_type || "-",
      item.grup || "-",
      item.status || "-",
      item.input || "-",
      item.input_by || "-",
      item.nama_operator || "-",
      item.lokasi || "-",
      item.tonase_adjustment || 0,
      item.contract || "-",
      item.kategori_jam || "-",
    ]);
  };

  // Sheet ALL
  const allData = [headers, ...transformData(data)];
  const wsAll = XLSX.utils.aoa_to_sheet(allData);
  wsAll["!cols"] = columnWidths;
  XLSX.utils.book_append_sheet(wb, wsAll, "ALL");

  // Group by date
  const dataByDate = {};
  data.forEach((item) => {
    const date = item.date || "Unknown";
    if (!dataByDate[date]) {
      dataByDate[date] = [];
    }
    dataByDate[date].push(item);
  });

  // Sheet per tanggal
  Object.keys(dataByDate).sort().forEach((date) => {
    const dateSheetData = [headers, ...transformData(dataByDate[date])];
    const wsDate = XLSX.utils.aoa_to_sheet(dateSheetData);
    wsDate["!cols"] = columnWidths;
    
    // Format sheet name (max 31 karakter untuk Excel)
    let sheetName = date.replace(/\//g, "-").replace(/:/g, "-");
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 31);
    }
    
    XLSX.utils.book_append_sheet(wb, wsDate, sheetName);
  });

  const filename = `laporan-dump-truck-${startDate}-to-${endDate}-shift-${shift}.xlsx`;
  XLSX.writeFile(wb, filename);

  return { filename, success: true };
};

// ============ CSV GENERATORS ============

export const generateCSV_SPPH = (data, params) => {
  const { startDate, endDate, shift } = params;

  const csvData = data.map((item, index) => ({
    No: index + 1,
    Date: item.date || "-",
    Shift: item.shift || "-",
    SPPH: item.spph || "-",
    "Dump Truck": item.unit_dump_truck || "-",
    Exca: item.unit_exca || "-",
    Tonase: item.net_weight || 0,
    "Jam Dumping": item.jam_dumping || "-",
    "Loading Point": item.loading_location || "-",
    "Dumping Point": item.dumping_location || "-",
    "Jarak (m)": item.distance || 0,
    Pengukuran: item.measurement_type || "-",
    "Jenis BB": item.coal_type || "-",
    Group: item.grup || "-",
    Status: item.status || "-",
    "Input Type": item.input || "-",
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const filename = `laporan-spph-${startDate}-to-${endDate}-shift-${shift}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { filename, success: true };
};

export const generateCSV_DumpTruck = (data, params) => {
  const { startDate, endDate, shift } = params;

  const csvData = data.map((item, index) => ({
    No: index + 1,
    Date: item.date || "-",
    Shift: item.shift || "-",
    SPPH: item.spph || "-",
    "Dump Truck": item.unit_dump_truck || "-",
    Exca: item.unit_exca || "-",
    Tonase: item.net_weight || 0,
    "Jam Dumping": item.jam_dumping || "-",
    "Loading Point": item.loading_location || "-",
    "Dumping Point": item.dumping_location || "-",
    "Jarak (m)": item.distance || 0,
    Pengukuran: item.measurement_type || "-",
    "Jenis BB": item.coal_type || "-",
    Group: item.grup || "-",
    Status: item.status || "-",
    "Input Type": item.input || "-",
    "Input By": item.input_by || "-",
    "Nama Operator": item.nama_operator || "-",
    Lokasi: item.lokasi || "-",
    "Tonase Adjustment": item.tonase_adjustment || 0,
    Contract: item.contract || "-",
    "Kategori Jam": item.kategori_jam || "-",
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const filename = `laporan-dump-truck-${startDate}-to-${endDate}-shift-${shift}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { filename, success: true };
};

// ============ MAIN GENERATOR ============

export const generateFile = (data, format, params, reportType = "spph") => {
  if (!data || data.length === 0) {
    throw new Error("Tidak ada data untuk diexport");
  }

  // ✅ Perbaikan: cek jika reportType mengandung "dump-truck"
  const isDumpTruckReport = reportType.includes("dump-truck");

  if (isDumpTruckReport) {
    switch (format) {
      case "pdf":
        return generatePDF_DumpTruck(data, params);
      case "excel":
        return generateExcel_DumpTruck(data, params);
      case "csv":
        return generateCSV_DumpTruck(data, params);
      default:
        throw new Error(`Format '${format}' tidak didukung`);
    }
  } else {
    switch (format) {
      case "pdf":
        return generatePDF_SPPH(data, params);
      case "excel":
        return generateExcel_SPPH(data, params);
      case "csv":
        return generateCSV_SPPH(data, params);
      default:
        throw new Error(`Format '${format}' tidak didukung`);
    }
  }
};

export default {
  generatePDF_SPPH,
  generatePDF_DumpTruck,
  generateExcel_SPPH,
  generateExcel_DumpTruck,
  generateCSV_SPPH,
  generateCSV_DumpTruck,
  generateFile,
};