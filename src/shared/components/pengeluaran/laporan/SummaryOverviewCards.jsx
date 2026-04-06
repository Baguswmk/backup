import React from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/shared/utils/number";

// Static grid col classes — Tailwind requires static strings (no template literals) for purging
const GRID_COLS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

export const SummaryOverviewCards = ({ data = {} }) => {
  const tujuan = data.destinations || [];
  const total = data.total || {};

  if (!total.totalCount && !tujuan.length) return null;

  const semuaTLSSync = [
    ...new Set([
      ...tujuan.flatMap((d) => (d.byTls || []).map((t) => t.tls)),
      ...(total.byTls || []).map((t) => t.tls),
    ]),
  ].sort();

  const OvCard = ({ judul, jumlah, totalTon, avgDurasi, byTls, semuaTLS, isTotal }) => {
    const tlsMap = {};
    (byTls || []).forEach((t) => { tlsMap[t.tls] = t; });

    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden flex flex-col min-w-0 transition-colors">
        <div className={cn("px-3 py-2 text-center", isTotal ? "bg-gradient-to-br from-emerald-800 to-emerald-600" : "bg-gradient-to-br from-blue-900 to-blue-600")}>
          <div className="text-sm font-medium text-white tracking-wide">{judul}</div>
        </div>

        <div className="text-center pt-4 pb-2 text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight tabular-nums leading-none">
          {formatNumber(jumlah)}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse mt-2 text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wider font-bold text-gray-500 whitespace-nowrap">
              <tr>
                <th className="px-2 py-1 text-left w-9">TLS</th>
                <th className="px-2 py-1 text-center w-14">Rangkaian</th>
                <th className="px-2 py-1 text-right">Tonase (Ton)</th>
                <th className="px-2 py-1 text-right w-[58px]">Avg Dur.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="bg-slate-50 dark:bg-slate-900/30 font-bold border-b border-slate-300 dark:border-slate-600">
                <td className="px-2 py-1 text-gray-900 dark:text-gray-100">Total</td>
                <td className="px-2 py-1 text-center tabular-nums text-gray-900 dark:text-gray-100">{formatNumber(jumlah)}</td>
                <td className="px-2 py-1 text-right tabular-nums text-gray-900 dark:text-gray-100">{formatNumber(totalTon, 3)}</td>
                <td className="px-2 py-1 text-right tabular-nums text-gray-900 dark:text-gray-100">{avgDurasi ? formatNumber(avgDurasi, 2) : "—"}</td>
              </tr>
              {semuaTLS.map((nama) => {
                const t = tlsMap[nama];
                if (!t) {
                  return (
                    <tr key={nama} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-2 py-1 text-gray-600 dark:text-gray-400">{nama}</td>
                      <td className="px-2 py-1 text-center text-gray-400">-</td>
                      <td className="px-2 py-1 text-right text-gray-400">-</td>
                      <td className="px-2 py-1 text-right text-gray-400">-</td>
                    </tr>
                  );
                }
                return (
                  <tr key={nama} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 text-gray-600 dark:text-gray-300">
                    <td className="px-2 py-1">{nama}</td>
                    <td className="px-2 py-1 text-center tabular-nums">{formatNumber(t.count)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatNumber(t.tonnage, 3)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{t.avgDuration ? formatNumber(t.avgDuration, 2) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const totalKolom = Math.min(1 + tujuan.length, 5);

  return (
    <div className={`grid gap-3 mb-4 ${GRID_COLS[totalKolom] || GRID_COLS[5]}`}>
      <OvCard
        judul="Total Rangkaian"
        jumlah={total.totalCount || 0}
        totalTon={total.totalTonnage || 0}
        avgDurasi={total.avgDuration || 0}
        byTls={total.byTls || []}
        semuaTLS={semuaTLSSync}
        isTotal={true}
      />
      {tujuan.map((d, index) => (
        <OvCard
          key={index}
          judul={`Rangkaian ${d.name}`}
          jumlah={d.totalCount || 0}
          totalTon={d.totalTonnage || 0}
          avgDurasi={d.avgDuration || 0}
          byTls={d.byTls || []}
          semuaTLS={semuaTLSSync}
          isTotal={false}
        />
      ))}
    </div>
  );
};
