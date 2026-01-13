import React, { useState } from "react";
import { Card } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Clock, Search, Truck, MapPin, AlertCircle } from "lucide-react";

const QueueTable = ({ data, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Antrian In-Transit
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
            Antrian In-Transit
          </h3>
        </div>
        <div className="h-80 flex flex-col items-center justify-center text-gray-400">
          <AlertCircle className="h-12 w-12 mb-3 text-gray-300" />
          <p>Tidak ada unit dalam perjalanan</p>
          <p className="text-sm mt-1">Semua ritase telah selesai</p>
        </div>
      </Card>
    );
  }

  const filteredData = data.filter(
    (item) =>
      item.unit_dump_truck?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.loading_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dumping_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWaitingTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} menit`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours}j ${mins}m`;
    }
  };

  const getWaitingColor = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMins = Math.floor((now - created) / 60000);

    if (diffMins > 120) return "destructive";
    if (diffMins > 60) return "warning";
    return "secondary";
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Antrian In-Transit
          </h3>
          <Badge variant="secondary" className="ml-2">
            {filteredData.length}
          </Badge>
        </div>
        <div className="text-xs text-gray-600">Real-time monitoring</div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Cari unit, loading, atau dumping..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Queue List */}
      <div className="max-h-96 overflow-y-auto space-y-3">
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Tidak ada hasil untuk "{searchTerm}"
          </div>
        ) : (
          filteredData.map((item) => (
            <div
              key={item.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">
                    {item.unit_dump_truck || "Unknown"}
                  </span>
                </div>
                <Badge variant={getWaitingColor(item.created_at)}>
                  {getWaitingTime(item.created_at)}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Loading:</span>
                  <span>{item.loading_location || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Dumping:</span>
                  <span>{item.dumping_location || "-"}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>ID: #{item.id}</span>
                <span>
                  Mulai:{" "}
                  {new Date(item.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {item.weigh_bridge && (
                  <span className="font-medium text-blue-600">
                    {item.weigh_bridge}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Queue</p>
            <p className="text-lg font-bold text-orange-600">{data.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Avg Wait Time</p>
            <p className="text-lg font-bold text-gray-900">
              {(() => {
                const avgMins =
                  data.reduce((sum, item) => {
                    const diffMs = new Date() - new Date(item.created_at);
                    return sum + Math.floor(diffMs / 60000);
                  }, 0) / data.length;
                return Math.floor(avgMins) + " min";
              })()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Alert (2h)</p>
            <p className="text-lg font-bold text-red-600">
              {
                data.filter((item) => {
                  const diffMs = new Date() - new Date(item.created_at);
                  return diffMs > 120 * 60000;
                }).length
              }
            </p>
          </div>
        </div>
      </div>

      {/* Auto refresh indicator */}
      <div className="mt-4 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Data diperbarui otomatis
        </div>
      </div>
    </Card>
  );
};

export default QueueTable;
