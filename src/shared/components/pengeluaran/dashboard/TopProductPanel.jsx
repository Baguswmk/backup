import React from "react";
import { formatNumber } from "@/shared/utils/number";

export const TopProductPanel = ({ topProducts = [] }) => {
  const maxProd = topProducts[0]?.[1] || 1;
  const prodColors = [
    "#1a56db",
    "#06b6d4",
    "#0891b2",
    "#0e7490",
    "#155e75",
    "#164e63",
    "#0c4a6e",
    "#1e3a5f",
    "#3b82f6",
    "#0369a1",
  ];

  return (
    <div className="bg-white dark:bg-slate-800  rounded-lg p-3 shadow-sm h-full flex flex-col min-h-[300px] transition-colors">
      <div className="text-xs font-semibold text-gray-500 dark:text-neutral-50 uppercase tracking-wider mb-2 flex-shrink-0">
        Top Product Brand
      </div>
      {!topProducts || topProducts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-500 py-4">
          Tidak ada data produk
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-2 overflow-y-auto flex-1 pr-2 scrollbar-thin">
          {topProducts.map(([name, ton], i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">
                  {name}
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {formatNumber(ton, 0)} Ton
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((ton / maxProd) * 100).toFixed(1)}%`,
                    backgroundColor: prodColors[i] || "#1a56db",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
