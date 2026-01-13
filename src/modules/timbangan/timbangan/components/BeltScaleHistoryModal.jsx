import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  X,
  History,
  Calendar,
  MapPin,
  TrendingUp,
  Search,
  Loader2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { beltScaleServices   } from "@/modules/timbangan/timbangan/services/beltscaleServices";
import { showToast } from "@/shared/utils/toast";
import { formatWeight } from "@/shared/utils/number";
import Pagination from "@/shared/components/Pagination";

const BypassHistoryModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Load history data
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const result = await beltScaleServices  .getBypassHistory();
      if (result.success) {
        setHistoryData(result.data);
      } else {
        showToast.error("Gagal memuat riwayat");
      }
    } catch (error) {
      showToast.error("Gagal memuat riwayat");
      console.error("History error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyData;

    const query = searchQuery.toLowerCase();
    return historyData.filter((item) => {
      const date = item.attributes?.date?.toLowerCase() || "";
      const shift = item.attributes?.shift?.toLowerCase() || "";
      const dumpingPoint = item.attributes?.dumping_point?.toLowerCase() || "";

      return (
        date.includes(query) ||
        shift.includes(query) ||
        dumpingPoint.includes(query)
      );
    });
  }, [historyData, searchQuery]);

  // Pagination
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage]);

  const totalPages = Math.ceil(filteredHistory.length / pageSize);

  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between z-10 shadow-sm border-b">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
              <History className="w-5 h-5" />
              Riwayat BeltScale Adjustment
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Daftar adjustment yang pernah dilakukan
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 dark:text-gray-400"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari berdasarkan tanggal, shift, atau dumping point..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400 text-center">
                {searchQuery
                  ? "Tidak ada riwayat yang sesuai pencarian"
                  : "Belum ada riwayat adjustment"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedHistory.map((item) => {
                const attrs = item.attributes || {};
                const createdBy =
                  attrs.created_by_user?.data?.attributes?.username || "-";
                const createdAt = attrs.createdAt
                  ? format(new Date(attrs.createdAt), "dd MMM yyyy HH:mm", {
                      locale: localeId,
                    })
                  : "-";

                return (
                  <Card
                    key={item.id}
                    className="border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Main Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-600" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {attrs.date
                                ? format(
                                    new Date(attrs.date),
                                    "dd MMMM yyyy",
                                    { locale: localeId }
                                  )
                                : "-"}
                            </span>
                            <Badge variant="outline" className="ml-2">
                              {attrs.shift || "-"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span>{attrs.dumping_point || "-"}</span>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                            <span>Dibuat oleh: {createdBy}</span>
                            <span>•</span>
                            <span>{createdAt}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 justify-end">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-2xl font-bold text-green-600">
                              {formatWeight(attrs.net_weight_bypass || 0)}
                            </span>
                            <span className="text-sm text-gray-600">ton</span>
                          </div>
                          {attrs.affected_count && (
                            <div className="text-xs text-gray-500">
                              {attrs.affected_count} ritase adjusted
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Info */}
                      {attrs.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {attrs.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between border-t">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {filteredHistory.length} riwayat
          </div>
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BypassHistoryModal;