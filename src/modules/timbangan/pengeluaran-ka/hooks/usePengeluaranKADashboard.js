import { useMemo } from "react";

/**
 * Perform all dashboard aggregations dynamically / offline from Laporan raw data.
 * @param {Array} filteredData - the Array of strictly filtered row data (1 row = 1 rangkaian)
 */
export function getDashboardStats(filteredData = []) {
  let totalTonnage = 0;
  let totalWagons = 0;
  let totalCount = filteredData.length; // total rangkaian

  let totalDuration = 0;
  let durationCount = 0;
  let maxTon = 0;
  let minTon = Infinity;
  let maxDur = 0;
  let minDur = Infinity;

  const tlsMap = {};
  const dailyMap = {};
  const productMap = {};

  filteredData.forEach(r => {
    const t = Number(r.totalTonnage) || 0;
    const w = Array.isArray(r.carriages) ? r.carriages.length : 0;
    const dur = Number(r.durationMinutes) || 0;

    totalTonnage += t;
    totalWagons += w;

    if (dur > 0) {
      totalDuration += dur;
      durationCount += 1;
    }

    if (t > maxTon) maxTon = t;
    if (t > 0 && t < minTon) minTon = t;
    if (dur > maxDur) maxDur = dur;
    if (dur > 0 && dur < minDur) minDur = dur;

    // TLS grouping
    const tls = r.tlsLocation || r.origin || "Unknown";
    if (!tlsMap[tls]) {
      tlsMap[tls] = { tls, tonnage: 0, count: 0, totalWagons: 0 };
    }
    tlsMap[tls].tonnage += t;
    tlsMap[tls].count += 1;
    tlsMap[tls].totalWagons += w;

    // Daily grouping
    let dateStr = "Unknown";
    let dStr = r.startTime;
    if (dStr) {
      const d = new Date(dStr);
      if (!isNaN(d.getTime())) {
         dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }
    
    if (!dailyMap[dateStr]) dailyMap[dateStr] = { dateStr, tonnage: 0, count: 0 };
    dailyMap[dateStr].tonnage += t;
    dailyMap[dateStr].count += 1;

    // Product grouping (read strictly from carriages array for accurate product counts)
    if (Array.isArray(r.carriages) && r.carriages.length > 0) {
       r.carriages.forEach(c => {
         const p = c.coal_type || "Unknown";
         const cw = Number(c.load_weight) || 0;
         if (!productMap[p]) productMap[p] = { product: p, tonnage: 0 };
         productMap[p].tonnage += cw;
       });
    } else if (r.product) {
       // fallback if no carriages 
       const p = r.product;
       if (!productMap[p]) productMap[p] = { product: p, tonnage: 0 };
       productMap[p].tonnage += t; // count entire train weight if no gerbong details
    }
  });

  const statTotal = { totalTonnage, totalCount, totalWagons };
  const tlsList = Object.values(tlsMap).sort((a, b) => b.tonnage - a.tonnage);
  
  // dailyArr sorting to make sure charts draw chronologically
  const dailyArr = Object.values(dailyMap)
    .filter(d => d.dateStr !== "Unknown")
    .sort((a,b) => a.dateStr.localeCompare(b.dateStr));
  
  let maxRng = 0, minRng = Infinity, sumRng = 0;
  dailyArr.forEach(d => {
    if (d.count > maxRng) maxRng = d.count;
    if (d.count < minRng) minRng = d.count;
    sumRng += d.count;
  });
  
  const avgKA = dailyArr.length > 0 ? parseFloat((sumRng / dailyArr.length).toFixed(2)) : 0;
  const avgDurasi = durationCount > 0 ? parseFloat((totalDuration / durationCount).toFixed(2)) : 0;
  const avgTonase = totalCount > 0 ? parseFloat((totalTonnage / totalCount).toFixed(2)) : 0;

  const kpiData = {
    avgTonase,
    avgDurasi,
    avgKA,
    maxTon: totalCount > 0 ? maxTon : 0,
    minTon: totalCount > 0 && minTon !== Infinity ? minTon : 0,
    maxDur: durationCount > 0 ? maxDur : 0,
    minDur: durationCount > 0 && minDur !== Infinity ? minDur : 0,
    maxRng: dailyArr.length > 0 ? maxRng : 0,
    minRng: dailyArr.length > 0 && minRng !== Infinity ? minRng : 0,
  };

  const chartData = dailyArr.map(d => {
    // format to "DD/MM" as required by dashboard UI
    const [y, m, day] = d.dateStr.split("-");
    const formattedDay = `${day}/${m}`;
    return {
      day: formattedDay,
      tonnage: d.tonnage,
      count: d.count
    };
  });

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.tonnage - a.tonnage)
    .map(p => [p.product, p.tonnage]);

  return { statTotal, tlsList, kpiData, topProducts, chartData };
}

/**
 * Memoized hook to perform offline aggregation.
 * No longer hits API directly.
 */
export function usePengeluaranKADashboardStats(filteredData) {
  return useMemo(() => getDashboardStats(filteredData), [filteredData]);
}

