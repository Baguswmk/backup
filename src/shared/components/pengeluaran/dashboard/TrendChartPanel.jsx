import React from "react";
import { formatNumber } from "@/shared/utils/number";
import { format, parseISO, isValid } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const TrendChartPanel = ({ chartData = [] }) => {
  // chartData expected to be: [{ day: "2026-...", tonnage: 154, count: 5 }, ...]

  const formatLabel = (label) => {
    if (!label) return "";
    // Jika label berupa ISO date, kita format. Jika memang sudah string pendek, biarkan.
    const dateObj = new Date(label);
    if (isValid(dateObj) && String(label).includes("T")) {
      return format(dateObj, "dd/MM HH:mm");
    }
    return label;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded shadow-sm p-2 text-xs">
          <p className="font-bold text-gray-700 dark:text-gray-300 mb-1">
            Waktu: {formatLabel(label)}
          </p>
          <p className="text-blue-600">
            Tonase: {formatNumber(payload[0].value, 2)} Ton
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 dark:text-neutral-50 rounded-lg p-3 shadow-sm h-full min-h-[250px] flex flex-col transition-colors">
      <div className="flex-shrink-0 mb-3">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
          Trend Tonase Harian
        </div>
        <div className="text-xs text-gray-500">Total tonase per hari</div>
      </div>
      <div className="flex-1 w-full min-h-[185px]">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
            Tidak ada data trend harian
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-slate-400 dark:text-slate-500"
                tickLine={false}
                axisLine={false}
                padding={{ left: 10, right: 10 }}
                tickFormatter={formatLabel}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-slate-400 dark:text-slate-500"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatNumber(value, 0)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="tonnage"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
