import React, { useState, useEffect } from "react";
import {
  MapPin,
  ChevronRight,
  Package,
  TrendingUp,
  Send,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { logger } from "@/shared/services/log";
import useAuthStore from "@/modules/auth/store/authStore";
import { RitaseDetailModal } from "./RitaseDetailModal";
import { Button } from "@/shared/components/ui/button";
import { useRitasePendingSync } from "../hooks/useRitasePendingSync";
import { ritasePendingService } from "../services/ritasePendingService";

export const RitasePendingList = ({ onRegisterRefresh }) => {
  const [pendingData, setPendingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Checkbox state: set of selected locationKey strings
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  const user = useAuthStore((state) => state.user);
  const { isSyncing, syncProgress, syncLocation } = useRitasePendingSync();

  useEffect(() => {
    fetchPendingRitases();
    const interval = setInterval(fetchPendingRitases, 30000);
    return () => clearInterval(interval);
  }, []);

  // Expose refresh fn to parent
  useEffect(() => {
    if (typeof onRegisterRefresh === "function") {
      onRegisterRefresh(fetchPendingRitases);
    }
  }, [onRegisterRefresh]);

  const fetchPendingRitases = async () => {
    try {
      setIsLoading(true);

      const now = new Date();

      const result = await ritasePendingService.fetchPendingRitase({
        forceRefresh: true,
      });

      if (result.status && result.data) {
        const filtered = result.data.filter((ritase) => {
          if (ritase.id_setting_fleet) return false;
          const ritaseTime = new Date(ritase.createdAt || ritase.timestamp);
          const diffHours = (now - ritaseTime) / (1000 * 60 * 60);
          return diffHours <= 8;
        });

        const grouped = groupByLocation(filtered);
        setPendingData(grouped);

        // Clear selection when data refreshes
        setSelectedKeys(new Set());

        logger.info("✅ Pending ritases loaded", {
          total: filtered.length,
          locations: grouped.length,
        });
      }
    } catch (error) {
      logger.error("❌ Failed to fetch pending ritases", error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupByLocation = (ritases) => {
    const groups = {};
    console.log(ritases)
    ritases.forEach((ritase) => {
      const loading = ritase.loading_location || "-";
      const dumping = ritase.dumping_location || "-";
      const key = `${loading} → ${dumping}`;
      const hull_no = ritase.unit_dump_truck || "-";
      const date = ritase.tanggal || "-";

      if (!groups[key]) {
        groups[key] = {
          hull_no,
          date,
          locationKey: key,
          loading,
          dumping,
          ritases: [],
          totalRit: 0,
          totalTon: 0,
        };
      }

      groups[key].ritases.push(ritase);
      groups[key].totalRit += 1;
      groups[key].totalTon += parseFloat(ritase.net_weight || 0);
    });

    return Object.values(groups).sort((a, b) => b.totalRit - a.totalRit);
  };

  const formatTonnage = (ton) => (ton / 1000).toFixed(2);

  // ─── Checkbox logic ────────────────────────────────────────────────────────

  const allKeys = pendingData.map((l) => l.locationKey);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));
  const someSelected = allKeys.some((k) => selectedKeys.has(k));
  const indeterminate = someSelected && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allKeys));
    }
  };

  const toggleSelectOne = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectedLocations = pendingData.filter((l) =>
    selectedKeys.has(l.locationKey)
  );
  const totalSelectedRit = selectedLocations.reduce(
    (s, l) => s + l.totalRit,
    0
  );

  // ─── Sync handlers ─────────────────────────────────────────────────────────

  const handleSyncLocation = async (location, event) => {
    event.stopPropagation();
    const result = await syncLocation(location);
    if (result.success || result.partialSuccess) {
      fetchPendingRitases();
    }
  };

  const handleBulkSync = async () => {
    for (const location of selectedLocations) {
      await syncLocation(location);
    }
    fetchPendingRitases();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Memuat data ritase pending...
          </span>
        </div>
      </div>
    );
  }

  if (pendingData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            Tidak Ada Ritase Pending
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Semua ritase sudah memiliki ID Setting Fleet atau sudah lebih dari 8
            jam
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lokasi dengan Ritase Pending
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {pendingData.length} lokasi •{" "}
                {pendingData.reduce((sum, loc) => sum + loc.totalRit, 0)}{" "}
                ritase
              </p>
            </div>

            {/* Bulk Sync — visible only when something is checked */}
            {someSelected && (
              <Button
                onClick={handleBulkSync}
                disabled={isSyncing}
                size="sm"
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Send
                  className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`}
                />
                Sync {selectedKeys.size} Lokasi
                <span className="ml-0.5 text-green-100 text-xs">
                  ({totalSelectedRit} rit)
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Select-all bar ──────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-2.5 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors select-none"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : indeterminate ? (
              <MinusSquare className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>
              {allSelected
                ? "Batal pilih semua"
                : `Pilih semua (${allKeys.length})`}
            </span>
          </button>

          {someSelected && (
            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">
              {selectedKeys.size} dipilih
            </span>
          )}
        </div>

        {/* ── Location List ───────────────────────────────────────────────── */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {pendingData.map((location, index) => {
            const isChecked = selectedKeys.has(location.locationKey);

            return (
              <div
                key={location.locationKey}
                className={`px-4 sm:px-6 py-4 transition-colors group ${
                  isChecked
                    ? "bg-blue-50/60 dark:bg-blue-900/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectOne(location.locationKey)}
                    className="flex-shrink-0 p-1 -ml-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                    title={isChecked ? "Batal pilih" : "Pilih lokasi ini"}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                    )}
                  </button>

                  {/* Main clickable area → opens detail modal */}
                  <div
                    onClick={() => setSelectedLocation(location)}
                    className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          #{index + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                          {location.loading} → {location.dumping}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {location.totalRit}
                            </span>{" "}
                            Rit
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {location.totalTon}
                            </span>{" "}
                            ton
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Per-row Sync */}
                    <Button
                      onClick={(e) => handleSyncLocation(location, e)}
                      disabled={isSyncing}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400"
                      title={`Sync ${location.totalRit} ritase`}
                    >
                      <Send
                        className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`}
                      />
                      <span className="hidden sm:inline">Sync</span>
                    </Button>

                    {/* Detail chevron */}
                    <button
                      onClick={() => setSelectedLocation(location)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLocation && (
        <RitaseDetailModal
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onSyncSuccess={fetchPendingRitases}
        />
      )}
    </>
  );
};