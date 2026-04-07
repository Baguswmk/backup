import * as XLSX from "xlsx";

/**
 * Parsing logic for Pengeluaran KA excel templates.
 *
 * Excel Column Layout (Row 0 = header, Row 1 = global data):
 * A(0):shift  B(1):urut  C(2):operator  D(3):mulai  E(4):selesai
 * F(5):total_berat  G(6):selisih  H(7):bbr  I(8):gerbong_count
 * J(9):tujuan  K(10):satuan  L(11):kapasitas  M(12):jenis
 *
 * Rows 2-4: Empty / trash rows (skip)
 * Row 5 onwards: Detail data per gerbong
 *
 * Detail Row Layout:
 * [0]:seq  [1]:nomor_gerbong  [2]:jenis_bb  [3]:tonase
 *
 * If detail [2] (jenis_bb) is empty, fallback to header jenis (globalData.jenis).
 */

/**
 * Parse Excel date value to ISO string.
 * Handles both Excel serial numbers and string formats like "27-Mar-2026, 14:15".
 */
const parseExcelDate = (value) => {
  if (!value) return null;

  // Excel serial date (stored as number)
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  // String date: "27-Mar-2026, 14:15" or similar
  if (typeof value === "string") {
    const cleaned = value.replace(",", "").trim();
    const date = new Date(cleaned);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
};

/**
 * Normalize tonase values:
 * If > 1000, we assume operator inputted grams/kg and divide by 1000.
 * If <= 1000, we assume it's already in Metric Tons.
 * Also handles comma as decimal separator.
 */
const normalizeTonase = (val) => {
  let cleaned = val;
  if (typeof val === "string") {
    // Convert indonesian comma decimals to dot decimals
    cleaned = val.replace(/,/g, ".");
  }
  
  const num = Number(cleaned);
  if (isNaN(num) || num <= 0) return 0;
  if (num > 1000) return num / 1000;
  return num;
};

/**
 * Normalize capacity based on destination:
 * Tarahan -> 50 MT
 * Kertapati -> 45 MT
 * Otherwise, attempt to extract number from raw value (e.g. "50 MT" -> 50).
 */
const normalizeCapacity = (tujuan, rawCapacity) => {
  const t = String(tujuan || "").toLowerCase();
  // Hard rules based on location
  if (t.includes("tarahan")) return 50;
  if (t.includes("kertapati")) return 45;

  // Fallback: extract integers
  const match = String(rawCapacity).match(/\d+/);
  return match ? Number(match[0]) : 45;
};

export const parsePengeluaranExcel = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of arrays (raw)
        const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (raw.length < 2) {
          throw new Error("Format file tidak valid: Tidak ada data global (baris ke-2).");
        }

        // Global Data at row index 1
        // A(0) B(1) C(2) D(3) E(4) F(5) G(6) H(7) I(8) J(9) K(10) L(11) M(12)
        const globalRow = raw[1] || [];
        const globalData = {
          shift:       globalRow[0],
          urut:        globalRow[1],
          operator:    globalRow[2],
          mulai:       globalRow[3],
          selesai:     globalRow[4],
          // [5] total_berat and [6] selisih are informational, skip
          bbr:         globalRow[7],
          // [8] gerbong_count is informational, skip
          tujuan:      globalRow[9],
          satuan:      globalRow[10],
          kapasitas:   globalRow[11],
          jenis:       globalRow[12], // default coal type for wagons
        };

        if (!globalData.bbr) {
          throw new Error("Data tidak valid: BBR/ID Rangkaian tidak ditemukan di baris ke-2.");
        }

        const payloads = [];

        // Detail rows start after global data (index > 1)
        // We start scanning from index 2 and skip any row that doesn't contain actual gerbong info
        for (let i = 2; i < raw.length; i++) {
          const detailRow = raw[i];

          // Skip completely empty rows
          if (!detailRow || detailRow.length === 0) continue;

          // [0] = seq number, [1] = carriage_number, [2] = jenis_bb, [3] = tonase
          const nomor_gerbong = detailRow[1];
          const jenis_bb      = detailRow[2] || globalData.jenis; // fallback to header jenis
          const tonase        = detailRow[3];

          // Skip rows that don't have valid carriage numbers or tonnages (like spacer rows or headers)
          if (!nomor_gerbong || tonase == null || tonase === "") continue;

          payloads.push({
            // Header (global) fields
            shift:    Number(globalData.shift) || globalData.shift,
            urut:     Number(globalData.urut)  || globalData.urut,
            operator: globalData.operator,
            mulai:    parseExcelDate(globalData.mulai),
            selesai:  parseExcelDate(globalData.selesai),
            bbr:      String(globalData.bbr),
            tujuan:   globalData.tujuan,
            satuan:   globalData.satuan,
            kapasitas: normalizeCapacity(globalData.tujuan, globalData.kapasitas),

            // Detail fields
            nomor_gerbong: String(nomor_gerbong).trim(),
            jenis_bb:      String(jenis_bb).trim(),
            tonase:        normalizeTonase(tonase),
          });
        }

        if (payloads.length === 0) {
          throw new Error("Tidak ada data gerbong yang valid ditemukan di file Excel.");
        }

        resolve({ success: true, count: payloads.length, data: payloads });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: "Gagal membaca file Excel." });
    };

    reader.readAsArrayBuffer(file);
  });
};
