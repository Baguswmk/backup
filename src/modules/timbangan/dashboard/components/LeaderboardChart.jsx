import React from "react";
import { dashboardStore } from "@/modules/timbangan/dashboard/store/dashboardStore";
import { Card } from "@/shared/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Trophy, Medal, Award } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <p className="text-sm text-gray-700">
          Tonase:{" "}
          <span className="font-semibold">
            {data.ton.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ton
          </span>
        </p>
        <p className="text-sm text-gray-700">
          Ritase:{" "}
          <span className="font-semibold">
            {data.trips.toLocaleString("id-ID")} trip
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const LeaderboardChart = ({ data, isLoading }) => {
  const { filters } = dashboardStore();
  const leaderboardType =
    filters.by === "dumptruck" ? "Dump Truck" : "Contractor";

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Top {leaderboardType}
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
          <Trophy className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Top {leaderboardType}
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-400">
          Tidak ada data untuk ditampilkan
        </div>
      </Card>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    rank: index + 1,
    shortKey:
      item.key.length > 15 ? item.key.substring(0, 15) + "..." : item.key,
    color:
      index === 0
        ? "#fbbf24"
        : index === 1
        ? "#94a3b8"
        : index === 2
        ? "#fb923c"
        : "#3b82f6",
  }));

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Award className="h-4 w-4 text-orange-500" />;
    return <span className="text-xs font-medium text-gray-500">#{rank}</span>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Top {leaderboardType}
          </h3>
        </div>
        <div className="text-xs text-gray-600">Sorted by tonase</div>
      </div>

      {/* Horizontal Bar Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f0f0f0"
            horizontal={false}
          />
          <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis
            type="category"
            dataKey="shortKey"
            tick={{ fontSize: 11 }}
            stroke="#9ca3af"
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="ton" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Top 3 Highlight */}
      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-3 gap-4">
          {chartData.slice(0, 3).map((item, index) => (
            <div
              key={index}
              className={`text-center p-3 rounded-lg ${
                index === 0
                  ? "bg-yellow-50 border border-yellow-200"
                  : index === 1
                  ? "bg-gray-50 border border-gray-200"
                  : "bg-orange-50 border border-orange-200"
              }`}
            >
              <div className="flex justify-center mb-2">
                {getRankIcon(item.rank)}
              </div>
              <p className="text-xs font-medium text-gray-900 truncate mb-1">
                {item.key}
              </p>
              <p className="text-lg font-bold text-gray-900">
                {item.ton.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-gray-600">{item.trips} trip</p>
            </div>
          ))}
        </div>
      </div>

      {/* Full List */}
      <details className="mt-4 pt-4 border-t">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
          Lihat semua ({data.length})
        </summary>
        <div className="mt-3 max-h-60 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2 text-xs font-medium text-gray-600 w-12">
                  Rank
                </th>
                <th className="text-left p-2 text-xs font-medium text-gray-600">
                  {leaderboardType}
                </th>
                <th className="text-right p-2 text-xs font-medium text-gray-600">
                  Tonase
                </th>
                <th className="text-right p-2 text-xs font-medium text-gray-600">
                  Trip
                </th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-2 text-center">{getRankIcon(item.rank)}</td>
                  <td className="p-2 font-medium text-gray-900">{item.key}</td>
                  <td className="text-right p-2 text-gray-700">
                    {item.ton.toLocaleString("id-ID", {
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="text-right p-2 text-gray-700">
                    {item.trips.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
};

export default LeaderboardChart;
