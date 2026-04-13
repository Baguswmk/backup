import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#fca5a5", "#fb923c", "#60a5fa", "#34d399", "#c084fc"];

const formatNumber = (num) => {
  if (num === null || num === undefined) return "0";
  return Number(num).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const KinerjaCompanyCards = ({ data = [], loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 h-40 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Assuming data structure:
  // [
  //   { company: "PT. Bukit Asam Kreatif", tonase: 256360.26, jarak_km: 7.8, rakor_persen: 104.21, isTotal: false },
  //   ...,
  //   { company: "CR CHT", tonase: 502246.83, jarak_km: 6.03, rakor_persen: 106.41, isTotal: true }
  // ]

  const companies = data.filter((d) => !d.isTotal);
  const totalData = data.find((d) => d.isTotal) || {
    company: "Total",
    tonase: companies.reduce((sum, d) => sum + (d.tonase || 0), 0),
    jarak_km: companies.reduce((sum, d) => sum + (d.jarak_km || 0), 0) / (companies.length || 1), // simplified avg
    rakor_persen: companies.reduce((sum, d) => sum + (d.rakor_persen || 0), 0) / (companies.length || 1),
  };

  const pieData = companies.map((c) => ({
    name: c.company,
    value: c.tonase || 0,
  })).filter(c => c.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {companies.map((item, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold shrink-0 shadow-inner">
               <span className="text-sm border border-white rounded px-1">🚚</span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm xl:text-base truncate" title={item.company}>
              {item.company}
            </h3>
          </div>
          
          <div className="flex justify-between items-end mt-4 mb-2">
            <div>
              <span className="text-xl font-bold text-slate-800 dark:text-white">
                {formatNumber(item.tonase)} <span className="text-sm font-normal text-slate-500">Ton</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {formatNumber(item.jarak_km)} <span className="font-normal text-slate-500">Km</span>
              </span>
            </div>
          </div>
          <div className={`h-1 w-full rounded-full mb-3 ${idx % 2 === 0 ? "bg-red-500" : "bg-blue-500"}`}></div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-medium tracking-wide">RAKOR</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{formatNumber(item.rakor_persen)}%</span>
          </div>
        </div>
      ))}

      {/* Total Card with Pie Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
        <div className="flex items-start justify-between h-[80px]">
          <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mt-2">
            {totalData.company || "CR CHT"}
          </h3>
          
          <div className="h-full w-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={20}
                  outerRadius={35}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatNumber(value) + " Ton"} 
                  itemStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="flex justify-between items-end mt-auto mb-2">
          <div>
            <span className="text-xl font-bold text-slate-800 dark:text-white">
              {formatNumber(totalData.tonase)} <span className="text-sm font-normal text-slate-500">Ton</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {formatNumber(totalData.jarak_km)} <span className="font-normal text-slate-500">Km</span>
            </span>
          </div>
        </div>
        <div className="h-1 w-full bg-green-500 rounded-full mb-3"></div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400 font-medium tracking-wide">RAKOR</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{formatNumber(totalData.rakor_persen)}%</span>
        </div>
      </div>
    </div>
  );
};
