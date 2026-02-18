import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/**
 * Generate Excel export for Ritase List
 * @param {Array} ritaseData - Array of ritase records
 */
export const generateRitaseExcel = (ritaseData = []) => {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const wsData = [];

  // ─── Column headers ──────────────────────────────────────────────────────────
  wsData.push([
    "No",
    "Hull No (DT)",
    "Mitra / Company",
    "Dumping Point",
    "Coal Type (Brand)",
    "Net Weight (ton)",
    "Tare Weight (ton)",
    "Gross Weight (ton)",
    "Date",
    "Shift",
    "Timestamp (Created At)",
  ]);

  // ─── Data rows ───────────────────────────────────────────────────────────────
  ritaseData.forEach((r, idx) => {
    const dateFormatted = r.date
      ? format(new Date(r.date), "dd/MM/yyyy", { locale: localeId })
      : "-";

    const createdAt = r.created_at || r.createdAt || r.date
      ? format(
          new Date(r.created_at || r.createdAt || r.date),
          "dd/MM/yyyy HH:mm:ss",
          { locale: localeId }
        )
      : "-";

    wsData.push([
      idx + 1,
      r.unit_dump_truck || r.hull_no || "-",
      r.company || "-",
      r.dumping_location || "-",
      r.coal_type || "-",
      r.net_weight ?? "-",
      r.tare_weight ?? "-",
      r.gross_weight ?? "-",
      dateFormatted,
      r.shift || "-",
      createdAt,
    ]);
  });

  // ─── Build worksheet ─────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 5 },   // No
    { wch: 18 },  // Hull No
    { wch: 22 },  // Mitra
    { wch: 22 },  // Dumping Point
    { wch: 18 },  // Coal Type
    { wch: 16 },  // Net
    { wch: 16 },  // Tare
    { wch: 16 },  // Gross
    { wch: 14 },  // Date
    { wch: 8 },   // Shift
    { wch: 22 },  // Timestamp
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Data Ritase");

  const fileName = `Ritase_${format(now, "yyyyMMdd_HHmmss")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};