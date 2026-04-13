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
  Cell
} from "recharts";
import { formatNumber } from "@/shared/utils/number";

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

export const KinerjaSpphChart = ({ data = [], loading = false, title = "Statistik SPPH" }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 h-[400px] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-medium">Memuat grafik...</p>
        </div>
      </div>
    );
  }

  // Cari max % untuk menyeimbangkan YAxis kanan (misal dikali konstanta agar grafik garis gak numpuk dengan Bar)
  const maxPercent = Math.max(...data.map(d => d.persentase || 0), 100);

  // Jika tidak ada data, render kosong
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 h-[400px] flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs">0%</div>
          {title}
        </h3>
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Tidak ada data SPPH
        </div>
      </div>
    );
  }

  // Hitung total rata2 persen untuk header (seperti di mockup)
  const avgPercent = data.reduce((acc, curr) => acc + (curr.persentase || 0), 0) / (data.length || 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col h-[450px]">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
           {Math.round(avgPercent)}%
        </div>
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
          {title}
        </h3>
      </div>
      
      <div className="flex-1 mt-4 w-full h-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
               dataKey="id_key" 
               tickLine={false}
               axisLine={false}
               tick={{ fill: '#64748b', fontSize: 11 }}
               interval={0}
               angle={-25}
               textAnchor="end"
               height={60}
            />
            <YAxis 
               yAxisId="left" 
               tickFormatter={(value) => formatNumber(value)}
               tick={{ fill: '#64748b', fontSize: 12 }}
               axisLine={false}
               tickLine={false}
            />
            <YAxis 
               yAxisId="right" 
               orientation="right"
               domain={[0, maxPercent + 20]} // Kasih padding atas sedikit
               tick={{ fill: '#64748b', fontSize: 12 }}
               axisLine={false}
               tickLine={false}
               tickFormatter={(value) => `${value}%`}
               hide // sembunyikan axis di kanan supaya lebih bersih
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: "10px", paddingBottom: "10px" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar 
               yAxisId="left" 
               dataKey="realisasi_ton" 
               name="Realisasi" 
               fill="#60a5fa" 
               barSize={40} 
               radius={[4, 4, 0, 0]}
            />
            <Line 
               yAxisId="right" 
               type="monotone" 
               dataKey="target_ton" 
               name="Target" 
               stroke="#0ea5e9" 
               strokeWidth={2}
               dot={{ r: 4, fill: "#0ea5e9" }} 
            />
             <Line 
               yAxisId="right" 
               type="monotone" 
               dataKey="persentase" 
               name="%" 
               stroke="#f59e0b" // Orange stat untuk baris %
               strokeWidth={0} // Disembunyikan garisnya, tapi tetap ada datanya di tooltip / line
               dot={{ r: 0 }} 
               activeDot={false}
               legendType="none" // Ga usah muncul di legend
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Table Data under chart like in mockup */}
      <div className="w-full overflow-x-auto border-t border-slate-200 dark:border-slate-700 mt-2">
        <table className="w-full text-[10px] sm:text-xs text-center border-collapse">
          <thead>
             <tr>
               <td className="p-1 border-r border-slate-100 dark:border-slate-700 font-medium text-left w-20"></td>
               {data.map((col, idx) => (
                  <td key={`h-${idx}`} className="p-1 border-r border-slate-100 dark:border-slate-700 truncate max-w-[80px]">
                     {col.id_key}
                  </td>
               ))}
             </tr>
          </thead>
          <tbody>
             <tr className="bg-slate-50 dark:bg-slate-800/50">
               <td className="p-1 border-r border-slate-100 dark:border-slate-700 text-left font-medium flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-sm"></div> Realisasi
               </td>
               {data.map((col, idx) => (
                  <td key={`r-${idx}`} className="p-1 border-r border-slate-100 dark:border-slate-700 font-medium">
                     {formatNumber(col.realisasi_ton)}
                  </td>
               ))}
             </tr>
             <tr>
               <td className="p-1 border-r border-slate-100 dark:border-slate-700 text-left font-medium flex items-center gap-1">
                 <div className="w-2 h-2 bg-blue-500 rounded-full"></div> Target
               </td>
               {data.map((col, idx) => (
                  <td key={`t-${idx}`} className="p-1 border-r border-slate-100 dark:border-slate-700 text-slate-500">
                     {formatNumber(col.target_ton)}
                  </td>
               ))}
             </tr>
             <tr className="bg-slate-50 dark:bg-slate-800/50">
               <td className="p-1 border-r border-slate-100 dark:border-slate-700 text-left font-medium">%</td>
               {data.map((col, idx) => (
                  <td key={`p-${idx}`} className="p-1 border-r border-slate-100 dark:border-slate-700 font-bold">
                     {col.persentase}%
                  </td>
               ))}
             </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
