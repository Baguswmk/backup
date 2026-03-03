import React, { useState, useEffect } from "react";
import { useOffline } from "@/shared/components/OfflineProvider";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Loader2,
  Database,
  Clock,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  List,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const OfflineSyncStatus = () => {
  const {
    isOnline,
    syncStatus,
    syncPendingData,
    retryFailed,
    clearOfflineData,
    canSync,
    hasPendingData,
    getQueueDetails,
    deleteQueueItem,
    isTimbanganPage, // ✅ NEW: Context detection
  } = useOffline();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [queueDetails, setQueueDetails] = useState({
    pending: [],
    failed: [],
    sent: [],
  });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Load queue details ketika showDetails true
  useEffect(() => {
    if (showDetails && getQueueDetails) {
      loadQueueDetails();
    }
  }, [showDetails, syncStatus.lastSync]);

  const loadQueueDetails = async () => {
    setLoadingDetails(true);
    try {
      const details = await getQueueDetails();
      setQueueDetails(details);
    } catch (error) {
      console.error("Failed to load queue details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSync = async () => {
    if (!canSync) return;
    syncPendingData().catch((err) => {
      console.error("Sync error:", err);
    });
  };

  const handleRetry = async () => {
    retryFailed().catch((err) => {
      console.error("Retry error:", err);
    });
  };

  const handleClearConfirm = () => {
    setShowConfirmClear(true);
  };

  const handleClearExecute = async () => {
    setShowConfirmClear(false);
    setIsClearing(true);

    try {
      await clearOfflineData();
      setQueueDetails({ pending: [], failed: [], sent: [] });
    } catch (error) {
      console.error("Clear error:", error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearCancel = () => {
    setShowConfirmClear(false);
  };

  const handleToggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleDeleteItem = async (id, type) => {
    if (!deleteQueueItem) {
      console.error("deleteQueueItem not available");
      return;
    }

    setDeletingId(id);
    try {
      await deleteQueueItem(id, type);
      // Reload details after delete
      await loadQueueDetails();
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getMethodBadgeColor = (method) => {
    const colors = {
      POST: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      PUT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      PATCH:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return (
      colors[method] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
    );
  };

  const formatUrl = (url) => {
    if (!url) return "Unknown";
    // Extract meaningful part of URL
    const parts = url.split("/");
    return parts.slice(-2).join("/") || url;
  };

  const getTransactionData = (item) => {
    const data = item.data || {};
    return {
      unit: data.hull_no || data.unit || "-",
      grossWeight: data.gross_weight || 0,
      tareWeight: data.tare_weight || 0,
      netWeight:
        data.net_weight ||
        (data.gross_weight && data.tare_weight
          ? data.gross_weight - data.tare_weight
          : 0),
      timestamp: item.clientTimestamp || item.createdAtClient || item.timestamp,
    };
  };

  const formatWeight = (weight) => {
    if (!weight || weight === 0) return "-";
    return `${weight.toFixed(2)} ton`;
  };

  // ✅ Context-aware total items calculation
  const totalItems = isTimbanganPage
    ? syncStatus.pendingCount + syncStatus.failedCount + syncStatus.sentCount
    : syncStatus.pendingCount;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div
        className={`
        bg-neutral-50 dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-all
        ${isOnline ? "border-green-500 dark:border-green-600" : "border-orange-500 dark:border-orange-600"}
      `}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            ) : (
              <WifiOff className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
            )}

            {isExpanded && (
              <div>
                <div className="font-semibold text-sm dark:text-gray-200">
                  {isOnline ? "Online" : "Offline"}
                </div>
                {/* ✅ Context-aware badge display */}
                {totalItems > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isTimbanganPage ? (
                      // Timbangan: Show P · F · S
                      <>
                        {syncStatus.pendingCount}P · {syncStatus.failedCount}F ·{" "}
                        {syncStatus.sentCount}S
                      </>
                    ) : (
                      // Other pages: Show only pending
                      <>{syncStatus.pendingCount} pending</>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {syncStatus.isSyncing && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            )}

            {hasPendingData && !syncStatus.isSyncing && (
              <Badge
                variant="warning"
                className="text-xs dark:bg-yellow-900/30 dark:text-yellow-300"
              >
                {syncStatus.pendingCount}
              </Badge>
            )}

            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-3 space-y-3 border-t dark:border-gray-700">
            {/* Stats Grid - ✅ Context-aware */}
            {isTimbanganPage ? (
              // Timbangan: Show all 3 stats
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-[10px] font-medium text-yellow-700 dark:text-yellow-300">
                      Pending
                    </span>
                  </div>
                  <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                    {syncStatus.pendingCount}
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                    <span className="text-[10px] font-medium text-red-700 dark:text-red-300">
                      Gagal
                    </span>
                  </div>
                  <div className="text-lg font-bold text-red-900 dark:text-red-100">
                    {syncStatus.failedCount}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-[10px] font-medium text-green-700 dark:text-green-300">
                      Terkirim
                    </span>
                  </div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    {syncStatus.sentCount}
                  </div>
                </div>
              </div>
            ) : (
              // Other pages: Show only pending
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    Pending Sync
                  </span>
                </div>
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {syncStatus.pendingCount}
                </div>
              </div>
            )}

            {/* Last Sync Time */}
            {syncStatus.lastSync && (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Terakhir sync:{" "}
                {format(new Date(syncStatus.lastSync), "dd/MM HH:mm", {
                  locale: localeId,
                })}
              </div>
            )}

            {/* Details Toggle */}
            {totalItems > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleDetails}
                className="w-full text-xs dark:border-gray-600 dark:hover:bg-gray-700 cursor-pointer dark:text-neutral-50"
              >
                <List className="w-3 h-3 mr-1" />
                {showDetails ? "Sembunyikan Detail" : "Lihat Detail Transaksi"}
              </Button>
            )}

            {/* Queue Details */}
            {showDetails && (
              <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2 border dark:border-gray-700 rounded p-2">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    {/* Pending Items - Always show */}
                    {queueDetails.pending.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-300 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          MENUNGGU ({queueDetails.pending.length})
                        </div>
                        {queueDetails.pending.slice(0, 3).map((item) => {
                          const txData = getTransactionData(item);
                          return (
                            <div
                              key={item.id}
                              className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded p-2 mb-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0 text-xs">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Badge
                                      className={getMethodBadgeColor(
                                        item.method,
                                      )}
                                    >
                                      {item.method}
                                    </Badge>
                                    <span className="text-gray-600 dark:text-gray-400 truncate font-medium">
                                      {txData.unit}
                                    </span>
                                  </div>

                                  {/* ✅ Show weight details only for timbangan */}
                                  {isTimbanganPage && (
                                    <div className="grid grid-cols-3 gap-2 mb-1 text-gray-700 dark:text-gray-300">
                                      <div>
                                        <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                          Gross
                                        </div>
                                        <div className="font-medium text-[11px]">
                                          {formatWeight(txData.grossWeight)}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                          Tare
                                        </div>
                                        <div className="font-medium text-[11px]">
                                          {formatWeight(txData.tareWeight)}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                          Net
                                        </div>
                                        <div className="font-medium text-[11px]">
                                          {formatWeight(txData.netWeight)}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="text-gray-500 dark:text-gray-500 flex items-center gap-1 text-[10px]">
                                    <Clock className="w-3 h-3" />
                                    {format(
                                      new Date(txData.timestamp),
                                      "dd/MM HH:mm:ss",
                                      { locale: localeId },
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteItem(item.id, "pending")
                                  }
                                  disabled={deletingId === item.id}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        {queueDetails.pending.length > 3 && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                            +{queueDetails.pending.length - 3} lainnya
                          </div>
                        )}
                      </div>
                    )}

                    {/* Failed Items - ✅ ONLY for Timbangan */}
                    {isTimbanganPage && queueDetails.failed.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-red-700 dark:text-red-300 mb-1 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          GAGAL ({queueDetails.failed.length})
                        </div>
                        {queueDetails.failed.slice(0, 3).map((item) => {
                          const txData = getTransactionData(item);
                          return (
                            <div
                              key={item.id}
                              className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded p-2 mb-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0 text-xs">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Badge
                                      className={getMethodBadgeColor(
                                        item.method,
                                      )}
                                    >
                                      {item.method}
                                    </Badge>
                                    <span className="text-gray-600 dark:text-gray-400 truncate font-medium">
                                      {txData.unit}
                                    </span>
                                  </div>

                                  {/* ✅ Error Message */}
                                  <div className="text-red-600 dark:text-red-400 text-[10px] mb-1 flex items-start gap-1">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                    <span className="line-clamp-2">
                                      {item.error || "Unknown error"}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 mb-1 text-gray-700 dark:text-gray-300">
                                    <div>
                                      <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                        Gross
                                      </div>
                                      <div className="font-medium text-[11px]">
                                        {formatWeight(txData.grossWeight)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                        Tare
                                      </div>
                                      <div className="font-medium text-[11px]">
                                        {formatWeight(txData.tareWeight)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                        Net
                                      </div>
                                      <div className="font-medium text-[11px]">
                                        {formatWeight(txData.netWeight)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-gray-500 dark:text-gray-500 flex items-center gap-1 text-[10px]">
                                    <XCircle className="w-3 h-3" />
                                    {format(
                                      new Date(
                                        item.failedAt || txData.timestamp,
                                      ),
                                      "dd/MM HH:mm:ss",
                                      { locale: localeId },
                                    )}
                                    {item.retryCount > 0 && (
                                      <span className="ml-1">
                                        · Retry: {item.retryCount}x
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteItem(item.id, "failed")
                                  }
                                  disabled={deletingId === item.id}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        {queueDetails.failed.length > 3 && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                            +{queueDetails.failed.length - 3} lainnya
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sent Items - ✅ ONLY for Timbangan */}
                    {isTimbanganPage && queueDetails.sent.length > 0 && (
                      <div>
                        <div className="text-[10px] font-semibold text-green-700 dark:text-green-300 mb-1 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          TERKIRIM ({queueDetails.sent.length})
                          <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                            - Tersimpan 8 jam
                          </span>
                        </div>
                        {queueDetails.sent.slice(0, 3).map((item) => {
                          const txData = getTransactionData(item);
                          return (
                            <div
                              key={item.id}
                              className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded p-2 mb-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0 text-xs">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Badge
                                      className={getMethodBadgeColor(
                                        item.method,
                                      )}
                                    >
                                      {item.method}
                                    </Badge>
                                    <span className="text-gray-600 dark:text-gray-400 truncate font-medium">
                                      {txData.unit}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 mb-1 text-gray-700 dark:text-gray-300">
                                    <div>
                                      <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                        Gross
                                      </div>
                                      <div className="font-medium text-[11px]">
                                        {formatWeight(txData.grossWeight)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                        Tare
                                      </div>
                                      <div className="font-medium text-[11px]">
                                        {formatWeight(txData.tareWeight)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-500 dark:text-gray-500 text-[10px]">
                                        Net
                                      </div>
                                      <div className="font-medium text-[11px]">
                                        {formatWeight(txData.netWeight)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-gray-500 dark:text-gray-500 flex items-center gap-1 text-[10px]">
                                    <CheckCircle className="w-3 h-3" />
                                    {format(
                                      new Date(item.sentAt || txData.timestamp),
                                      "dd/MM HH:mm:ss",
                                      { locale: localeId },
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteItem(item.id, "sent")
                                  }
                                  disabled={deletingId === item.id}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        {queueDetails.sent.length > 3 && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                            +{queueDetails.sent.length - 3} lainnya
                          </div>
                        )}
                      </div>
                    )}

                    {/* ✅ Context-aware empty state */}
                    {queueDetails.pending.length === 0 &&
                      queueDetails.failed.length === 0 &&
                      queueDetails.sent.length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
                          {isTimbanganPage
                            ? "Tidak ada transaksi timbangan offline"
                            : "Tidak ada transaksi offline"}
                        </div>
                      )}
                  </>
                )}
              </div>
            )}

            {/* Warning Alert */}
            {!isOnline && (
              <Alert
                variant="warning"
                className="py-2 dark:bg-orange-900/20 dark:border-orange-700"
              >
                <AlertDescription className="text-xs dark:text-gray-300">
                  Mode offline aktif. Data akan disimpan lokal. Sinkronisasi
                  manual saat online.
                </AlertDescription>
              </Alert>
            )}

            {/* Confirmation Dialog for Clear */}
            {showConfirmClear && (
              <Alert
                variant="destructive"
                className="py-2 dark:bg-red-900/20 dark:border-red-700"
              >
                <AlertDescription className="text-xs space-y-2 dark:text-gray-300">
                  <p className="font-medium">
                    Yakin ingin menghapus semua data offline?
                  </p>
                  <p>Data yang belum tersinkron akan hilang.</p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleClearExecute}
                      className="flex-1 dark:bg-red-900 dark:hover:bg-red-800 cursor-pointer"
                    >
                      Ya, Hapus
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearCancel}
                      className="flex-1 dark:border-gray-600 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      Batal
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            {!showConfirmClear && (
              <div className="space-y-2">
                {isOnline && hasPendingData && (
                  <Button
                    size="sm"
                    onClick={handleSync}
                    disabled={!canSync}
                    className="w-full dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-200 cursor-pointer"
                  >
                    {syncStatus.isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyinkronkan...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sinkronkan Sekarang
                      </>
                    )}
                  </Button>
                )}

                {syncStatus.failedCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={!isOnline || syncStatus.isSyncing}
                    className="w-full dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Ulangi Gagal ({syncStatus.failedCount})
                  </Button>
                )}

                {totalItems > 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleClearConfirm}
                    disabled={isClearing || syncStatus.isSyncing}
                    className="w-full dark:bg-red-900 dark:hover:bg-red-800 cursor-pointer"
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Hapus Semua Offline
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  Menunggu koneksi internet
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
