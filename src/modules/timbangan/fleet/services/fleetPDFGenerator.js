import jsPDF from "jspdf";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import BUKIT_ASAM_LOGO from "/logo_ptba.png"
import autoTable from "jspdf-autotable";

export const generateFleetPDF = async ({
  fleetData,
  selectedSatker,
  selectedUrutkan,
  type,
  userRole
}) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Get current date and time
  const now = new Date();
  const day = format(now, "EEEE", { locale: id });
  const date = format(now, "dd MMMM yyyy", { locale: id });
  const shift = now.getHours() < 12 ? "I" : "II";
  const time = format(now, "HH:mm");

  // Logo
    doc.addImage(BUKIT_ASAM_LOGO, "PNG", 10, 10, 40, 10);

  // Title in center
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const title = `LAPORAN SETTING FLEET ${type?.toUpperCase() || 'COAL REHANDLING'}`;
  doc.text(title, pageWidth / 2, 15, { align: "center" });

  // Document info (top right)
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`No. Dok  : BAMSF`, pageWidth - 50, 10);
  doc.text(`No. Rev   : 0`, pageWidth - 50, 15);
  doc.text(`Halaman  : 1 dari 1`, pageWidth - 50, 20);

  // Info Section (below title)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const leftInfoX = 10;
  const rightInfoX = pageWidth / 2 + 10;
  let infoY = 35;

  // Left side info
  doc.text(`Hari`, leftInfoX, infoY);
  doc.text(`: ${day}`, leftInfoX + 25, infoY);
  
  doc.text(`Tanggal`, leftInfoX, infoY + 5);
  doc.text(`: ${date}`, leftInfoX + 25, infoY + 5);
  
  doc.text(`Shift`, leftInfoX, infoY + 10);
  doc.text(`: ${shift}`, leftInfoX + 25, infoY + 10);
  
  doc.text(`Jam`, leftInfoX, infoY + 15);
  doc.text(`: ${time}`, leftInfoX + 25, infoY + 15);

  // Right side info
  doc.text(`Group`, rightInfoX, infoY);
  doc.text(`: D`, rightInfoX + 50, infoY);
  
  doc.text(`Satker`, rightInfoX, infoY + 5);
  doc.text(`: ${selectedSatker || 'MMCT'}`, rightInfoX + 50, infoY + 5);
  
  doc.text(`Urutkan Berdasarkan`, rightInfoX, infoY + 10);
  doc.text(`: ${selectedUrutkan === 'dumping' ? 'Dumping Point' : 'Loading Point'}`, rightInfoX + 50, infoY + 10);

  // Section 1: Setting Fleet
  let currentY = infoY + 25;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("1. Setting Fleet", 10, currentY);

  currentY += 5;

  // Group data by location
  const groupedData = groupFleetData(fleetData, selectedUrutkan);

  // Process each location group
  for (const [location, fleets] of Object.entries(groupedData)) {
    // Location header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Lokasi ${fleets[0].loadingLocation}, ${fleets[0].dumpingLocation}`, 10, currentY);
    currentY += 5;

    // Fleet table for this location
    const tableData = [];
    let totalTronton = 0;
    let totalTrintin = 0;
    let totalDumptruck = 0;

    fleets.forEach((fleet, idx) => {
      const tronton = fleet.units?.filter(u => u.tareWeight >= 16).length || 0;
      const trintin = fleet.units?.filter(u => u.tareWeight < 16).length || 0;
      
      totalTronton += tronton;
      totalTrintin += trintin;
      totalDumptruck += fleet.dumptruckCount || fleet.units?.length || 0;

      tableData.push([
        idx + 1,
        fleet.excavator || "-",
        fleet.loadingLocation || "-",
        fleet.dumpingLocation || "-",
        fleet.distance || "-",
        fleet.excavatorCompany || "-",
        fleet.measurementType || "-",
        fleet.coalType || "-",
        tronton || "-",
        trintin || "-",
        fleet.isSplit ? "Split" : "-"
      ]);
    });

    // Add subtotal row
    tableData.push([
      { content: `Jumlah Fleet Dumping Point ${location}`, colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalTronton, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: totalTrintin, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: totalDumptruck + " Fleet", styles: { halign: 'center', fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[
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
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 15 },
        5: { cellWidth: 25 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
        8: { cellWidth: 15 },
        9: { cellWidth: 15 },
        10: { cellWidth: 15 }
      },
      margin: { left: 10, right: 10 },
      didDrawPage: function (data) {
        currentY = data.cursor.y;
      }
    });

    currentY = doc.lastAutoTable.finalY + 5;
  }

  // Section 2: Status Dumptruck
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  currentY += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("2. Status Dumptruck", 10, currentY);
  currentY += 5;

  const statusData = calculateDumptruckStatus(fleetData);
  
  autoTable(doc, {
    startY: currentY,
    head: [[
      { content: 'No', rowSpan: 2 },
      { content: 'Mitra', rowSpan: 2 },
      { content: 'Populasi', colSpan: 2 },
      { content: 'Operasi', colSpan: 2 },
      { content: 'Standby Ready', colSpan: 2 },
      { content: 'Breakdown', colSpan: 2 },
      { content: 'PM/Service', colSpan: 2 },
      { content: 'Total Status', colSpan: 2 }
    ], [
      'Tronton', 'Trintin',
      'Tronton', 'Trintin',
      'Tronton', 'Trintin',
      'Tronton', 'Trintin',
      'Tronton', 'Trintin',
      'Tronton', 'Trintin'
    ]],
    body: statusData.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 30 }
    },
    margin: { left: 10, right: 10 }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // Section 3: Status Exca Tidak Operasi
  if (currentY > pageHeight - 40) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("3. Status Exca Tidak Operasi", 10, currentY);
  currentY += 5;

  const nonOperationalExca = fleetData.filter(f => 
    f.status === "BREAKDOWN" || f.status === "SERVICE" || f.status === "STANDBY"
  );

  const excaData = nonOperationalExca.map((fleet, idx) => [
    idx + 1,
    fleet.excavator || "-",
    fleet.excavatorCompany || "-",
    fleet.loadingLocation || "-",
    fleet.status || "Standby"
  ]);

  if (excaData.length === 0) {
    excaData.push(['-', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Alat Loading', 'Mitra', 'Lokasi', 'Ket']],
    body: excaData,
    theme: 'grid',
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 40 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 30 }
    },
    margin: { left: 10, right: 10 }
  });

  // Footer - Barcode section
  currentY = doc.lastAutoTable.finalY + 10;
  
  if (currentY > pageHeight - 40) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Petugas Central Control Room (CCR)", pageWidth - 70, currentY);
  
  currentY += 10;
  doc.rect(pageWidth - 70, currentY, 50, 25);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("BARCODE", pageWidth - 45, currentY + 8, { align: 'center' });
  doc.text(`Isi (Jam, Tanggal,`, pageWidth - 45, currentY + 13, { align: 'center' });
  doc.text(`group dan Nama CCR)`, pageWidth - 45, currentY + 18, { align: 'center' });

  currentY += 30;
  doc.text("(..................................)", pageWidth - 45, currentY, { align: 'center' });

  // Save PDF
  const fileName = `Laporan_Setting_Fleet_${type}_${format(now, 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(fileName);
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
    { content: 'Total Dumptruck', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
    ...Object.values(totals).map(val => ({ content: val, styles: { fontStyle: 'bold' } }))
  ]);
  
  return { rows };
}