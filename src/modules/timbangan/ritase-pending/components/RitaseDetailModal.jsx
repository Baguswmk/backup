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
  FileText,
  Building2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useRitasePendingSync } from "../hooks/useRitasePendingSync";

export const RitaseDetailModal = ({ group, onClose, onSyncSuccess }) => {
  const [sortBy, setSortBy] = useState("time");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { isSyncing, syncRitases } = useRitasePendingSync();

  // ─── Sorted list ──────────────────────────────────────────────────────────

  const sortedRitases = [...group.ritases].sort((a, b) => {
    switch (sortBy) {
      case "time":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "weight":
        return (b.net_weight || 0) - (a.net_weight || 0);
      case "truck":
        return (a.unit_dump_truck || "").localeCompare(b.unit_dump_truck || "");
      default:
        return 0;
    }
  });

  // ─── Checkbox logic ───────────────────────────────────────────────────────

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

  // ─── Sync handlers — selalu refresh setelah selesai ──────────────────────

  const handleSyncOne = async (ritase, event) => {
    event?.stopPropagation();
    await syncRitases([ritase]);
    // Selalu refresh, apapun hasilnya
    if (onSyncSuccess) onSyncSuccess();
  };

  const handleBulkSync = async () => {
    await syncRitases(selectedRitases);
    setSelectedIds(new Set());
    if (onSyncSuccess) onSyncSuccess();
  };

  const handleSyncAll = async () => {
    await syncRitases(group.ritases);
    if (onSyncSuccess) onSyncSuccess();
  };

  // ─── Formatters ───────────────────────────────────────────────────────────

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

  const getTimeAgo = (dateString) => {
    if (!dateString) return "-";
    const diffMs = Date.now() - new Date(dateString);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays} hari lalu`;
    if (diffHours > 0) return `${diffHours} jam lalu`;
    if (diffMins > 0) return `${diffMins} menit lalu`;
    return "Baru saja";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">

          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {group.userName}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{group.username} &bull;{" "}
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {group.totalRit} ritase
                  </span>{" "}
                  &bull;{" "}
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {group.totalTon.toFixed(2)} ton
                  </span>
                </p>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </Button>
          </div>

          {/* ── Toolbar ───────────────────────────────────────────────── */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Urutkan:</span>
                <div className="flex gap-1">
                  {[
                    { key: "time", label: "Waktu" },
                    { key: "weight", label: "Berat" },
                    { key: "truck", label: "DT" },
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      onClick={() => setSortBy(key)}
                      className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${sortBy === key
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }`}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sync selected / sync all */}
              <div className="flex items-center gap-2">
                {someSelected ? (
                  <Button
                    onClick={handleBulkSync}
                    disabled={isSyncing}
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                    Sync {selectedIds.size} Ritase
                  </Button>
                ) : (
                  <Button
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                    Sync Semua
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── Select-all bar ─────────────────────────────────────────── */}
          <div className="px-4 sm:px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30 flex items-center gap-3">
            <Button
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
                {allSelected ? "Batal pilih semua" : `Pilih semua (${allIds.length})`}
              </span>
            </Button>
            {someSelected && (
              <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">
                {selectedIds.size} dipilih
              </span>
            )}
          </div>

          {/* ── Ritase List ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-3">
              {sortedRitases.map((ritase, index) => {
                const isChecked = selectedIds.has(ritase.id);

                return (
                  <div
                    key={ritase.id}
                    className={`rounded-lg p-4 border transition-colors ${isChecked
                        ? "bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700"
                        : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                      }`}
                  >
                    {/* Row header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Button
                          onClick={() => toggleSelectOne(ritase.id)}
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </Button>

                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold flex-shrink-0">
                          {index + 1}
                        </span>

                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {ritase.loading_location || "-"} → {ritase.dumping_location || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {getTimeAgo(ritase.createdAt)}
                        </span>
                        <Button
                          onClick={(e) => handleSyncOne(ritase, e)}
                          disabled={isSyncing}
                          variant="outline"
                          size="sm"
                          className="gap-1 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400 h-7 px-2 text-xs"
                        >
                          <Send className={`w-3 h-3 ${isSyncing ? "animate-pulse" : ""}`} />
                          Sync
                        </Button>
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                          <Truck className="w-3.5 h-3.5" />
                          <span className="text-xs">Hull No</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {ritase.unit_dump_truck || "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                          <Weight className="w-3.5 h-3.5" />
                          <span className="text-xs">Net Weight</span>
                        </div>
                        <p className="font-semibold text-blue-600 dark:text-blue-400">
                          {ritase.net_weight ? `${ritase.net_weight} ton` : "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">Shift</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {ritase.shift || "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="text-xs">SPPH</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {ritase.spph || "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                          <Package className="w-3.5 h-3.5" />
                          <span className="text-xs">Excavator</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {ritase.unit_exca || "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                          <Building2 className="w-3.5 h-3.5" />
                          <span className="text-xs">Company</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {ritase.company || "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-xs">Operator</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {ritase.operator || "-"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">Waktu</span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white text-xs">
                          {formatDateTime(ritase.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────────── */}
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total: {sortedRitases.length} ritase
              {someSelected && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                  • {selectedIds.size} dipilih
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              {someSelected && (
                <Button
                  onClick={handleBulkSync}
                  disabled={isSyncing}
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                  Sync {selectedIds.size} Ritase
                </Button>
              )}
              <Button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};