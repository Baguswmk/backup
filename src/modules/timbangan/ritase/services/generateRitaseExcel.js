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
    "Date",
    "Shift",
    "SPPH",
    "Dump Truck",
    "Exca",
    "Tonase Bersih",
    "Tonase Kotor",
    "Tonase Kosong",
    "Jam Dumping",
    "Loading Point",
    "Dumping Point",
    "Jarak (m)",
    "Pengukuran",
    "Jenis BB",
    "Nama Operator",
  ]);

  // ─── Data rows ───────────────────────────────────────────────────────────────
  ritaseData.forEach((r, idx) => {
    const dateFormatted = r.date
      ? format(new Date(r.date), "dd/MM/yyyy", { locale: localeId })
      : "-";

    const createdAt =
      r.created_at || r.createdAt || r.date
        ? format(
            new Date(r.created_at || r.createdAt || r.date),
            "HH:mm",
            { locale: localeId },
          )
        : "-";
    wsData.push([
      idx + 1,
      r.date || "-",
      r.shift || "-",
      r.spph || "-",
      r.unit_dump_truck || "-",
      r.unit_exca || "-",
      r.net_weight || "-",
      r.gross_weight || "-",
      r.tare_weight || "-",
      createdAt,
      r.loading_location || "-",
      r.dumping_location || "-",
      r.distance || 0,
      r.measurement_type || "-",
      r.coal_type || "-",
      r.operator || "-",
    ]);
  });

  // ─── Build worksheet ─────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 5 }, // No
    { wch: 14 }, // Date
    { wch: 8 }, // Shift
    { wch: 16 }, // SPPH
    { wch: 22 }, // Dump Truck
    { wch: 22 }, // Exca
    { wch: 16 }, // Net
    { wch: 16 }, // Gross
    { wch: 16 }, // Tare
    { wch: 16 }, // Jam Dumping
    { wch: 32 }, // Loading Point
    { wch: 32 }, // Dumping Point
    { wch: 16 }, // Jarak (m)
    { wch: 16 }, // Pengukuran
    { wch: 16 }, // Coal Type
    { wch: 16 }, // Group
    { wch: 16 }, // Input Type
    { wch: 16 }, // Input By
    { wch: 16 }, // Nama Operator
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Data Ritase");

  const fileName = `Ritase_${format(now, "yyyyMMdd_HHmmss")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
