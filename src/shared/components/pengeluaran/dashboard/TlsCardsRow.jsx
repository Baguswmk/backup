import React from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/shared/utils/number";

export const TlsCardsRow = ({ statTotal = {}, tlsList = [] }) => {
  const Card = ({ label, tonnage, rangkaian, gerbong, isTotal }) => (
    <div
      className={cn(
        "bg-white dark:bg-slate-800  rounded-lg overflow-hidden shadow-sm transition-colors",
        isTotal && "border-emerald-600 dark:border-emerald-600",
      )}
    >
      <div
        className={cn(
          "px-4 py-3 flex items-center justify-between text-white text-sm font-semibold",
          isTotal
            ? "bg-gradient-to-br from-emerald-800 to-emerald-600"
            : "bg-gradient-to-br from-blue-900 to-blue-600",
        )}
      >
        <span>{label}</span>
      </div>
      <div className="p-4">
        <div className="text-2xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-gray-100 mb-3">
          {formatNumber(tonnage)} <span className="text-sm font-medium text-gray-500">Ton</span>
        </div>
        <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Rangkaian</span>
            <strong className="text-gray-900 dark:text-gray-100 tabular-nums">
              {formatNumber(rangkaian)}
            </strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Gerbong</span>
            <strong className="text-gray-900 dark:text-gray-100 tabular-nums">
              {formatNumber(gerbong)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-3">
      <Card
        label="All TLS"
        tonnage={statTotal.totalTonnage || 0}
        rangkaian={statTotal.totalCount || 0}
        gerbong={statTotal.totalWagons || 0}
        isTotal={true}
      />
      {tlsList.map((t, idx) => (
        <Card
          key={idx}
          label={t.tls || "TLS ?"}
          tonnage={t.tonnage || 0}
          rangkaian={t.count || 0}
          gerbong={t.totalWagons || 0}
          isTotal={false}
        />
      ))}
    </div>
  );
};
