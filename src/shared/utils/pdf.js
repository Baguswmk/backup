import QRCode from "qrcode";
import bukitAsamLogo from "/logo_ptba.png"

export const generateRitasePDF = async (data, supervisorName) => {
  const {
    unit_exca,
    company,
    loading_location,
    dumping_location,
    ritases,
    totalTonase,
    pic_work_unit,
  } = data;

  // Validasi data
  if (!ritases || ritases.length === 0) {
    throw new Error("Tidak ada data ritase untuk digenerate PDF");
  }

  // Ambil data dari ritase pertama untuk informasi umum
  const firstRitase = ritases[0];
  const date = firstRitase.date;
  const shift = firstRitase.shift;
  
  // ✅ Ambil checker dari ritase pertama
  const checker = firstRitase.checker || "Checker";

  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Group ritases by truck
  const groupedData = {};

  ritases.forEach((ritase) => {
    const truck = ritase.unit_dump_truck;
    const createdAtDate = new Date(ritase.created_at);
    const hour = createdAtDate.getHours();
    const time = createdAtDate.toLocaleTimeString("id-ID", {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    if (!groupedData[truck]) {
      groupedData[truck] = {
        company: ritase.company,
        driver: ritase.driver || "Driver",
        hourlyData: {},
      };
    }

    if (!groupedData[truck].hourlyData[hour]) {
      groupedData[truck].hourlyData[hour] = [];
    }

    groupedData[truck].hourlyData[hour].push({
      weight: ritase.net_weight,
      time: time,
    });
  });

  // Tentukan jam berdasarkan shift
  let hours = [];
  if (shift.includes("Shift 1") || shift.includes("1")) {
    hours = [22, 23, 0, 1, 2, 3, 4, 5];
  } else if (shift.includes("Shift 2") || shift.includes("2")) {
    hours = [6, 7, 8, 9, 10, 11, 12, 13];
  } else if (shift.includes("Shift 3") || shift.includes("3")) {
    hours = [14, 15, 16, 17, 18, 19, 20, 21];
  } else {
    hours = [6, 7, 8, 9, 10, 11, 12, 13];
  }

  // Calculate hourly totals
  const hourlyTotals = {};
  hours.forEach((hour) => {
    hourlyTotals[hour] = { tonnage: 0, ritCount: 0 };
  });

  Object.values(groupedData).forEach((truckData) => {
    Object.entries(truckData.hourlyData).forEach(([hour, ritasesList]) => {
      const hourNum = parseInt(hour);
      ritasesList.forEach((r) => {
        if (hourlyTotals[hourNum] !== undefined) {
          hourlyTotals[hourNum].tonnage += r.weight;
          hourlyTotals[hourNum].ritCount += 1;
        }
      });
    });
  });

  // Data untuk QR Code
  const mitraName = company;
  const supervisor = supervisorName || "SUPERVISOR";

  // Generate QR Codes untuk tanda tangan
  const checkerQR = await QRCode.toDataURL(checker, {
    width: 400,
    margin: 1,
  });

  const mitraQR = await QRCode.toDataURL(mitraName, {
    width: 400,
    margin: 1,
  });

  const supervisorQR = await QRCode.toDataURL(supervisor, {
    width: 400,
    margin: 1,
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    
    .header {
      position: relative;
      margin-bottom: 15px;
      border-bottom: 2px solid #4A90E2;
      padding-bottom: 10px;
    }
    
    .logo {
      position: absolute;
      top: 0;
      right: 0;
      width: 240px;
      height: auto;
    }
    
    .header-content {
      padding-right: 140px;
    }
    
    .header h1 {
      font-size: 16pt;
      margin: 5px 0;
      font-weight: bold;
      color: #333;
    }
    
    .header h2 {
      font-size: 13pt;
      margin: 3px 0;
      font-weight: bold;
      color: #4A90E2;
    }
    
    .info-section {
      margin-bottom: 10px;
      font-size: 9pt;
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
    }
    
    .info-row {
      margin: 3px 0;
      display: flex;
    }
    
    .info-row strong {
      min-width: 120px;
      color: #555;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8pt;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 5px 6px;
      text-align: center;
      vertical-align: top;
    }
    
    th {
      background-color: #4A90E2;
      color: white;
      font-weight: bold;
      font-size: 8pt;
    }
    
    .truck-cell {
      text-align: left;
      font-weight: bold;
      background-color: #f8f9fa;
    }
    
    .time-cell {
      font-size: 7pt;
      color: #666;
    }
    
    .driver-cell {
      font-size: 7pt;
      color: #333;
      font-weight: 500;
    }
    
    .total-row {
      font-weight: bold;
      background-color: #e3f2fd;
    }
    
    .total-row td {
      font-weight: bold;
      border-top: 2px solid #4A90E2;
    }
    
    .footer {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      page-break-inside: avoid;
      border-top: 2px solid #ddd;
      padding-top: 15px;
    }
    
    .signature-box {
      text-align: center;
      min-width: 150px;
      max-width: 200px;
    }
    
    .signature-box .role {
      font-weight: bold;
      margin-bottom: 8px;
      color: #555;
    }
    
    .signature-qr {
      width: 80px;
      height: 80px;
      margin: 8px auto;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .signature-name {
      margin-top: 8px;
      padding-top: 5px;
      border-top: 1px solid #333;
      font-weight: bold;
      color: #333;
    }
    
    .page-number {
      text-align: right;
      font-size: 8pt;
      margin-top: 10px;
      color: #666;
    }
    
    tbody tr:hover {
      background-color: #f5f5f5;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${bukitAsamLogo}" alt="Bukit Asam" class="logo" />
    <div class="header-content">
      <h1>Laporan Ritase Dump Truck</h1>
      <h2>${unit_exca}</h2>
    </div>
  </div>
  
  <div class="info-section">
    <div class="info-row"><strong>Tanggal:</strong> <span>${formattedDate}</span></div>
    <div class="info-row"><strong>Shift:</strong> <span>${shift}</span></div>
    <div class="info-row"><strong>PIC Unit Kerja:</strong> <span>${pic_work_unit}</span></div>
    <div class="info-row"><strong>Mitra:</strong> <span>${company}</span></div>
    <div class="info-row"><strong>Loading Point:</strong> <span>${loading_location}</span></div>
    <div class="info-row"><strong>Dumping Point:</strong> <span>${dumping_location}</span></div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">No.</th>
        <th style="width: 120px;">Dump Truck</th>
        ${hours.map((hour) => `<th style="width: 80px;">${String(hour).padStart(2, "0")}:00</th>`).join("")}
        <th style="width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(groupedData)
        .map(([truck, truckData], idx) => {
          let total = 0;

          const cells = hours
            .map((hour) => {
              const hourData = truckData.hourlyData[hour] || [];
              if (hourData.length === 0) return "<td>-</td>";

              return `<td>${hourData
                .map((r) => {
                  total += r.weight;
                  return `<strong>${r.weight.toFixed(2)}</strong><br><span class="time-cell">${r.time}</span><br><span class="driver-cell">${truckData.driver}</span>`;
                })
                .join("<br><br>")}</td>`;
            })
            .join("");

          return `
          <tr>
            <td>${idx + 1}</td>
            <td class="truck-cell"><strong>${truck}</strong><br><span style="font-size: 7pt; font-weight: normal; color: #666;">${truckData.company}</span></td>
            ${cells}
            <td style="background-color: #fff3cd;"><strong>${total.toFixed(2)} Ton</strong></td>
          </tr>
        `;
        })
        .join("")}
      
      <tr class="total-row">
        <td colspan="2" style="text-align: center;"><strong>TOTAL KESELURUHAN</strong></td>
        ${hours
          .map((hour) => {
            const data = hourlyTotals[hour] || { tonnage: 0, ritCount: 0 };
            if (data.ritCount === 0) return '<td>-</td>';
            return `<td><strong>${data.tonnage.toFixed(2)}</strong><br><span style="font-size: 7pt;">(${data.ritCount} Rit)</span></td>`;
          })
          .join("")}
        <td style="background-color: #c8e6c9;"><strong>${totalTonase.toFixed(2)} Ton</strong><br><span style="font-size: 7pt;">(${ritases.length} Ritase)</span></td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    <div class="signature-box">
      <div class="role">Checker</div>
      <img src="${checkerQR}" alt="QR Checker" class="signature-qr" />
      <div class="signature-name">${checker}</div>
    </div>
    <div class="signature-box">
      <div class="role">Mitra</div>
      <img src="${mitraQR}" alt="QR Mitra" class="signature-qr" />
      <div class="signature-name">${mitraName}</div>
    </div>
    <div class="signature-box">
      <div class="role">Supervisor Rehandling</div>
      <img src="${supervisorQR}" alt="QR Supervisor" class="signature-qr" />
      <div class="signature-name">${supervisor}</div>
    </div>
  </div>
  
  <div class="page-number">
    ${unit_exca} | ${formattedDate} | ${shift} | Halaman 1 dari 1
  </div>
</body>
</html>
  `;

  return htmlContent;
};

export const exportToPDF = async (rowData, supervisorName) => {
  
  try {
    // Validasi data
    if (!rowData || !rowData.ritases || rowData.ritases.length === 0) {
      throw new Error("Data ritase tidak tersedia atau kosong");
    }

    const htmlContent = await generateRitasePDF({
      unit_exca: rowData.unit_exca,
      company: rowData.company,
      loading_location: rowData.loading_location,
      dumping_location: rowData.dumping_location,
      ritases: rowData.ritases,
      totalTonase: rowData.totalTonase,
      pic_work_unit: rowData.pic_work_unit,
    }, supervisorName);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Popup diblokir. Silakan izinkan popup untuk situs ini.");
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    return true;
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    throw error;
  }
};

export const generateKertasCheckerPDF = async (data, params) => {
  const {
    shiftName,
    startHour,
    endHour,
    timeSlots,
    groupedData,
    dumpTrucks,
    truckTotals,
    timeSlotTotals,
    grandTotal,
  } = params;

  // Validasi data
  if (!data || !data.trips || data.trips.length === 0) {
    throw new Error("Tidak ada data ritase untuk digenerate PDF");
  }

  // Format tanggal
  let formattedDate = "Unknown Date";
  try {
    if (data.date) {
      const dateObj = new Date(data.date);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    } else if (data.trips && data.trips.length > 0) {
      // Ambil tanggal dari trip pertama jika data.date tidak ada
      const dateObj = new Date(data.trips[0].time);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }

  // Generate QR Codes untuk tanda tangan
  const checker = "Checker"; // Bisa diambil dari data jika ada
  const mitra = data.company || "Mitra";
  const supervisor = "Supervisor";

  const checkerQR = await QRCode.toDataURL(checker, {
    width: 400,
    margin: 1,
  });

  const mitraQR = await QRCode.toDataURL(mitra, {
    width: 400,
    margin: 1,
  });

  const supervisorQR = await QRCode.toDataURL(supervisor, {
    width: 400,
    margin: 1,
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    
    .header {
      position: relative;
      margin-bottom: 15px;
      border-bottom: 2px solid #4A90E2;
      padding-bottom: 10px;
    }
    
    .logo {
      position: absolute;
      top: 0;
      right: 0;
      width: 240px;
      height: auto;
    }
    
    .header-content {
      padding-right: 140px;
    }
    
    .header h1 {
      font-size: 16pt;
      margin: 5px 0;
      font-weight: bold;
      color: #333;
    }
    
    .header h2 {
      font-size: 13pt;
      margin: 3px 0;
      font-weight: bold;
      color: #4A90E2;
    }
    
    .info-section {
      margin-bottom: 10px;
      font-size: 9pt;
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
    }
    
    .info-row {
      margin: 3px 0;
      display: flex;
    }
    
    .info-row strong {
      min-width: 140px;
      color: #555;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8pt;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 5px 6px;
      text-align: center;
      vertical-align: top;
    }
    
    th {
      background-color: #4A90E2;
      color: white;
      font-weight: bold;
      font-size: 8pt;
    }
    
    .no-cell {
      width: 30px;
      text-align: center;
    }
    
    .truck-cell {
      text-align: left;
      font-weight: bold;
      background-color: #f8f9fa;
      width: 120px;
    }
    
    .time-cell {
      font-size: 7pt;
      color: #666;
    }
    
    .weight-cell {
      font-size: 7pt;
      color: #333;
      font-weight: 500;
    }
    
    .total-row {
      font-weight: bold;
      background-color: #e3f2fd;
    }
    
    .total-row td {
      font-weight: bold;
      border-top: 2px solid #4A90E2;
    }
    
    .footer {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      page-break-inside: avoid;
      border-top: 2px solid #ddd;
      padding-top: 15px;
    }
    
    .signature-box {
      text-align: center;
      min-width: 150px;
      max-width: 200px;
    }
    
    .signature-box .role {
      font-weight: bold;
      margin-bottom: 8px;
      color: #555;
    }
    
    .signature-qr {
      width: 80px;
      height: 80px;
      margin: 8px auto;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .signature-name {
      margin-top: 8px;
      padding-top: 5px;
      border-top: 1px solid #333;
      font-weight: bold;
      color: #333;
    }
    
    .page-number {
      text-align: right;
      font-size: 8pt;
      margin-top: 10px;
      color: #666;
    }
    
    tbody tr:hover {
      background-color: #f5f5f5;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${bukitAsamLogo}" alt="Bukit Asam" class="logo" />
    <div class="header-content">
      <h1>Kertas Checker - Detail Ritase</h1>
      <h2>${data.excavator}</h2>
    </div>
  </div>
  
  <div class="info-section">
    <div class="info-row"><strong>Tanggal:</strong> <span>${formattedDate}</span></div>
    <div class="info-row"><strong>Shift:</strong> <span>${shiftName} (${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00)</span></div>
    <div class="info-row"><strong>Excavator:</strong> <span>${data.excavator}</span></div>
    <div class="info-row"><strong>Loading Point:</strong> <span>${data.loading_location}</span></div>
    <div class="info-row"><strong>Dumping Point:</strong> <span>${data.dumping_location}</span></div>
    <div class="info-row"><strong>Measurement Type:</strong> <span>${data.measurement_type}</span></div>
    <div class="info-row"><strong>Total Ritase:</strong> <span>${data.tripCount} rit</span></div>
    <div class="info-row"><strong>Total Tonase:</strong> <span>${data.totalWeight} ton</span></div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th class="no-cell">No.</th>
        <th class="truck-cell">Dump Truck</th>
        ${timeSlots.map((slot) => `<th style="width: 70px;">${slot}</th>`).join("")}
        <th style="width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${dumpTrucks
        .map((truckId, idx) => {
          const cells = timeSlots
            .map((timeSlot) => {
              const trips = groupedData[truckId][timeSlot] || [];
              if (trips.length === 0) return "<td>-</td>";

              return `<td>${trips
                .map((trip) => {
                  let timeStr = "-";
                  try {
                    const tripDate = new Date(trip.time);
                    if (!isNaN(tripDate.getTime())) {
                      timeStr = tripDate.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    }
                  } catch (e) {
                    console.error("Invalid date:", trip.time);
                  }
                  return `<strong class="weight-cell">${trip.weight} ton</strong><br><span class="time-cell">${timeStr}</span>`;
                })
                .join("<br><br>")}</td>`;
            })
            .join("");

          return `
          <tr>
            <td class="no-cell">${idx + 1}</td>
            <td class="truck-cell"><strong>${truckId}</strong></td>
            ${cells}
            <td style="background-color: #fff3cd;"><strong>${truckTotals[truckId].weight.toFixed(2)} Ton</strong><br><span style="font-size: 7pt;">(${truckTotals[truckId].count} rit)</span></td>
          </tr>
        `;
        })
        .join("")}
      
      <tr class="total-row">
        <td colspan="2" style="text-align: center;"><strong>TOTAL</strong></td>
        ${timeSlots
          .map((timeSlot) => {
            const slotData = timeSlotTotals[timeSlot] || { weight: 0, count: 0 };
            if (slotData.count === 0) return '<td>-</td>';
            return `<td><strong>${slotData.weight.toFixed(2)} Ton</strong><br><span style="font-size: 7pt;">(${slotData.count} Rit)</span></td>`;
          })
          .join("")}
        <td style="background-color: #c8e6c9;"><strong>${grandTotal.weight.toFixed(2)} Ton</strong><br><span style="font-size: 7pt;">(${grandTotal.count} rit)</span></td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    <div class="signature-box">
      <div class="role">Checker</div>
      <img src="${checkerQR}" alt="QR Checker" class="signature-qr" />
      <div class="signature-name">${checker}</div>
    </div>
    <div class="signature-box">
      <div class="role">Mitra</div>
      <img src="${mitraQR}" alt="QR Mitra" class="signature-qr" />
      <div class="signature-name">${mitra}</div>
    </div>
    <div class="signature-box">
      <div class="role">Supervisor</div>
      <img src="${supervisorQR}" alt="QR Supervisor" class="signature-qr" />
      <div class="signature-name">${supervisor}</div>
    </div>
  </div>
  
  <div class="page-number">
    ${data.excavator} | ${formattedDate} | ${shiftName} | Halaman 1 dari 1
  </div>
</body>
</html>
  `;

  return htmlContent;
};

export const exportKertasCheckerPDF = async (data, params) => {
  try {
    // Validasi data
    if (!data || !data.trips || data.trips.length === 0) {
      throw new Error("Data ritase tidak tersedia atau kosong");
    }

    const htmlContent = await generateKertasCheckerPDF(data, params);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Popup diblokir. Silakan izinkan popup untuk situs ini.");
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    return true;
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    throw error;
  }
};