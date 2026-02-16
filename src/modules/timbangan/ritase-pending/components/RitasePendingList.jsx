import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Send,
  CheckSquare,
  Square,
  MinusSquare,
  Truck,
  User,
  ChevronRight,
  Weight,
} from "lucide-react";
import { logger } from "@/shared/services/log";
import useAuthStore from "@/modules/auth/store/authStore";
import { RitaseDetailModal } from "./RitaseDetailModal";
import { Button } from "@/shared/components/ui/button";
import { useRitasePendingSync } from "../hooks/useRitasePendingSync";
import { ritasePendingService } from "../services/ritasePendingService";
import Pagination from "@/shared/components/Pagination";

const ITEMS_PER_PAGE_DEFAULT = 10;

export const RitasePendingList = ({ onRegisterRefresh }) => {
  const [ritaseList, setRitaseList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null); // group user yang dibuka di modal

  const [selectedKeys, setSelectedKeys] = useState(new Set()); // key = userId

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

  const user = useAuthStore((state) => state.user);
  const { isSyncing, syncRitases } = useRitasePendingSync();

  useEffect(() => {
    fetchPendingRitases();
    const interval = setInterval(fetchPendingRitases, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof onRegisterRefresh === "function") {
      onRegisterRefresh(fetchPendingRitases);
    }
  }, [onRegisterRefresh]);

  const fetchPendingRitases = async () => {
    try {
      setIsLoading(true);

      const result = await ritasePendingService.fetchPendingRitase({
        user,
        forceRefresh: true,
      });

      if (result.status === "success" && result.data) {
        const filtered = result.data.filter((ritase) => {
          if (ritase.id_setting_fleet) return false;
          if (user?.role?.toLowerCase() !== "ccr") {
            if (ritase.created_by_user?.id !== user?.id) return false;
          }
          return true;
        });

        setRitaseList(filtered);
        setCurrentPage(1);
        setSelectedKeys(new Set());

        logger.info("✅ Pending ritases loaded", { total: filtered.length });
      }
    } catch (error) {
      logger.error("❌ Failed to fetch pending ritases", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Group by created_by_user ────────────────────────────────────────────────

  const groupedData = useMemo(() => {
    const groups = {};
    ritaseList.forEach((ritase) => {
      const userId = ritase.created_by_user?.id ?? "unknown";
      if (!groups[userId]) {
        groups[userId] = {
          userId: String(userId),
          userName: ritase.created_by_user?.name || ritase.created_by_user?.username || "-",
          username: ritase.created_by_user?.username || "-",
          ritases: [],
          totalRit: 0,
          totalTon: 0,
        };
      }
      groups[userId].ritases.push(ritase);
      groups[userId].totalRit += 1;
      groups[userId].totalTon += parseFloat(ritase.net_weight || 0);
    });
    return Object.values(groups).sort((a, b) => b.totalRit - a.totalRit);
  }, [ritaseList]);

  // ─── Pagination ──────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(groupedData.length / itemsPerPage));

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return groupedData.slice(start, start + itemsPerPage);
  }, [groupedData, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setSelectedKeys(new Set());
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
    setSelectedKeys(new Set());
  };

  // ─── Checkbox logic (per group/user) ────────────────────────────────────────

  const allKeys = pagedData.map((g) => g.userId);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));
  const someSelected = allKeys.some((k) => selectedKeys.has(k));
  const indeterminate = someSelected && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        allKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        allKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  };

  const toggleSelectOne = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectedGroups = groupedData.filter((g) => selectedKeys.has(g.userId));
  const totalSelectedRit = selectedGroups.reduce((s, g) => s + g.totalRit, 0);

  // ─── Sync handlers ───────────────────────────────────────────────────────────

  const handleSyncGroup = async (group, event) => {
    event.stopPropagation();
    const result = await syncRitases(group.ritases);
    if (result.success || result.partialSuccess) fetchPendingRitases();
  };

  const handleBulkSync = async () => {
    const allRitases = selectedGroups.flatMap((g) => g.ritases);
    await syncRitases(allRitases);
    fetchPendingRitases();
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

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

  if (groupedData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            Tidak Ada Ritase Pending
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Semua ritase sudah memiliki ID Setting Fleet
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ritase Pending
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {groupedData.length} pengguna &bull;{" "}
                {ritaseList.length} ritase belum tersinkronisasi
              </p>
            </div>

            {someSelected && (
              <Button
                onClick={handleBulkSync}
                disabled={isSyncing}
                size="sm"
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                Sync {selectedKeys.size} Pengguna
                <span className="ml-0.5 text-green-100 text-xs">
                  ({totalSelectedRit} rit)
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Select-all bar ───────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-2.5 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
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
              {allSelected ? "Batal pilih semua" : `Pilih semua (${allKeys.length})`}
            </span>
          </Button>

          {someSelected && (
            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400 font-medium">
              {selectedKeys.size} dipilih
            </span>
          )}
        </div>

        {/* ── Group List ───────────────────────────────────────────────────── */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {pagedData.map((group, index) => {
            const isChecked = selectedKeys.has(group.userId);
            const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;

            return (
              <div
                key={group.userId}
                className={`px-4 sm:px-6 py-4 transition-colors group ${
                  isChecked
                    ? "bg-blue-50/60 dark:bg-blue-900/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <Button
                    onClick={() => toggleSelectOne(group.userId)}
                    className="flex-shrink-0 p-1 -ml-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                    )}
                  </Button>

                  {/* Avatar icon */}
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        #{globalIndex}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
                        {group.userName}
                      </h3>
                      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline truncate">
                        @{group.username}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {group.totalRit}
                          </span>{" "}
                          Ritase
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Weight className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {group.totalTon.toFixed(2)}
                          </span>{" "}
                          ton
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Sync group */}
                    <Button
                      onClick={(e) => handleSyncGroup(group, e)}
                      disabled={isSyncing}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400"
                      title={`Sync ${group.totalRit} ritase`}
                    >
                      <Send className={`w-3.5 h-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                      <span className="hidden sm:inline">Sync</span>
                    </Button>

                    {/* Detail — buka modal list ritase user ini */}
                    <Button
                      onClick={() => setSelectedGroup(group)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Lihat daftar ritase"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            totalItems={groupedData.length}
          />
        </div>
      </div>

      {/* Detail Modal — list ritase milik user yang dipilih */}
      {selectedGroup && (
        <RitaseDetailModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onSyncSuccess={fetchPendingRitases}
        />
      )}
    </>
  );
};