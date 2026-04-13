import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/shared/utils/number";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-md rounded-md text-sm">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-medium">
            {entry.name}: {formatNumber(entry.value)}
            {entry.name === "%" ? "%" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Progress Circle Component
const CircularProgress = ({ percentage, color = "#3b82f6" }) => {
  const sqSize = 50;
  const strokeWidth = 4;
  const radius = (sqSize - strokeWidth) / 2;
  const viewBox = `0 0 ${sqSize} ${sqSize}`;
  const dashArray = radius * Math.PI * 2;
  const dashOffset = dashArray - dashArray * percentage / 100;

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg width={sqSize} height={sqSize} viewBox={viewBox} className="transform -rotate-90">
        <circle
          className="fill-none stroke-slate-200 dark:stroke-slate-700"
          cx={sqSize / 2}
          cy={sqSize / 2}
          r={radius}
          strokeWidth={`${strokeWidth}px`}
        />
        <circle
          className="fill-none transition-all duration-1000 ease-in-out"
          cx={sqSize / 2}
          cy={sqSize / 2}
          r={radius}
          strokeWidth={`${strokeWidth}px`}
          stroke={color}
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute text-xs font-bold text-slate-700 dark:text-slate-200">
        {Math.round(percentage)}%
      </div>
    </div>
  );
};

export const KinerjaMonthlyTrend = ({ 
  data = null, 
  loading = false, 
  title = "Statistik Tahunan", 
  colorTheme = "blue" // "blue" | "orange"
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 h-[400px] flex items-center justify-center">
         <div className="animate-pulse text-slate-500 font-medium">Memuat data bulanan...</div>
      </div>
    );
  }

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 h-[400px] flex flex-col">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-4">{title}</h3>
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Tidak ada data trend bulanan
        </div>
      </div>
    );
  }

  // Siapkan data chart (gabung dengan MONTHS supaya Jan-Dec selalu ada)
  const chartData = MONTHS.map((m, index) => {
    const monthNum = index + 1;
    const item = data.items.find(d => d.month === monthNum);
    return {
      monthName: m,
      realisasi_ton: item?.realisasi_ton || 0,
      target_ton: item?.target_ton || 0,
      persentase: item?.persentase || 0,
    };
  });

  const summary = data.summary || { total_target_ton: 0, total_realisasi_ton: 0, persentase: 0 };
  const maxPercent = Math.max(...chartData.map(d => d.persentase), 100);

  // Set warna berdasar tema
  const isBlue = colorTheme === "blue";
  const barColor = isBlue ? "#38bdf8" : "#fbbf24"; // sky-400 or amber-400
  const lineColor = isBlue ? "#0284c7" : "#ea580c"; // sky-600 or orange-600
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{title}</h3>
      </div>

      <div className="flex-1 w-full h-[250px] min-h-0 relative">
        {/* tulisan "Kiloton" nyamping (sebagai custom yAxis label) */}
        <div className="absolute -left-2 top-1/2 -rotate-90 text-xs text-slate-400 font-medium z-10 hidden sm:block">
           Kiloton
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: 10 }} // margin left ditambah untuk tulisan kiloton
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
               dataKey="monthName" 
               tickLine={false}
               axisLine={false}
               tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis 
               yAxisId="left" 
               tickFormatter={(value) => formatNumber(value)}
               tick={{ fill: '#64748b', fontSize: 11 }}
               axisLine={false}
               tickLine={false}
               width={50}
            />
            <YAxis 
               yAxisId="right" 
               orientation="right"
               domain={[0, maxPercent + 20]}
               hide
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Bar 
               yAxisId="left" 
               dataKey="realisasi_ton" 
               name="Realisasi" 
               fill={barColor} 
               barSize={24} 
               radius={[2, 2, 0, 0]}
            />
            <Line 
               yAxisId="right" 
               type="monotone" 
               dataKey="target_ton" 
               name="Target" 
               stroke={lineColor} 
               strokeWidth={2}
               dot={{ r: 4, fill: lineColor }} 
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabel Rincian Data */}
      <div className="w-full overflow-x-auto border-t border-slate-200 dark:border-slate-700 mt-2">
        <table className="w-full text-[10px] sm:text-xs text-center border-collapse">
          <tbody>
             <tr className="bg-slate-50 dark:bg-slate-800/50">
               <td className="p-1 border-r border-slate-100 dark:border-slate-700 text-left font-medium w-16">Realisasi</td>
               {chartData.map((col, idx) => (
                  <td key={`r-${idx}`} className="p-1 border-r border-slate-100 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-300">
                     {col.realisasi_ton > 0 ? formatNumber(col.realisasi_ton) : "-"}
                  </td>
               ))}
             </tr>
             <tr>
               <td className="p-1 border-r border-slate-100 dark:border-slate-700 text-left font-medium text-blue-600 dark:text-blue-400 line-through">Target</td>
               {chartData.map((col, idx) => (
                  <td key={`t-${idx}`} className="p-1 border-r border-slate-100 dark:border-slate-700 text-slate-500">
                     {col.target_ton > 0 ? formatNumber(col.target_ton) : "-"}
                  </td>
               ))}
             </tr>
             <tr className="bg-slate-50 dark:bg-slate-800/50">
               <td className="p-1 border-r border-slate-100 dark:border-slate-700 text-left font-medium">%</td>
               {chartData.map((col, idx) => (
                  <td key={`p-${idx}`} className="p-1 border-r border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                     {col.persentase > 0 ? `${col.persentase}%` : "0%"}
                  </td>
               ))}
             </tr>
          </tbody>
        </table>
      </div>

      {/* Summary YTD Section at the bottom */}
      <div className="mt-4 pt-3 flex items-center justify-between border-t-2 border-slate-200 dark:border-slate-700">
         <div className="flex-1 pr-4">
            <div className="flex justify-between items-center mb-1">
               <span className="text-xs font-semibold text-slate-400">TARGET YTD</span>
               <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{formatNumber(summary.total_target_ton)} <span className="font-normal text-xs text-slate-500">Ton</span></span>
            </div>
            <div className="h-[2px] w-full bg-slate-200 dark:bg-slate-700 mb-2"></div>
            
            <div className="flex justify-between items-center mt-1">
               <span className="text-xs font-semibold text-slate-400">REALISASI YTD</span>
               <span className="font-bold text-slate-800 dark:text-white text-base">{formatNumber(summary.total_realisasi_ton)} <span className="font-normal text-xs text-slate-500">Ton</span></span>
            </div>
         </div>
         
         <div className="pl-4 border-l border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
            <CircularProgress percentage={summary.persentase} color={isBlue ? "#3b82f6" : "#f97316"} />
         </div>
      </div>
    </div>
  );
};
