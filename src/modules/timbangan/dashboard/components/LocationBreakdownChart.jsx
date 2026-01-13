import React from "react";
import { dashboardStore } from "@/modules/timbangan/dashboard/store/dashboardStore";
import { Card } from "@/shared/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { MapPin } from "lucide-react";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
  "#84cc16",
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{data.loc}</p>
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
        <p className="text-sm text-gray-700">
          Share: <span className="font-semibold">{data.percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const LocationBreakdownChart = ({ data, isLoading }) => {
  const { filters } = dashboardStore();
  const dimension =
    filters.dim === "loading" ? "Loading Point" : "Dumping Point";

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Breakdown {dimension}
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
          <MapPin className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Breakdown {dimension}
          </h3>
        </div>
        <div className="h-80 flex items-center justify-center text-gray-400">
          Tidak ada data untuk ditampilkan
        </div>
      </Card>
    );
  }

  const totalTon = data.reduce((sum, item) => sum + item.ton, 0);
  const chartData = data.slice(0, 10).map((item, index) => ({
    ...item,
    percentage: ((item.ton / totalTon) * 100).toFixed(1),
    fill: COLORS[index % COLORS.length],
  }));

  const othersCount = data.length - 10;
  if (othersCount > 0) {
    const othersSum = data.slice(10).reduce((sum, item) => sum + item.ton, 0);
    chartData.push({
      loc: `Lainnya (${othersCount})`,
      ton: othersSum,
      trips: data.slice(10).reduce((sum, item) => sum + item.trips, 0),
      percentage: ((othersSum / totalTon) * 100).toFixed(1),
      fill: "#9ca3af",
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Breakdown {dimension}
          </h3>
        </div>
        <div className="text-xs text-gray-600">
          Top {Math.min(data.length, 10)} lokasi
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center">
        {/* Pie Chart */}
        <div className="w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="ton"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Table */}
        <div className="w-full lg:w-1/2 mt-4 lg:mt-0">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 text-xs font-medium text-gray-600">
                    Lokasi
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
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="font-medium text-gray-900 truncate">
                          {item.loc}
                        </span>
                      </div>
                    </td>
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
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-600 mb-1">Total Lokasi</p>
          <p className="text-lg font-bold text-green-600">{data.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Total Tonase</p>
          <p className="text-lg font-bold text-blue-600">
            {totalTon.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ton
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Avg per Lokasi</p>
          <p className="text-lg font-bold text-gray-900">
            {(totalTon / data.length).toLocaleString("id-ID", {
              maximumFractionDigits: 2,
            })}{" "}
            ton
          </p>
        </div>
      </div>
    </Card>
  );
};

export default LocationBreakdownChart;
