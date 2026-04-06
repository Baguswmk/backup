import React from "react";
import { formatNumber } from "@/shared/utils/number";

export const KpiRow = ({
  avgTonase,
  avgDurasi,
  avgKA,
  maxTon,
  minTon,
  maxDur,
  minDur,
  maxRng,
  minRng,
}) => {
  const KpiCard = ({ label, value, unit, high, low, highUnit, lowUnit }) => (
    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-slate-100 dark:border-slate-700/50 rounded-lg p-4 shadow-sm flex flex-col transition-all hover:shadow-md">
      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-blue-500" />
        {label}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white flex items-baseline gap-1.5 tabular-nums leading-none tracking-tight">
        {formatNumber(value, 2)}
        <span className="text-sm font-medium text-slate-400 dark:text-slate-500">{unit}</span>
      </div>
      <div className="mt-auto pt-3">
        <hr className="border-t border-gray-100 dark:border-slate-700 my-2" />
        <div className="flex justify-between items-center text-xs">
          <div className="flex flex-col">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Max</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              {formatNumber(high, 2)} <span className="text-gray-400 font-normal">{highUnit}</span>
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider">Min</span>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              {formatNumber(low, 2)} <span className="text-gray-400 font-normal">{lowUnit}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <KpiCard
        label="Avg Tonase / Rangkaian"
        value={avgTonase}
        unit="Ton"
        high={maxTon}
        low={minTon}
        highUnit="Ton"
        lowUnit="Ton"
      />
      <KpiCard
        label="Avg Muat"
        value={avgDurasi}
        unit="Menit"
        high={maxDur}
        low={minDur}
        highUnit="Mnt"
        lowUnit="Mnt"
      />
      <KpiCard
        label="Avg KA / Hari"
        value={avgKA}
        unit="Rangkaian"
        high={maxRng}
        low={minRng}
        highUnit="KA"
        lowUnit="KA"
      />
    </div>
  );
};
