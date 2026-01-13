export const generateRitasePDF = (data) => {
  // Data yang diperlukan
  const {
    unit_exca,
    company,
    date,
    shift,
    loading_location,
    dumping_location,
    ritases,
    totalTonase,
    distance = '8100 m',
    coalType = 'BTB 53',
    measurement = 'Timbangan',
    location = 'Banko',
    checker = 'Denni Prayoga',
    mitra = 'Agus Hidayat',
    supervisor = 'Nurfajrian Trilaksono',
    remarks = []
  } = data;

  // Format tanggal
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Group ritase by hour and dump truck
  const groupedData = {};
  
  ritases.forEach(ritase => {
    const truck = ritase.unit_dump_truck;
    const hour = new Date(ritase.createdAt).getHours();
    const time = new Date(ritase.createdAt).toLocaleTimeString('id-ID');
    
    if (!groupedData[truck]) {
      groupedData[truck] = {
        company: ritase.company,
        driver: ritase.driver || 'Driver',
        hourlyData: {}
      };
    }
    
    if (!groupedData[truck].hourlyData[hour]) {
      groupedData[truck].hourlyData[hour] = [];
    }
    
    groupedData[truck].hourlyData[hour].push({
      weight: ritase.net_weight,
      time: time
    });
  });

  // Calculate hourly totals
  const hourlyTotals = {};
  for (let hour = 6; hour <= 23; hour++) {
    hourlyTotals[hour] = { tonnage: 0, ritCount: 0 };
  }

  Object.values(groupedData).forEach(truckData => {
    Object.entries(truckData.hourlyData).forEach(([hour, ritases]) => {
      const hourNum = parseInt(hour);
      ritases.forEach(r => {
        if (hourlyTotals[hourNum]) {
          hourlyTotals[hourNum].tonnage += r.weight;
          hourlyTotals[hourNum].ritCount += 1;
        }
      });
    });
  });

  // Generate hours array based on shift
  const isShift1 = shift.includes('LS 1') || shift.includes('Shift 1');
  const hours = isShift1 
    ? [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    : [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

  // Generate HTML content
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
      text-align: center;
      margin-bottom: 15px;
    }
    
    .header h1 {
      font-size: 16pt;
      margin: 5px 0;
      font-weight: bold;
    }
    
    .header h2 {
      font-size: 13pt;
      margin: 3px 0;
      font-weight: bold;
    }
    
    .info-section {
      margin-bottom: 10px;
      font-size: 9pt;
    }
    
    .info-row {
      margin: 2px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8pt;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: center;
    }
    
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    
    .truck-cell {
      text-align: left;
      font-weight: bold;
    }
    
    .time-cell {
      font-size: 7pt;
      color: #333;
    }
    
    .total-row {
      font-weight: bold;
      background-color: #f5f5f5;
    }
    
    .footer {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
    }
    
    .signature-box {
      text-align: center;
      min-width: 150px;
    }
    
    .signature-line {
      margin-top: 50px;
      border-top: 1px solid #000;
      padding-top: 5px;
    }
    
    .remarks {
      margin-top: 15px;
      font-size: 8pt;
    }
    
    .page-number {
      text-align: right;
      font-size: 8pt;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Laporan Ritase</h1>
    <h2>${unit_exca}_${company}</h2>
  </div>
  
  <div class="info-section">
    <div class="info-row"><strong>Tanggal:</strong> ${formattedDate} (${shift.split('(')[0].trim()})</div>
    <div class="info-row"><strong>Lokasi Ops:</strong> ${location}</div>
    <div class="info-row"><strong>Loading Point:</strong> ${loading_location}</div>
    <div class="info-row"><strong>Dumping Point:</strong> ${dumping_location}</div>
    <div class="info-row"><strong>Pengukuran:</strong> ${measurement} | <strong>Jarak:</strong> ${distance} | <strong>Jenis Batubara:</strong> ${coalType}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>No.</th>
        <th>Dump Truck</th>
        ${hours.map(hour => `<th>${String(hour).padStart(2, '0')}:00</th>`).join('')}
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(groupedData).map(([truck, truckData], idx) => {
        let total = 0;
        
        const cells = hours.map(hour => {
          const hourData = truckData.hourlyData[hour] || [];
          if (hourData.length === 0) return '<td>-</td>';
          
          return `<td>${hourData.map(r => {
            total += r.weight;
            return `${r.weight.toFixed(2)}<br><span class="time-cell">(${r.time})</span><br>[${truckData.driver}]`;
          }).join('<br>')}</td>`;
        }).join('');
        
        return `
          <tr>
            <td>${idx + 1}</td>
            <td class="truck-cell">${truck}<br>${truckData.company}</td>
            ${cells}
            <td><strong>${total.toFixed(2)} Ton</strong></td>
          </tr>
        `;
      }).join('')}
      
      <tr class="total-row">
        <td colspan="2">TOTAL</td>
        ${hours.map(hour => {
          const data = hourlyTotals[hour] || { tonnage: 0, ritCount: 0 };
          return `<td>${data.tonnage.toFixed(2)} Ton<br>(${data.ritCount} Rit)</td>`;
        }).join('')}
        <td><strong>${totalTonase.toFixed(2)} Ton<br>(${ritases.length} Rit)</strong></td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    <div class="signature-box">
      <div>Checker</div>
      <div class="signature-line">(${checker})</div>
    </div>
    <div class="signature-box">
      <div>Mitra</div>
      <div class="signature-line">(${mitra})</div>
    </div>
    <div class="signature-box">
      <div>Supervisor Rehandling</div>
      <div class="signature-line">(${supervisor})</div>
    </div>
  </div>
  
  ${remarks.length > 0 ? `
    <div class="remarks">
      <strong>Remarks:</strong><br>
      ${remarks.map(r => `[${r.title}] - [${r.time}] - ${r.description}`).join('<br>')}
    </div>
  ` : ''}
  
  <div class="page-number">
    ${unit_exca}_${company} / ${formattedDate} / ${shift.split('(')[0].trim()} Hlm. 1 - 1
  </div>
</body>
</html>
  `;

  return htmlContent;
};

export const exportToPDF = (rowData) => {
  try {
    // Generate HTML content
    const htmlContent = generateRitasePDF({
      unit_exca: rowData.unit_exca,
      company: rowData.ritases[0]?.company || 'Unknown',
      date: rowData.ritases[0]?.date || new Date().toISOString().split('T')[0],
      shift: rowData.ritases[0]?.shift || 'Shift 1',
      loading_location: rowData.loading_location,
      dumping_location: rowData.dumping_location,
      ritases: rowData.ritases,
      totalTonase: rowData.totalTonase,
      remarks: []
    });
    
    // Create a new window with the HTML content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};