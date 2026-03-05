import React, { useEffect, useState, useMemo } from "react";
import { useOffline } from "@/shared/components/OfflineProvider";
import { timbanganService } from "@/modules/timbangan/timbangan/services/TimbanganService";
import { offlineService } from "@/shared/services/offlineService";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import Pagination from "@/shared/components/Pagination";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  List,
  RefreshCw,
  Trash2,
  XCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Check,
  Printer,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import PrintBukti from "@/modules/timbangan/timbangan/components/PrintBukti";

export const TimbanganList = () => {
  const { syncStatus, isOnline } = useOffline();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
  });

  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);

  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [syncingIds, setSyncingIds] = useState([]);
  const [syncError, setSyncError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "failed" | "sent"
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * Returns true only for valid queue item objects (not Axios error objects).
   * Axios errors have a `config` key; real queue items never do.
   */
  const isValidQueueItem = (i) =>
    i !== null &&
    typeof i === "object" &&
    !Array.isArray(i) &&
    typeof i.config === "undefined";

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { pending, failed, sent } = await timbanganService.getAllQueues();
      const allItems = [
        ...pending
          .filter(isValidQueueItem)
          .map((i) => ({ ...i, status: "pending" })),
        ...failed
          .filter(isValidQueueItem)
          .map((i) => ({ ...i, status: "failed" })),
        ...(sent || [])
          .filter(isValidQueueItem)
          .map((i) => ({ ...i, status: "sent" })),
      ].sort((a, b) => {
        const timeA = new Date(
          a.clientTimestamp || a.createdAtClient || a.timestamp,
        ).getTime();
        const timeB = new Date(
          b.clientTimestamp || b.createdAtClient || b.timestamp,
        ).getTime();
        return timeB - timeA;
      });
      setItems(allItems);
    } catch (error) {
      console.error("Failed to load queue:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [syncStatus.lastSync, syncStatus.pendingCount, syncStatus.sentCount]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((i) => {
        const hullNo = i.data?.hull_no || "";
        return hullNo.toLowerCase().includes(lowerSearch);
      });
    }
    return result;
  }, [items, statusFilter, searchTerm]);

  const paginatedItems = useMemo(() => {
    if (itemsPerPage === filteredItems.length && filteredItems.length > 0) {
      return filteredItems;
    }

    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  };

  const handleDeleteClick = (item) => {
    setDeleteDialog({
      open: true,
      item: item,
    });
  };

  /**
   * ✅ FIX: Sekarang hapus dari DB yang benar berdasarkan status item
   * Semua lewat timbanganService.deleteItem → offlineService → satu DB
   */
  const confirmDelete = async () => {
    if (deleteDialog.item) {
      const { id, status } = deleteDialog.item;

      await timbanganService.deleteItem(id, status);

      setDeleteDialog({ open: false, item: null });
      loadData();

      const remainingItems = items.length - 1;
      const maxPage = Math.ceil(remainingItems / itemsPerPage);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    }
  };

  const deleteDialogConfig = {
    title: "Hapus Data Timbangan",
    warningMessage:
      "Data timbangan ini akan dihapus permanen dari antrian lokal dan tidak dapat dikembalikan.",
    step1Question: "Apakah Anda yakin ingin menghapus data timbangan ini?",
    reasonsTitle: "Alasan penghapusan data:",
    reasonOptions: [
      { id: "duplicate", label: "Data duplikat / ganda" },
      { id: "input_error", label: "Kesalahan input operator" },
      { id: "system_test", label: "Data testing / percobaan" },
      { id: "cancelled", label: "Transaksi dibatalkan" },
    ],
  };

  const formatWeight = (val) => (val ? `${parseFloat(val).toFixed(2)}` : "-");

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = filteredItems.map((i) => i.id);
      setSelectedIds(allIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((currentId) => currentId !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteDialog(true);
  };

  /**
   * ✅ FIX: Bulk delete juga pakai timbanganService.deleteItem
   */
  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const item = items.find((i) => i.id === id);
          // ✅ deleteItem tahu mau hapus ke store mana berdasarkan status
          return timbanganService.deleteItem(id, item?.status || "pending");
        }),
      );
      setSelectedIds([]);
      setBulkDeleteDialog(false);
      loadData();

      const remainingItems = items.length - selectedIds.length;
      const maxPage = Math.ceil(remainingItems / itemsPerPage);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    } catch (e) {
      console.error("Bulk delete failed", e);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const bulkDeleteDialogConfig = {
    title: `Hapus ${selectedIds.length} Data Timbangan`,
    warningMessage: `Sebanyak ${selectedIds.length} data timbangan yang dipilih akan dihapus permanen dari antrian lokal dan tidak dapat dikembalikan.`,
    step1Question: `Apakah Anda yakin ingin menghapus ${selectedIds.length} data timbangan yang dipilih?`,
    reasonsTitle: "Alasan penghapusan data:",
    reasonOptions: [
      { id: "bulk_duplicate", label: "Data duplikat / ganda" },
      { id: "bulk_input_error", label: "Kesalahan input operator" },
      { id: "bulk_system_test", label: "Data testing / percobaan" },
      { id: "bulk_cancelled", label: "Transaksi dibatalkan" },
    ],
  };

  const handleBulkSync = async () => {
    if (selectedIds.length === 0) return;

    setIsBulkSyncing(true);
    setSyncError(null);
    try {
      // Ambil semua item yang dipilih (pending maupun failed)
      const selectedItems = items.filter(
        (i) =>
          selectedIds.includes(i.id) &&
          (i.status === "pending" || i.status === "failed"),
      );

      // Pending: sync langsung. Failed: hapus dari failed store dulu, lalu sync
      await Promise.all(
        selectedItems.map(async (item) => {
          if (item.status === "failed") {
            await offlineService.deleteFailedItem(item.id);
            return offlineService.syncQueueItem({
              ...item,
              status: "pending",
              retryCount: 0,
            });
          }
          return offlineService.syncQueueItem(item);
        }),
      );

      setSelectedIds([]);
      loadData();
    } catch (e) {
      console.error("Bulk sync failed", e);
      const message =
        e?.extractedMessage ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Bulk sinkronisasi gagal";
      setSyncError(message);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  /**
   * Sync single item — ambil dari state React, lalu sync via offlineService
   * Tidak query IDB lagi untuk menghindari type mismatch id integer vs string
   */
  const handleSyncSingle = async (itemId) => {
    if (!isOnline) return;

    setSyncError(null);
    setSyncingIds((prev) => [...prev, itemId]);
    try {
      // Ambil dari state React — sudah ada semua data yang dibutuhkan
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        throw new Error("Item tidak ditemukan di antrian");
      }
      // syncQueueItem butuh: { id, url, method, data, options }
      const result = await offlineService.syncQueueItem(item);
      if (!result.success) {
        throw result.error instanceof Error
          ? result.error
          : new Error(result.error || "Sinkronisasi gagal");
      }
      loadData();
    } catch (e) {
      console.error("Sync single failed", e);
      const message =
        e?.extractedMessage ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Sinkronisasi gagal";
      setSyncError(message);
    } finally {
      setSyncingIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  /**
   * Retry a single failed item — ambil dari state React, sync langsung
   * Bypass offlineService.retrySingle karena id type mismatch di IDB failed_queue
   */
  const handleRetrySingle = async (itemId) => {
    if (!isOnline) return;

    setSyncError(null);
    setSyncingIds((prev) => [...prev, itemId]);
    try {
      // Ambil dari state React — sudah ada semua data yang dibutuhkan
      const item = items.find((i) => i.id === itemId);
      if (!item) throw new Error("Item tidak ditemukan");

      // Hapus dari failed queue dulu via offlineService (pakai id asli)
      await offlineService.deleteFailedItem(item.id);

      // Sync langsung tanpa perlu pindah ke queue dulu
      const result = await offlineService.syncQueueItem({
        ...item,
        status: "pending",
        retryCount: 0,
      });

      if (!result.success) {
        throw result.error instanceof Error
          ? result.error
          : new Error(result.error || "Sinkronisasi gagal");
      }

      loadData();
    } catch (e) {
      console.error("Retry single failed", e);
      const message =
        e?.extractedMessage ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Sinkronisasi gagal";
      setSyncError(message);
    } finally {
      setSyncingIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  /**
   * Extract error info to display under status badge.
   */
  const getErrorInfo = (item) => {
    if (item.status === "failed") {
      const msg = item.errorResponse?.message || item.error || null;
      const httpStatus = item.errorResponse?.httpStatus ?? null;
      if (!msg) return null;
      return { message: msg, httpStatus };
    }
    if (item.status === "pending" && item.retryCount > 0) {
      const msg = item.lastErrorResponse?.message || item.lastError || null;
      const httpStatus = item.lastErrorResponse?.httpStatus ?? null;
      if (!msg) return null;
      return { message: msg, httpStatus };
    }
    return null;
  };

  /**
   * Get expiry warning for sent items
   */
  const getExpiryWarning = (item) => {
    if (item.status !== "sent" || !item.sentAt) return null;

    const retentionMs = 8 * 60 * 60 * 1000;
    const warningThreshold = 7 * 60 * 60 * 1000;

    const age = Date.now() - item.sentAt;
    const timeLeft = retentionMs - age;

    if (timeLeft <= 0) {
      return {
        show: true,
        message: "Data akan segera dihapus",
        urgent: true,
      };
    }

    if (age >= warningThreshold) {
      const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
      return {
        show: true,
        message: `Akan dihapus dalam ${minutesLeft} menit`,
        urgent: minutesLeft <= 15,
      };
    }

    return null;
  };

  /**
   * Calculate statistics from items
   */
  const counts = useMemo(() => {
    const stats = {
      pending: items.filter((i) => i.status === "pending").length,
      failed: items.filter((i) => i.status === "failed").length,
      sent: items.filter((i) => i.status === "sent").length,
    };

    const expiringItems = items.filter((i) => {
      const warning = getExpiryWarning(i);
      return warning?.show;
    });

    stats.expiringSoon = expiringItems.length;
    stats.total = stats.pending + stats.failed + stats.sent;

    return stats;
  }, [items]);

  return (
    <>
      {/* Sync Error Banner */}
      {syncError && (
        <div className="mb-4 flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              Sinkronisasi Gagal
            </p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
              {syncError}
            </p>
          </div>
          <button
            onClick={() => setSyncError(null)}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-lg leading-none"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <Card className="bg-white dark:bg-gray-900 border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {counts.pending}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Menunggu sinkronisasi
                </p>
              </div>
              <div className="relative">
                <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Gagal
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {counts.failed}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Perlu dicoba ulang
                </p>
              </div>
              <div className="relative">
                <XCircle className="w-10 h-10 text-red-500 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-900 border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Terkirim
                </p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {counts.sent}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Tersimpan 8 jam
                </p>
              </div>
              <div className="relative">
                <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-white dark:bg-gray-900 border-l-4 shadow-sm hover:shadow-md transition-shadow ${
            counts.expiringSoon > 0
              ? "border-l-orange-500"
              : "border-l-gray-300 dark:border-l-gray-600"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Segera Expire
                </p>
                <h3
                  className={`text-2xl font-bold mt-1 ${
                    counts.expiringSoon > 0
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {counts.expiringSoon}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {counts.expiringSoon > 0 ? "< 1 jam lagi" : "Tidak ada"}
                </p>
              </div>
              <div className="relative">
                <AlertTriangle
                  className={`w-10 h-10 ${
                    counts.expiringSoon > 0
                      ? "text-orange-500 opacity-30 animate-pulse"
                      : "text-gray-400 opacity-20"
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning Banner for Expiring Items */}
      {counts.expiringSoon > 0 && (
        <div className="mb-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                Perhatian: Data Akan Segera Dihapus
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                {counts.expiringSoon} data terkirim akan dihapus otomatis dalam
                kurang dari 1 jam. Data terkirim hanya disimpan selama 8 jam
                untuk menghemat penyimpanan lokal.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="bg-white dark:bg-gray-900 shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-3">
            {/* Title + Bulk Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <List className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Antrian Data Timbangan
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {statusFilter === "all"
                      ? `Total ${counts.total} data dalam antrian`
                      : `Menampilkan ${filteredItems.length} data ${
                          statusFilter === "pending"
                            ? "pending"
                            : statusFilter === "failed"
                              ? "gagal"
                              : "terkirim"
                        }`}
                  </p>
                </div>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedIds.length} terpilih
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkSync}
                    disabled={isBulkSyncing}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-1 ${isBulkSyncing ? "animate-spin" : ""}`}
                    />
                    Sync
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Hapus
                  </Button>
                </div>
              )}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    key: "all",
                    label: "Semua",
                    count: counts.total,
                    color: "blue",
                  },
                  {
                    key: "pending",
                    label: "Pending",
                    count: counts.pending,
                    color: "yellow",
                  },
                  {
                    key: "failed",
                    label: "Gagal",
                    count: counts.failed,
                    color: "red",
                  },
                  {
                    key: "sent",
                    label: "Terkirim",
                    count: counts.sent,
                    color: "green",
                  },
                ].map(({ key, label, count, color }) => {
                  const isActive = statusFilter === key;
                  const colorMap = {
                    blue: isActive
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 hover:text-blue-600",
                    yellow: isActive
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-yellow-300 hover:text-yellow-600",
                    red: isActive
                      ? "bg-red-600 text-white border-red-600"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300 hover:text-red-600",
                    green: isActive
                      ? "bg-green-600 text-white border-green-600"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-green-300 hover:text-green-600",
                  };
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-150 cursor-pointer ${colorMap[color]}`}
                    >
                      {label}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          isActive
                            ? "bg-white/20"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Cari Unit DT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Select All filtered */}
                {filteredItems.length > 0 && (
                  <button
                    onClick={() => {
                      const allFilteredIds = filteredItems.map((i) => i.id);
                      const allSelected = allFilteredIds.every((id) =>
                        selectedIds.includes(id),
                      );
                      if (allSelected) {
                        setSelectedIds((prev) =>
                          prev.filter((id) => !allFilteredIds.includes(id)),
                        );
                      } else {
                        setSelectedIds((prev) => [
                          ...new Set([...prev, ...allFilteredIds]),
                        ]);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 lg:py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-all duration-150 cursor-pointer w-full lg:w-auto justify-center"
                  >
                    {filteredItems.every((i) => selectedIds.includes(i.id))
                      ? "Batal Pilih Semua"
                      : `Pilih Semua ${statusFilter !== "all" || searchTerm ? `(${filteredItems.length})` : ""}`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Mobile View - Cards */}
          <div className="md:hidden space-y-3">
            {paginatedItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <List className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Tidak ada antrian data saat ini.</p>
              </div>
            ) : (
              paginatedItems.map((item, index) => {
                const data = item.data || {};
                const globalIndex =
                  (currentPage - 1) * itemsPerPage + index + 1;
                const isSelected = selectedIds.includes(item.id);
                const expiryWarning = getExpiryWarning(item);
                const errorInfo = getErrorInfo(item);
                return (
                  <Card
                    key={item.id}
                    className={`border ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : "border-gray-200 dark:border-gray-800"
                    } ${
                      expiryWarning?.urgent
                        ? "border-l-4 border-l-orange-500"
                        : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={(e) =>
                              handleSelectOne(item.id, e.target.checked)
                            }
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              #{globalIndex} - {data.hull_no || "-"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {data.timestamp
                                ? format(
                                    new Date(data.timestamp),
                                    "dd/MM/yyyy HH:mm:ss",
                                    { locale: localeId },
                                  )
                                : "-"}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            item.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          className={`flex items-center gap-1 text-xs font-medium ${
                            item.status === "failed"
                              ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                              : item.status === "sent"
                                ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                                : "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
                          }`}
                        >
                          {item.status === "pending" ? (
                            <Clock className="w-3 h-3" />
                          ) : item.status === "sent" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {item.status === "pending"
                            ? "Pending"
                            : item.status === "failed"
                              ? "Gagal"
                              : "Terkirim"}
                        </Badge>
                      </div>

                      {expiryWarning?.show && (
                        <div
                          className={`flex items-center gap-2 text-xs mb-3 px-2 py-1.5 rounded ${
                            expiryWarning.urgent
                              ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                              : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
                          }`}
                        >
                          <AlertTriangle
                            className={`w-4 h-4 flex-shrink-0 ${
                              expiryWarning.urgent ? "animate-pulse" : ""
                            }`}
                          />
                          <span className="font-medium">
                            {expiryWarning.message}
                          </span>
                        </div>
                      )}

                      {errorInfo && (
                        <div
                          className={`flex items-start gap-1.5 text-[11px] px-2 py-1.5 rounded border mb-2 ${
                            item.status === "failed"
                              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                              : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400"
                          }`}
                        >
                          <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="leading-tight">
                            {errorInfo.httpStatus && (
                              <span className="font-semibold mr-1">
                                [{errorInfo.httpStatus}]
                              </span>
                            )}
                            {errorInfo.message}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Gross
                          </div>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatWeight(data.gross_weight)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Tare
                          </div>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatWeight(data.tare_weight)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Net
                          </div>
                          <div className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatWeight(data.net_weight)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                        {item.status === "pending" && isOnline && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-green-600 hover:text-green-700 dark:text-green-400"
                            onClick={() => handleSyncSingle(item.id)}
                            disabled={syncingIds.includes(item.id)}
                          >
                            <RefreshCw
                              className={`w-3 h-3 mr-1 ${syncingIds.includes(item.id) ? "animate-spin" : ""}`}
                            />
                            {syncingIds.includes(item.id)
                              ? "Syncing..."
                              : "Sync"}
                          </Button>
                        )}
                        {item.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            onClick={() => handleRetrySingle(item.id)}
                            disabled={syncingIds.includes(item.id)}
                          >
                            <RefreshCw
                              className={`w-3 h-3 mr-1 ${syncingIds.includes(item.id) ? "animate-spin" : ""}`}
                            />
                            {syncingIds.includes(item.id)
                              ? "Retrying..."
                              : "Retry"}
                          </Button>
                        )}
                        {/* ✅ Tombol hapus aktif (tidak di-comment) */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 hover:text-red-700 dark:text-red-400"
                          onClick={() => handleDeleteClick(item)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((i) => selectedIds.includes(i.id))
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead className="w-[50px] text-gray-700 dark:text-gray-300 font-semibold">
                    No
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                    Unit DT
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                    Waktu
                  </TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">
                    Gross
                  </TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">
                    Tare
                  </TableHead>
                  <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">
                    Net
                  </TableHead>
                  <TableHead className="text-center text-gray-700 dark:text-gray-300 font-semibold">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-gray-500 dark:text-gray-400"
                    >
                      {statusFilter !== "all"
                        ? `Tidak ada data dengan status "${statusFilter === "pending" ? "Pending" : statusFilter === "failed" ? "Gagal" : "Terkirim"}".`
                        : "Tidak ada antrian data saat ini."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item, index) => {
                    const data = item.data || {};
                    const globalIndex =
                      (currentPage - 1) * itemsPerPage + index + 1;
                    const isSelected = selectedIds.includes(item.id);
                    const expiryWarning = getExpiryWarning(item);
                    const errorInfo = getErrorInfo(item);

                    return (
                      <TableRow
                        key={item.id}
                        className={`border-b border-gray-200 dark:border-gray-800 
                            hover:bg-gray-50 dark:hover:bg-gray-800/50
                            transition-colors duration-150 ${
                              expiryWarning?.urgent
                                ? "bg-orange-50/50 dark:bg-orange-950/10"
                                : ""
                            }`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={(e) =>
                              handleSelectOne(item.id, e.target.checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                          {globalIndex}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 font-medium">
                          {data.hull_no || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                item.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={`flex w-fit items-center gap-1 text-xs font-medium ${
                                item.status === "failed"
                                  ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                                  : item.status === "sent"
                                    ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                                    : "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
                              }`}
                            >
                              {item.status === "pending" ? (
                                <Clock className="w-3 h-3" />
                              ) : item.status === "sent" ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {item.status === "pending"
                                ? "Pending"
                                : item.status === "sent"
                                  ? item.isDuplicate
                                    ? "Berhasil Terkirim"
                                    : "Terkirim"
                                  : "Gagal"}
                            </Badge>

                            {expiryWarning?.show && (
                              <div
                                className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border w-fit ${
                                  expiryWarning.urgent
                                    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 animate-pulse"
                                    : "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
                                }`}
                              >
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">
                                  {expiryWarning.message}
                                </span>
                              </div>
                            )}

                            {errorInfo && (
                              <div
                                className={`flex items-start gap-1 text-[10px] px-1.5 py-0.5 rounded border w-fit max-w-[180px] ${
                                  item.status === "failed"
                                    ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                                    : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400"
                                }`}
                              >
                                <XCircle className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span className="leading-tight break-words">
                                  {errorInfo.httpStatus && (
                                    <span className="font-semibold mr-0.5">
                                      [{errorInfo.httpStatus}]
                                    </span>
                                  )}
                                  {errorInfo.message}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 font-medium">
                          {data.timestamp
                            ? format(
                                new Date(data.timestamp),
                                "dd/MM/yyyy HH:mm:ss",
                                { locale: localeId },
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-gray-700 dark:text-gray-300 font-mono">
                          {formatWeight(data.gross_weight)}
                        </TableCell>
                        <TableCell className="text-right text-gray-700 dark:text-gray-300 font-mono">
                          {formatWeight(data.tare_weight)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-gray-900 dark:text-gray-100 font-mono">
                          {formatWeight(data.net_weight)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <PrintBukti
                              data={data}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 
                                    hover:bg-blue-50 dark:hover:bg-blue-900/20
                                    transition-all duration-200 items-center"
                            >
                              <p className="text-center"></p>
                            </PrintBukti>
                            {item.status === "sent" && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 
                                    hover:bg-green-50 dark:hover:bg-green-900/20
                                    transition-all duration-200"
                                  title="Delivered"
                                  disabled={true}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {item.status === "pending" && isOnline && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 
                                    hover:bg-yellow-50 dark:hover:bg-yellow-900/20
                                    transition-all duration-200"
                                title="Sync Now"
                                onClick={() => handleSyncSingle(item.id)}
                                disabled={syncingIds.includes(item.id)}
                              >
                                <RefreshCw
                                  className={`w-4 h-4 ${syncingIds.includes(item.id) ? "animate-spin" : ""}`}
                                />
                              </Button>
                            )}
                            {item.status === "failed" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 
                                    hover:bg-blue-50 dark:hover:bg-blue-900/20
                                    transition-all duration-200"
                                title="Retry"
                                onClick={() => handleRetrySingle(item.id)}
                                disabled={syncingIds.includes(item.id)}
                              >
                                <RefreshCw
                                  className={`w-4 h-4 ${syncingIds.includes(item.id) ? "animate-spin" : ""}`}
                                />
                              </Button>
                            )}
                            {/* ✅ Tombol hapus aktif untuk semua status */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 
                                hover:bg-red-50 dark:hover:bg-red-900/20
                                transition-all duration-200"
                              onClick={() => handleDeleteClick(item)}
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            totalItems={items.length}
          />
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}
        onConfirm={confirmDelete}
        target={null}
        assignedCount={0}
        customConfig={deleteDialogConfig}
        actionType="delete"
      />

      <DeleteConfirmDialog
        isOpen={bulkDeleteDialog}
        onClose={() => setBulkDeleteDialog(false)}
        onConfirm={confirmBulkDelete}
        target={null}
        assignedCount={0}
        isProcessing={isBulkDeleting}
        customConfig={bulkDeleteDialogConfig}
        actionType="delete"
      />
    </>
  );
};
