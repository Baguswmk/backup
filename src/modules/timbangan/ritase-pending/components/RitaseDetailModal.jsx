import React, { useState } from "react";
import {
  X,
  Truck,
  User,
  Clock,
  Weight,
  Calendar,
  MapPin,
  Package,
  Send,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useRitasePendingSync } from "../hooks/useRitasePendingSync";

export const RitaseDetailModal = ({ location, onClose, onSyncSuccess }) => {
  const [sortBy, setSortBy] = useState("time");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { isSyncing, syncRitase } = useRitasePendingSync();

  // ─── Sorted list ────────────────────────────────────────────────────────────
  const sortedRitases = [...location.ritases].sort((a, b) => {
    switch (sortBy) {
      case "time":
        return (
          new Date(b.createdAt || b.timestamp) -
          new Date(a.createdAt || a.timestamp)
        );
      case "weight":
        return (b.net_weight || 0) - (a.net_weight || 0);
      case "truck":
        return (a.unit_dump_truck || "").localeCompare(
          b.unit_dump_truck || ""
        );
      default:
        return 0;
    }
  });

  // ─── Checkbox logic ──────────────────────────────────────────────────────────
  const allIds = sortedRitases.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));
  const indeterminate = someSelected && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedRitases = sortedRitases.filter((r) => selectedIds.has(r.id));

  // ─── Sync handlers ───────────────────────────────────────────────────────────

  /**
   * Sync a single ritase item.
   * Falls back to `syncLocation` with a single-item location if `syncRitase`
   * is not yet implemented on the hook.
   */
  const handleSyncSingle = async (ritase, event) => {
    event?.stopPropagation();
    if (typeof syncRitase === "function") {
      const result = await syncRitase(ritase);
      if (result?.success && onSyncSuccess) onSyncSuccess();
    } else {
      // Fallback: wrap as a synthetic single-item location
      const { syncLocation } = useRitasePendingSync
        ? { syncLocation: undefined }
        : {};
      console.warn("syncRitase not available; implement it in useRitasePendingSync");
    }
  };

  const handleBulkSync = async () => {
    for (const ritase of selectedRitases) {
      await handleSyncSingle(ritase);
    }
    setSelectedIds(new Set());
    if (onSyncSuccess) onSyncSuccess();
  };

  // ─── Formatters ──────────────────────────────────────────────────────────────
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  const formatWeight = (weight) => {
    if (!weight) return "0";
    return (parseFloat(weight) / 1000).toFixed(3);
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return "-";
    const diffMs = Date.now() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours > 0) return `${diffHours} jam lalu`;
    if (diffMins > 0) return `${diffMins} menit lalu`;
    return "Baru saja";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">

          {/* ── Modal Header ───────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                Detail Ritase Pending
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">
                  {location.loading} → {location.dumping}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {location.totalRit}
                  </span>{" "}
                  Ritase
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {(location.totalTon / 1000).toFixed(2)}
                  </span>{" "}
                  Ton
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* ── Sort + Bulk controls ────────────────────────────────────── */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Sort buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Urutkan:
                </span>
                <div className="flex gap-2">
                  {[
                    { key: "time", label: "Waktu" },
                    { key: "weight", label: "Berat" },
                    { key: "truck", label: "DT" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        sortBy === key
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk sync button — shows when items are checked */}
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
                  Sync {selectedIds.size} Ritase
                </Button>
              )}
            </div>
          </div>

          {/* ── Select-all bar ──────────────────────────────────────────── */}
          <div className="px-4 sm:px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30 flex items-center gap-3">
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
                  : `Pilih semua (${allIds.length})`}
              </span>
            </button>

            {someSelected && (
              <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">
                {selectedIds.size} dipilih
              </span>
            )}
          </div>

          {/* ── Ritase List ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-3">
              {sortedRitases.map((ritase, index) => {
                const isChecked = selectedIds.has(ritase.id);

                return (
                  <div
                    key={ritase.id}
                    className={`rounded-lg p-4 border transition-colors ${
                      isChecked
                        ? "bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    {/* Row header */}
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelectOne(ritase.id)}
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>

                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold">
                          {index + 1}
                        </span>

                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {ritase.unit_dump_truck || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Time-ago badge */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {getTimeAgo(ritase.createdAt || ritase.timestamp)}
                          </span>
                        </div>

                        {/* Per-row Sync button */}
                        <Button
                          onClick={(e) => handleSyncSingle(ritase, e)}
                          disabled={isSyncing}
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400 text-xs px-2 py-1 h-auto"
                          title="Sync ritase ini"
                        >
                          <Send
                            className={`w-3 h-3 ${isSyncing ? "animate-pulse" : ""}`}
                          />
                          Sync
                        </Button>
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-xs">Operator</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {ritase.operator || "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                          <Weight className="w-3.5 h-3.5" />
                          <span className="text-xs">Berat</span>
                        </div>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {ritase.net_weight} ton
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">Shift</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {ritase.shift || "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mb-1">
                          <Package className="w-3.5 h-3.5" />
                          <span className="text-xs">Excavator</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {ritase.unit_exca || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Dibuat:{" "}
                        {formatDateTime(ritase.createdAt || ritase.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Modal Footer ────────────────────────────────────────────── */}
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between text-sm gap-3 flex-wrap">
              <span className="text-gray-600 dark:text-gray-400">
                Total: {sortedRitases.length} ritase
                {someSelected && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                    • {selectedIds.size} dipilih
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                {/* Bulk sync in footer as well — handy when scrolled down */}
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
                    Sync {selectedIds.size} Ritase
                  </Button>
                )}

                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};