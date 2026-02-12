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
    orientation: "portrait",
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

  // ========== HEADER SECTION ==========
  // Draw top border line
  doc.setLineWidth(0.5);
  doc.line(10, 10, pageWidth - 10, 10);
  
  // Logo (left)
  doc.addImage(BUKIT_ASAM_LOGO, "PNG", 12, 13, 35, 7);
  
  // Title (center)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const title = `LAPORAN SETTING FLEET ${type?.toUpperCase() || 'COAL REHANDLING'} REALTIME`;
  doc.text(title, pageWidth / 2, 18, { align: "center" });
  
  // Document info box (right)
  const docInfoX = pageWidth - 40;
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text(`No. Dok`, docInfoX, 14);
  doc.text(`: BAMSF`, docInfoX + 15, 14);
  doc.text(`No. Rev`, docInfoX, 18);
  doc.text(`: 0`, docInfoX + 15, 18);
  doc.text(`Halaman`, docInfoX, 22);
  doc.text(`: 1 dari 1`, docInfoX + 15, 22);
  
  // Draw bottom border of header
  doc.line(10, 25, pageWidth - 10, 25);

  // ========== INFO SECTION ==========
  let infoY = 28;
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  
  // Left column
  const col1X = 12;
  const col1LabelWidth = 20;
  doc.text(`Hari`, col1X, infoY);
  doc.text(`: ${day}`, col1X + col1LabelWidth, infoY);
  
  doc.text(`Tanggal`, col1X, infoY + 2);
  doc.text(`: ${date}`, col1X + col1LabelWidth, infoY + 2);
  
  doc.text(`Shift`, col1X, infoY + 4);
  doc.text(`: ${shift}`, col1X + col1LabelWidth, infoY + 4);
  
  doc.text(`Jam`, col1X, infoY + 6);
  doc.text(`: ${time}`, col1X + col1LabelWidth, infoY + 6);
  
  // Right column
  const col2X = pageWidth / 2 + 10;
  const col2LabelWidth = 35;
  doc.text(`Group`, col2X, infoY);
  doc.text(`: A`, col2X + col2LabelWidth, infoY);
  
  doc.text(`Satker`, col2X, infoY + 2);
  doc.text(`: ${selectedSatker || 'PAB'}`, col2X + col2LabelWidth, infoY + 2);
  
  doc.text(`Urutkan Berdasarkan`, col2X, infoY + 4);
  doc.text(`: ${selectedUrutkan === 'dumping' ? 'Dumping Point' : selectedUrutkan === 'mitra' ? 'Mitra' : 'Loading Point'}`, col2X + col2LabelWidth, infoY + 4);

  // ========== SECTION 1: SETTING FLEET ==========
  let currentY = infoY + 8;
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("1. Setting Fleet", 12, currentY);
  
  currentY += 2;

  // Group data by area (based on loading/dumping location keywords)
  const groupedByArea = groupFleetDataByArea(fleetData);
  
  // Calculate grand totals
  let grandTotalTronton = 0;
  let grandTotalTrintin = 0;
  let grandTotalFleets = 0;

  // Process each area group
  for (const [areaName, areaFleets] of Object.entries(groupedByArea)) {
    // Area header
    doc.setFontSize(5);
    doc.setFont("helvetica", "bold");
    doc.text(`Lokasi ${areaName}`, 12, currentY);
    currentY += 1;

    const tableData = [];
    let areaTotalTronton = 0;
    let areaTotalTrintin = 0;
    let areaTotalFleets = 0;
    let rowNum = 1;

    // Group fleets by mitra within this area
    const groupedByMitra = {};
    areaFleets.forEach((fleet) => {
      const mitra = fleet.excavatorCompany || "Unknown";
      if (!groupedByMitra[mitra]) {
        groupedByMitra[mitra] = [];
      }
      groupedByMitra[mitra].push(fleet);
    });

    // Process each mitra group
    for (const [mitraName, mitraFleets] of Object.entries(groupedByMitra)) {
      let mitraTotalTronton = 0;
      let mitraTotalTrintin = 0;
      let mitraTotalFleets = mitraFleets.length;

      // Add all fleets for this mitra
      mitraFleets.forEach((fleet) => {
        const tronton = fleet.units?.filter(u => {
          const unitType = u.type_dt?.toLowerCase() || '';
          return unitType.includes('tronton');
        }).length || 0;
        
        const trintin = fleet.units?.filter(u => {
          const unitType = u.type_dt?.toLowerCase() || '';
          return unitType.includes('trintin');
        }).length || 0;
        
        mitraTotalTronton += tronton;
        mitraTotalTrintin += trintin;
        
        tableData.push([
          rowNum++,
          fleet.excavator || "-",
          fleet.loadingLocation || "-",
          fleet.dumpingLocation || "-",
          fleet.distance || "-",
          fleet.excavatorCompany || "-",
          fleet.measurementType || "-",
          fleet.coalType || "-",
          tronton || 0,
          trintin || 0,
          (tronton + trintin) || 0  
        ]);
      });

      areaTotalTronton += mitraTotalTronton;
      areaTotalTrintin += mitraTotalTrintin;
      areaTotalFleets += mitraTotalFleets;
    }

    // Add total row for each mitra
    for (const [mitraName, mitraFleets] of Object.entries(groupedByMitra)) {
      let mitraTotalTronton = 0;
      let mitraTotalTrintin = 0;
      
      mitraFleets.forEach((fleet) => {
        const tronton = fleet.units?.filter(u => {
          const unitType = u.type_dt?.toLowerCase() || '';
          return unitType.includes('tronton');
        }).length || 0;
        
        const trintin = fleet.units?.filter(u => {
          const unitType = u.type_dt?.toLowerCase() || '';
          return unitType.includes('trintin');
        }).length || 0;
        
        mitraTotalTronton += tronton;
        mitraTotalTrintin += trintin;
      });
      
      tableData.push([
        { content: '', styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } },
        { content: `Jumlah Fleet ${mitraName}`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: mitraFleets.length + ' Fleet', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: 'Total DT', styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240], fontSize: 4.5 } },
        { content: mitraTotalTronton, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: mitraTotalTrintin, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] } }
      ]);
    }

    // Add area total row (after all mitra totals)
    tableData.push([
      { content: '', styles: { fillColor: [220, 220, 220], fontStyle: 'bold' } },
      { content: `Jumlah Fleet ${areaName}`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 220, 220] } },
      { content: areaTotalFleets + ' Fleet', styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220] } },
      { content: 'Total DT', styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220] } },
      { content: areaTotalTronton, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220] } },
      { content: areaTotalTrintin, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220] } }
    ]);

    grandTotalTronton += areaTotalTronton;
    grandTotalTrintin += areaTotalTrintin;
    grandTotalFleets += areaTotalFleets;

    // Draw the table for this area
    autoTable(doc, {
      startY: currentY,
      head: [[
        'No',
        'Alat Loading',
        'Loading Point',
        'Dumping Point',
        'Jarak',
        'Mitra',
        'Ukur',
        'BB',
        'Tron',
        'Trin',
        'Ket'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 4.5,
        cellPadding: 0.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      bodyStyles: {
        fontSize: 4.5,
        textColor: [0, 0, 0],
        halign: 'center',
        cellPadding: 0.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 5, halign: 'center' },
        1: { cellWidth: 18, halign: 'left', fontSize: 4.5 },
        2: { cellWidth: 30, halign: 'left', fontSize: 4.5 },
        3: { cellWidth: 35, halign: 'left', fontSize: 4.5 },
        4: { cellWidth: 10, halign: 'center' },
        5: { cellWidth: 35, halign: 'center', fontSize: 4.5 },
        6: { cellWidth: 15, halign: 'center' },
        7: { cellWidth: 10, halign: 'center' },
        8: { cellWidth: 10, halign: 'center' },
        9: { cellWidth: 10, halign: 'center' },
        10: { cellWidth: 10, halign: 'center' }
      },
      margin: { left: 12, right: 12 },
      didDrawPage: function (data) {
        currentY = data.cursor.y;
      }
    });

    currentY = doc.lastAutoTable.finalY + 3;
    
    // Check if need new page
    if (currentY > pageHeight) {
      doc.addPage();
      currentY = 20;
    }
  }

  // // Add grand total row
  // if (Object.keys(groupedByArea).length > 0) {
  //   const grandTotalData = [[
  //     { content: '', styles: { fillColor: [180, 180, 180], fontStyle: 'bold' } },
  //     { content: `Total Semua Lokasi`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [180, 180, 180] } },
  //     { content: grandTotalFleets + ' Fleet', styles: { halign: 'center', fontStyle: 'bold', fillColor: [180, 180, 180] } },
  //     { content: 'Total DT', styles: { halign: 'center', fontStyle: 'bold', fillColor: [180, 180, 180] } },
  //     { content: grandTotalTronton, styles: { halign: 'center', fontStyle: 'bold', fillColor: [180, 180, 180] } },
  //     { content: grandTotalTrintin, styles: { halign: 'center', fontStyle: 'bold', fillColor: [180, 180, 180] } }
  //   ]];

  //   autoTable(doc, {
  //     startY: currentY,
  //     body: grandTotalData,
  //     theme: 'grid',
  //     bodyStyles: {
  //       fontSize: 6,
  //       fontStyle: 'bold',
  //       cellPadding: 0.5,
  //       lineColor: [0, 0, 0],
  //       lineWidth: 0.1
  //     },
  //     columnStyles: {
  //       0: { cellWidth: 7 },
  //       1: { cellWidth: 20 },
  //       2: { cellWidth: 30 },
  //       3: { cellWidth: 30 },
  //       4: { cellWidth: 10 },
  //       5: { cellWidth: 20 },
  //       6: { cellWidth: 15 },
  //       7: { cellWidth: 10 },
  //       8: { cellWidth: 10 },
  //       9: { cellWidth: 10 },
  //       10: { cellWidth: 10 }
  //     },
  //     margin: { left: 12, right: 12 }
  //   });

  //   currentY = doc.lastAutoTable.finalY + 5;
  // }
  
  // Check if need new page before section 2
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = 20;
  }

  // ========== SECTION 2: STATUS DUMP TRUCK ==========
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("2. Status Dump Truck", 12, currentY);
  currentY += 1;

  const statusData = calculateDumptruckStatus(fleetData);
  
  autoTable(doc, {
    startY: currentY,
    head: [
      [
        { content: 'No', rowSpan: 2 },
        { content: 'Mitra', rowSpan: 2 },
        { content: 'Populasi', colSpan: 2 },
        { content: 'Operasi', colSpan: 2 },
        { content: 'Standby', colSpan: 2 },
        { content: 'BD', colSpan: 2 },
        { content: 'PM', colSpan: 2 },
        { content: 'Total', colSpan: 2 }
      ],
      [
        'Ton', 'Tin',
        'Ton', 'Tin',
        'Ton', 'Tin',
        'Ton', 'Tin',
        'Ton', 'Tin',
        'Ton', 'Tin'
      ]
    ],
    body: statusData.rows,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 4.5,
      cellPadding: 0.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    bodyStyles: {
      fontSize: 4.5,
      halign: 'center',
      cellPadding: 0.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 6 },
      1: { cellWidth: 25, fontSize: 4.5 },
      2: { cellWidth: 9 },
      3: { cellWidth: 9 },
      4: { cellWidth: 9 },
      5: { cellWidth: 9 },
      6: { cellWidth: 9 },
      7: { cellWidth: 9 },
      8: { cellWidth: 9 },
      9: { cellWidth: 9 },
      10: { cellWidth: 9 },
      11: { cellWidth: 9 },
      12: { cellWidth: 9 },
      13: { cellWidth: 9 }
    },
    margin: { left: 12, right: 12 }
  });

  currentY = doc.lastAutoTable.finalY + 5;
  
  // Check if need new page before section 3
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

// ========== SECTION 3: STATUS EXCA TIDAK OPERASI ==========
  const section3StartY = currentY;
  
  doc.setFontSize(5);
  doc.setFont("helvetica", "bold");
  doc.text("3. Status Exca Tidak Operasi", 12, currentY);
  currentY += 1;

  const nonOperationalExca = fleetData.filter(f => 
    f.status === "BREAKDOWN" || f.status === "SERVICE" || f.status === "STANDBY" || f.status === "Standby"
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
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 4.5,
      cellPadding: 0.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    bodyStyles: {
      fontSize: 4.5,
      halign: 'center',
      cellPadding: 0.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { cellWidth: 5 },
      1: { cellWidth: 18, fontSize: 4.5 },
      2: { cellWidth: 35, fontSize: 4.5 },
      3: { cellWidth: 30, fontSize: 4.5 },
      4: { cellWidth: 8 }
    },
    margin: { left: 12, right: 12 },
    tableWidth: 96
  });

  // ========== FOOTER: PETUGAS CCR (DI SAMPING KANAN SECTION 3) ==========
  const footerX = pageWidth - 70;
  const footerY = section3StartY;
  
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.text("Petugas Central Control Room (CCR)", footerX, footerY);
  
  // Draw signature box
  doc.rect(footerX, footerY + 5, 50, 25);
  doc.setFontSize(5);
  doc.text("(................................)", footerX + 25, footerY + 35, { align: 'center' });

  // Save PDF
  const fileName = `Laporan_Setting_Fleet_${type}_${format(now, 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(fileName);
};

// ========== HELPER FUNCTIONS ==========

function groupFleetDataByArea(fleetData) {
  const grouped = {};
  
  fleetData.forEach(fleet => {
    // Extract area name from loading or dumping location
    const location = fleet.loadingLocation || fleet.dumpingLocation || '';
    let areaName = 'Lainnya';
    
    // Check for common area keywords
    if (location.includes('Banko Barat')) {
      areaName = 'Banko Barat';
    } else if (location.includes('Banko Tengah')) {
      areaName = 'Banko Tengah';
    } else if (location.includes('TAL') || (location.includes('MTB'))) {
      areaName = 'TAL && MTB';
    }  else if (location.includes('Pit')) {
      const pitMatch = location.match(/Pit\s+\w+/i);
      if (pitMatch) {
        areaName = pitMatch[0];
      }
    }
    
    if (!grouped[areaName]) {
      grouped[areaName] = [];
    }
    grouped[areaName].push(fleet);
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
      const unitType = unit.type_dt?.toLowerCase() || '';
      const isTronton = unitType.includes('tronton');
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
    { content: 'Total Dumptruck', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 220, 220] } },
    ...Object.values(totals).map(val => ({ content: val, styles: { fontStyle: 'bold', fillColor: [220, 220, 220] } }))
  ]);
  
  return { rows };
}