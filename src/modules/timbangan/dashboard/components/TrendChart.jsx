import React from "react";
import { Card } from "@/shared/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-neutral-50 p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{" "}
            {entry.value.toLocaleString("id-ID", { maximumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TrendChart = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Tren Harian</h3>
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
          <TrendingUp className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Tren Harian</h3>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-400">
          Tidak ada data untuk ditampilkan
        </div>
      </Card>
    );
  }

  const chartData = data.map((item) => ({
    date: new Date(item.ops_date).toLocaleDateString("id-ID", {
      month: "short",
      day: "numeric",
    }),
    fullDate: item.ops_date,
    Tonase: parseFloat(item.ton),
    Ritase: parseInt(item.trips),
  }));

  const totalTon = data.reduce((sum, item) => sum + item.ton, 0);
  const totalTrips = data.reduce((sum, item) => sum + item.trips, 0);
  const avgTon = totalTon / data.length;
  const avgTrips = totalTrips / data.length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Tren Harian</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-gray-600">
              Avg Tonase:{" "}
              <span className="font-semibold text-gray-900">
                {avgTon.toFixed(2)} ton
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600">
              Avg Ritase:{" "}
              <span className="font-semibold text-gray-900">
                {avgTrips.toFixed(0)} trip
              </span>
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            label={{
              value: "Tonase (ton)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12 },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            label={{
              value: "Ritase (trip)",
              angle: 90,
              position: "insideRight",
              style: { fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Tonase"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: "#3b82f6", r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Ritase"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: "#10b981", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary below chart */}
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-600 mb-1">Total Tonase</p>
          <p className="text-lg font-bold text-blue-600">
            {totalTon.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ton
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Total Ritase</p>
          <p className="text-lg font-bold text-green-600">
            {totalTrips.toLocaleString("id-ID")} trip
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Periode</p>
          <p className="text-lg font-bold text-gray-900">{data.length} hari</p>
        </div>
      </div>
    </Card>
  );
};

export default TrendChart;
