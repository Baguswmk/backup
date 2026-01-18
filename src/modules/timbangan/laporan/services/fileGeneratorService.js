import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

/**
 * File Generator Service
 * Generate PDF, Excel, CSV dari data JSON di Frontend
 */

/**
 * ✅ Generate PDF dari data ritase
 */
export const generatePDF = (data, params) => {
  const { date, shift } = params;
  
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Laporan Tonase Ritase', 14, 20);
  
  doc.setFontSize(11);
  doc.text(`Tanggal: ${format(new Date(date), 'dd MMMM yyyy', { locale: localeId })}`, 14, 30);
  doc.text(`Shift: ${shift}`, 14, 36);
  
  // Prepare table data
  const tableData = data.map((item, index) => [
    index + 1,
    item.unit_dump_truck || '-',
    item.unit_exca || '-',
    item.loading_location || '-',
    item.dumping_location || '-',
    item.net_weight || 0,
    item.coal_type || '-',
    item.operator || '-',
  ]);
  
  // Generate table
  doc.autoTable({
    head: [['No', 'Dump Truck', 'Excavator', 'Loading', 'Dumping', 'Net Weight', 'Coal Type', 'Operator']],
    body: tableData,
    startY: 45,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Total Data: ${data.length} | Halaman ${i} dari ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
    doc.text(
      `Dicetak: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: localeId })}`,
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    );
  }
  
  // Generate filename
  const filename = `laporan-tonase-${date}-shift-${shift}.pdf`;
  
  // Download
  doc.save(filename);
  
  return { filename, success: true };
};

/**
 * ✅ Generate Excel dari data ritase
 */
export const generateExcel = (data, params) => {
  const { date, shift } = params;
  
  // Prepare worksheet data
  const worksheetData = [
    ['LAPORAN TONASE RITASE'],
    [`Tanggal: ${format(new Date(date), 'dd MMMM yyyy', { locale: localeId })}`],
    [`Shift: ${shift}`],
    [], // Empty row
    ['No', 'Dump Truck', 'Excavator', 'Loading', 'Dumping', 'Net Weight', 'Distance', 'Coal Type', 'Operator', 'Checker'],
    ...data.map((item, index) => [
      index + 1,
      item.unit_dump_truck || '-',
      item.unit_exca || '-',
      item.loading_location || '-',
      item.dumping_location || '-',
      item.net_weight || 0,
      item.distance || 0,
      item.coal_type || '-',
      item.operator || '-',
      item.checker || '-',
    ]),
    [], // Empty row
    [`Total Data: ${data.length}`],
    [`Dicetak: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: localeId })}`],
  ];
  
  // Create workbook and worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  
  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // Dump Truck
    { wch: 15 }, // Excavator
    { wch: 20 }, // Loading
    { wch: 20 }, // Dumping
    { wch: 12 }, // Net Weight
    { wch: 10 }, // Distance
    { wch: 15 }, // Coal Type
    { wch: 20 }, // Operator
    { wch: 20 }, // Checker
  ];
  
  // Generate filename
  const filename = `laporan-tonase-${date}-shift-${shift}.xlsx`;
  
  // Download
  XLSX.writeFile(wb, filename);
  
  return { filename, success: true };
};

/**
 * ✅ Generate CSV dari data ritase
 */
export const generateCSV = (data, params) => {
  const { date, shift } = params;
  
  // Prepare CSV data
  const csvData = data.map((item, index) => ({
    'No': index + 1,
    'Tanggal': date,
    'Shift': shift,
    'Dump Truck': item.unit_dump_truck || '-',
    'Excavator': item.unit_exca || '-',
    'Loading': item.loading_location || '-',
    'Dumping': item.dumping_location || '-',
    'Net Weight': item.net_weight || 0,
    'Distance': item.distance || 0,
    'Coal Type': item.coal_type || '-',
    'Operator': item.operator || '-',
    'Checker': item.checker || '-',
    'Inspector': item.inspector || '-',
    'Weigh Bridge': item.weigh_bridge || '-',
  }));
  
  // Convert to CSV
  const csv = Papa.unparse(csvData);
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const filename = `laporan-tonase-${date}-shift-${shift}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
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
    throw new Error('Tidak ada data untuk diexport');
  }
  
  switch (format) {
    case 'pdf':
      return generatePDF(data, params);
    case 'excel':
      return generateExcel(data, params);
    case 'csv':
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