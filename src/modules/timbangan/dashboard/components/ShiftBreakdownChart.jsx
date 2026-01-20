import React from "react";
import { Card } from "@/shared/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Clock } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);

    return (
      <div className="bg-neutral-50 p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.fill }}>
            {entry.name}:{" "}
            {entry.value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
            ton
          </p>
        ))}
        <p className="text-sm font-semibold text-gray-900 mt-2 pt-2 border-t">
          Total: {total.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
          ton
        </p>
      </div>
    );
  }
  return null;
};

const ShiftBreakdownChart = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Breakdown per Shift
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Memuat data...</div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Breakdown per Shift
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-400">
          Tidak ada data untuk ditampilkan
        </div>
      </Card>
    );
  }

  const dateMap = {};
  data.forEach((item) => {
    if (!dateMap[item.ops_date]) {
      dateMap[item.ops_date] = {
        date: new Date(item.ops_date).toLocaleDateString("id-ID", {
          month: "short",
          day: "numeric",
        }),
        fullDate: item.ops_date,
        "Shift 1": 0,
        "Shift 2": 0,
        "Shift 3": 0,
        "Shift 1 Trips": 0,
        "Shift 2 Trips": 0,
        "Shift 3 Trips": 0,
      };
    }
    dateMap[item.ops_date][item.shift] = parseFloat(item.ton);
    dateMap[item.ops_date][`${item.shift} Trips`] = parseInt(item.trips);
  });

  const chartData = Object.values(dateMap);

  const shiftTotals = {
    "Shift 1": 0,
    "Shift 2": 0,
    "Shift 3": 0,
  };

  chartData.forEach((day) => {
    shiftTotals["Shift 1"] += day["Shift 1"] || 0;
    shiftTotals["Shift 2"] += day["Shift 2"] || 0;
    shiftTotals["Shift 3"] += day["Shift 3"] || 0;
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Breakdown per Shift
          </h3>
        </div>
        <div className="text-xs text-gray-600">Stacked by shift</div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            label={{
              value: "Tonase (ton)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
          <Bar
            dataKey="Shift 1"
            stackId="a"
            fill="#fbbf24"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Shift 2"
            stackId="a"
            fill="#f97316"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="Shift 3"
            stackId="a"
            fill="#dc2626"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Shift totals */}
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-600 mb-1">Shift 1 (06:00-14:00)</p>
          <p className="text-lg font-bold text-yellow-500">
            {shiftTotals["Shift 1"].toLocaleString("id-ID", {
              maximumFractionDigits: 2,
            })}{" "}
            ton
          </p>
          <p className="text-xs text-gray-500">
            {(
              (shiftTotals["Shift 1"] /
                (shiftTotals["Shift 1"] +
                  shiftTotals["Shift 2"] +
                  shiftTotals["Shift 3"])) *
              100
            ).toFixed(1)}
            %
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Shift 2 (14:00-22:00)</p>
          <p className="text-lg font-bold text-orange-500">
            {shiftTotals["Shift 2"].toLocaleString("id-ID", {
              maximumFractionDigits: 2,
            })}{" "}
            ton
          </p>
          <p className="text-xs text-gray-500">
            {(
              (shiftTotals["Shift 2"] /
                (shiftTotals["Shift 1"] +
                  shiftTotals["Shift 2"] +
                  shiftTotals["Shift 3"])) *
              100
            ).toFixed(1)}
            %
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Shift 3 (22:00-06:00)</p>
          <p className="text-lg font-bold text-red-500">
            {shiftTotals["Shift 3"].toLocaleString("id-ID", {
              maximumFractionDigits: 2,
            })}{" "}
            ton
          </p>
          <p className="text-xs text-gray-500">
            {(
              (shiftTotals["Shift 3"] /
                (shiftTotals["Shift 1"] +
                  shiftTotals["Shift 2"] +
                  shiftTotals["Shift 3"])) *
              100
            ).toFixed(1)}
            %
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ShiftBreakdownChart;
