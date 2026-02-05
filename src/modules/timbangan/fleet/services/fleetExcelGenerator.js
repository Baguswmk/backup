import * as XLSX from "xlsx";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const generateFleetExcel = async ({
  fleetData,
  selectedSatker,
  selectedUrutkan,
  type,
  userRole
}) => {
  const wb = XLSX.utils.book_new();
  
  // Get current date and time
  const now = new Date();
  const day = format(now, "EEEE", { locale: id });
  const date = format(now, "dd MMMM yyyy", { locale: id });
  const shift = now.getHours() < 12 ? "I" : "II";
  const time = format(now, "HH:mm");

  // Create worksheet data
  const wsData = [];

  // Header Section
  wsData.push([`LAPORAN SETTING FLEET ${type?.toUpperCase() || 'COAL REHANDLING'} REALTIME`]);
  wsData.push([]);
  wsData.push([`No. Dok`, ': BAMSF', '', '', '', '', '', '', '', `No. Rev`, ': 0']);
  wsData.push([`Halaman`, ': 1 dari 1']);
  wsData.push([]);
  
  // Info Section
  wsData.push([`Hari`, `: ${day}`, '', `Group`, `: D`]);
  wsData.push([`Tanggal`, `: ${date}`, '', `Satker`, `: ${selectedSatker || 'MMCT'}`]);
  wsData.push([`Shift`, `: ${shift}`, '', `Urutkan Berdasarkan`, `: ${selectedUrutkan === 'dumping' ? 'Dumping Point' : 'Loading Point'}`]);
  wsData.push([`Jam`, `: ${time}`]);
  wsData.push([]);

  // Section 1: Setting Fleet
  wsData.push(['1. Setting Fleet']);
  wsData.push([]);

  // Group data by location
  const groupedData = groupFleetData(fleetData, selectedUrutkan);
  
  let grandTotalTronton = 0;
  let grandTotalTrintin = 0;
  let grandTotalDumptruck = 0;
  let grandTotalFleet = 0;

  // Process each location group
  for (const [location, fleets] of Object.entries(groupedData)) {
    // Location header
    wsData.push([`Lokasi ${fleets[0].loadingLocation}, ${fleets[0].dumpingLocation}`]);
    
    // Table header
    wsData.push([
      'No',
      'Alat Loading',
      'Loading Point',
      'Dumping Point',
      'Jarak',
      'Mitra',
      'Pengukuran',
      'Jenis BB',
      'Tronton',
      'Trintin',
      'Ket'
    ]);

    // Fleet data
    let totalTronton = 0;
    let totalTrintin = 0;
    let totalDumptruck = 0;

    fleets.forEach((fleet, idx) => {
      const tronton = fleet.units?.filter(u => u.tareWeight >= 16).length || 0;
      const trintin = fleet.units?.filter(u => u.tareWeight < 16).length || 0;
      
      totalTronton += tronton;
      totalTrintin += trintin;
      totalDumptruck += fleet.dumptruckCount || fleet.units?.length || 0;

      wsData.push([
        idx + 1,
        fleet.excavator || "-",
        fleet.loadingLocation || "-",
        fleet.dumpingLocation || "-",
        fleet.distance || "-",
        fleet.excavatorCompany || "-",
        fleet.measurementType || "-",
        fleet.coalType || "-",
        tronton || 0,
        trintin || 0,
        fleet.isSplit ? "Split" : ""
      ]);
    });

    // Subtotal
    wsData.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      `Jumlah Fleet Dumping Point ${location}`,
      totalTronton,
      totalTrintin,
      `${totalDumptruck} Fleet`
    ]);
    
    wsData.push([]);
    
    grandTotalTronton += totalTronton;
    grandTotalTrintin += totalTrintin;
    grandTotalDumptruck += totalDumptruck;
    grandTotalFleet += fleets.length;
  }

  // Grand Total
  wsData.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `Total Semua ${selectedUrutkan === 'dumping' ? 'Dumping Point' : 'Loading Point'} (${grandTotalFleet} Fleet)`,
    grandTotalTronton,
    grandTotalTrintin,
    grandTotalDumptruck
  ]);
  wsData.push([]);
  wsData.push([]);

  // Section 2: Status Dumptruck
  wsData.push(['2. Status Dumptruck']);
  wsData.push([]);
  
  // Status header
  wsData.push([
    'No',
    'Mitra',
    'Populasi - Tronton',
    'Populasi - Trintin',
    'Operasi - Tronton',
    'Operasi - Trintin',
    'Standby Ready - Tronton',
    'Standby Ready - Trintin',
    'Breakdown - Tronton',
    'Breakdown - Trintin',
    'PM/Service - Tronton',
    'PM/Service - Trintin',
    'Total Status - Tronton',
    'Total Status - Trintin'
  ]);

  const statusData = calculateDumptruckStatus(fleetData);
  statusData.rows.forEach(row => {
    wsData.push(row);
  });
  
  wsData.push([]);
  wsData.push([]);

  // Section 3: Status Exca Tidak Operasi
  wsData.push(['3. Status Exca Tidak Operasi']);
  wsData.push([]);
  
  wsData.push(['No', 'Alat Loading', 'Mitra', 'Lokasi', 'Ket']);

  const nonOperationalExca = fleetData.filter(f => 
    f.status === "BREAKDOWN" || f.status === "SERVICE" || f.status === "STANDBY"
  );

  if (nonOperationalExca.length > 0) {
    nonOperationalExca.forEach((fleet, idx) => {
      wsData.push([
        idx + 1,
        fleet.excavator || "-",
        fleet.excavatorCompany || "-",
        fleet.loadingLocation || "-",
        fleet.status || "Standby"
      ]);
    });
  } else {
    wsData.push(['-', '-', '-', '-', '-']);
  }

  wsData.push([]);
  wsData.push([]);
  wsData.push([]);
  
  // Footer
  wsData.push(['', '', '', '', '', '', '', '', '', 'Petugas Central Control Room (CCR)']);
  wsData.push(['', '', '', '', '', '', '', '', '', 'BARCODE']);
  wsData.push(['', '', '', '', '', '', '', '', '', 'isi (Jam, Tanggal,']);
  wsData.push(['', '', '', '', '', '', '', '', '', 'group dan Nama CCR)']);
  wsData.push([]);
  wsData.push(['', '', '', '', '', '', '', '', '', '(..................................)']);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  const colWidths = [
    { wch: 5 },   // No
    { wch: 20 },  // Alat Loading / Mitra
    { wch: 25 },  // Loading Point
    { wch: 25 },  // Dumping Point
    { wch: 10 },  // Jarak
    { wch: 20 },  // Mitra
    { wch: 15 },  // Pengukuran
    { wch: 15 },  // Jenis BB
    { wch: 10 },  // Tronton
    { wch: 10 },  // Trintin
    { wch: 10 }   // Ket
  ];
  ws['!cols'] = colWidths;

  // Merge cells for title
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } } // Title row
  ];

  // Apply styling (basic - Excel styling is limited without additional libraries)
  // You can enhance this with xlsx-style or similar libraries
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Setting Fleet");

  // Generate file name
  const fileName = `Laporan_Setting_Fleet_${type}_${format(now, 'yyyyMMdd_HHmmss')}.xlsx`;
  
  // Save file
  XLSX.writeFile(wb, fileName);
};

// Helper functions
function groupFleetData(fleetData, groupBy) {
  const grouped = {};
  
  fleetData.forEach(fleet => {
    const key = groupBy === 'dumping' ? fleet.dumpingLocation : fleet.loadingLocation;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(fleet);
  });
  
  return grouped;
}

function calculateDumptruckStatus(fleetData) {
  const mitraStats = {};
  
  fleetData.forEach(fleet => {
    const mitra = fleet.excavatorCompany || "Unknown";
    
    if (!mitraStats[mitra]) {
      mitraStats[mitra] = {
        populasi: { tronton: 0, trintin: 0 },
        operasi: { tronton: 0, trintin: 0 },
        standby: { tronton: 0, trintin: 0 },
        breakdown: { tronton: 0, trintin: 0 },
        service: { tronton: 0, trintin: 0 }
      };
    }
    
    fleet.units?.forEach(unit => {
      const isTronton = unit.tareWeight >= 16;
      const type = isTronton ? 'tronton' : 'trintin';
      
      // Population
      mitraStats[mitra].populasi[type]++;
      
      // Status
      if (unit.status === "ON DUTY" || unit.status === "OPERASI") {
        mitraStats[mitra].operasi[type]++;
      } else if (unit.status === "STANDBY") {
        mitraStats[mitra].standby[type]++;
      } else if (unit.status === "BREAKDOWN") {
        mitraStats[mitra].breakdown[type]++;
      } else if (unit.status === "SERVICE" || unit.status === "PM") {
        mitraStats[mitra].service[type]++;
      }
    });
  });
  
  const rows = [];
  let idx = 1;
  
  for (const [mitra, stats] of Object.entries(mitraStats)) {
    rows.push([
      idx++,
      mitra,
      stats.populasi.tronton,
      stats.populasi.trintin,
      stats.operasi.tronton,
      stats.operasi.trintin,
      stats.standby.tronton,
      stats.standby.trintin,
      stats.breakdown.tronton,
      stats.breakdown.trintin,
      stats.service.tronton,
      stats.service.trintin,
      stats.operasi.tronton + stats.standby.tronton + stats.breakdown.tronton + stats.service.tronton,
      stats.operasi.trintin + stats.standby.trintin + stats.breakdown.trintin + stats.service.trintin
    ]);
  }
  
  // Total row
  const totals = rows.reduce((acc, row) => {
    for (let i = 2; i < row.length; i++) {
      acc[i] = (acc[i] || 0) + (row[i] || 0);
    }
    return acc;
  }, {});
  
  rows.push([
    'Total Dumptruck',
    '',
    ...Object.values(totals)
  ]);
  
  return { rows };
}