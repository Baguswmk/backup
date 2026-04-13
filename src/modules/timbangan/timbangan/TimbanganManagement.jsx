import React, { useEffect, useCallback, useState } from "react";
import { TimbanganInputCard } from "./components/TimbanganInputCard";
import { TimbanganList } from "./components/TimbanganList";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import {
  WifiOff,
  Wifi,
  Maximize,
  Minimize,
  ExternalLink,
  User,
  Edit2,
  RefreshCw,
  Database,
} from "lucide-react";
import { useOffline } from "@/shared/components/OfflineProvider";
import { useFleet } from "../fleet/hooks/useFleet";
import { calculateCurrentShiftAndGroup } from "@/shared/utils/group";
import useAuthStore from "@/modules/auth/store/authStore";
import OperatorNameModal from "./components/OperatorNameModal";
import { Button } from "@/shared/components/ui/button";
import { offlineService } from "@/shared/services/offlineService";
import { showToast } from "@/shared/utils/toast";

const TimbanganManagement = () => {
  const { isOnline } = useOffline();
  const { masters, mastersLoading } = useFleet();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftInfo, setShiftInfo] = useState(() =>
    calculateCurrentShiftAndGroup(),
  );
  const user = useAuthStore((state) => state.user);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [isRefreshingMasterData, setIsRefreshingMasterData] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState("timbangan");

  // Checker biasa = checker yang bukan checkpoint, tampilan mirip timbangan tapi tonase opsional
  const isCheckerMode =
    user?.role === "checker" && !user?.username?.includes("checkpoint");

  const handleRefreshMasterData = useCallback(async () => {
    setIsRefreshingMasterData(true);
    try {
      await offlineService.clearCache("timbangan:units:dump_truck");
      window.dispatchEvent(new CustomEvent("timbangan:refreshUnits"));
      window.dispatchEvent(new CustomEvent("timbangan:refreshManualMasters"));
      showToast.success("Data master berhasil dimuat ulang...");
    } catch (error) {
      console.error("Gagal refresh master timbangan:", error);
      showToast.error("Gagal memperbarui data master");
    } finally {
      setTimeout(() => setIsRefreshingMasterData(false), 1200);
    }
  }, []);

  useEffect(() => {
    const savedName = localStorage.getItem("internal_operator_sib_name");
    if (!savedName) {
      setShowOperatorModal(true);
    } else {
      setOperatorName(savedName);
    }
  }, []);

  const handleOperatorConfirm = (name) => {
    setOperatorName(name);
    setShowOperatorModal(false);
  };

  const handleOpenOperatorModal = () => {
    setShowOperatorModal(true);
  };

  const handleCloseOperatorModal = () => {
    const savedName = localStorage.getItem("internal_operator_sib_name");
    if (savedName) {
      setShowOperatorModal(false);
    }
  };

  const handleOpenRitase = useCallback(() => {
    // Buka halaman dengan menu Ritase di tab baru
    const url =
      window.location.origin + window.location.pathname + "?menu=Ritase";
    window.open(url, "_blank");
  }, []);

  // const handleRefresh = useCallback(async () => {
  //   setIsRefreshing(true);
  //   try {
  //     // Dispatch event untuk refresh TimbanganList
  //     window.dispatchEvent(new CustomEvent('timbangan:refresh'));

  //     // Tunggu sebentar untuk animasi
  //     await new Promise(resolve => setTimeout(resolve, 1000));
  //   } catch (error) {
  //     console.error('Refresh error:', error);
  //   } finally {
  //     setIsRefreshing(false);
  //   }
  // }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setShiftInfo(calculateCurrentShiftAndGroup(now));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDayDate = () => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return currentTime.toLocaleDateString("id-ID", options);
  };

  const formatTime = () => {
    const hours = String(currentTime.getHours()).padStart(2, "0");
    const minutes = String(currentTime.getMinutes()).padStart(2, "0");
    const seconds = String(currentTime.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const dumptruckData = masters?.dumpTruck;

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.error(`Error entering fullscreen: ${err.message}`);
      }
    };

    const timer = setTimeout(() => {
      enterFullscreen();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
      }

      if ((e.altKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        toggleFullscreen();
      }

      if (e.key === "Escape" && document.fullscreenElement) {
      }

      if ((e.altKey || e.metaKey) && e.key === "r") {
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [toggleFullscreen]);

  return (
    <>
      {/* Operator Name Modal */}
      <OperatorNameModal
        isOpen={showOperatorModal}
        onConfirm={handleOperatorConfirm}
        onClose={handleCloseOperatorModal}
      />

      <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Header Section - Responsive Layout */}
        <div className="space-y-4">
          {/* Title and Welcome */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {isCheckerMode ? "Checker" : "Timbangan"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                  Operator:{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {operatorName || user?.name || user?.username || "User"}
                  </span>
                </p>
                <Button
                  onClick={handleOpenOperatorModal}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer shrink-0"
                  title="Edit Nama Operator"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Right: Date/Time/Shift + Actions */}
            <div className="flex flex-col xs:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Date, Time, Shift Info */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {formatDayDate()}
                </span>
                <span className="text-gray-400 dark:text-gray-500">|</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {formatTime()}
                </span>
                <span className="text-gray-400 dark:text-gray-500">|</span>
                <span className="text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Grp{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {shiftInfo.activeGroup}
                  </span>
                </span>
                <span className="text-gray-400 dark:text-gray-500">|</span>
                <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {shiftInfo.currentShift}
                </span>
              </div>

              {/* Status Indicators */}
              <div className="flex flex-row items-center gap-2 shrink-0">
                {/* Online/Offline Status */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700">
                  {isOnline ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400 hidden sm:inline">
                        Online
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                      <span className="text-orange-600 dark:text-orange-400 hidden sm:inline">
                        Offline
                      </span>
                    </>
                  )}
                </div>

                {/* Refresh Master Data */}
                <Button
                  onClick={handleRefreshMasterData}
                  disabled={isRefreshingMasterData}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium border border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Refresh Master Data"
                >
                  <Database
                    className={`w-3.5 h-3.5 ${isRefreshingMasterData ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Master</span>
                </Button>

                {/* Buka Ritase */}
                <Button
                  onClick={handleOpenRitase}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Buka Ritase di Tab Baru"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                  <span className="text-purple-600 dark:text-purple-400 hidden sm:inline">
                    Ritase
                  </span>
                </Button>

                {/* Fullscreen Toggle */}
                <Button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Toggle Fullscreen (F11)"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-400 hidden sm:inline">
                        Exit
                      </span>
                    </>
                  ) : (
                    <>
                      <Maximize className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-400 hidden sm:inline">
                        Fullscreen
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Info - Responsive */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs sm:text-sm">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-blue-700 dark:text-blue-400">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 sm:py-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-xs">
                F11
              </kbd>
              <span className="hidden sm:inline">- Toggle Fullscreen</span>
              <span className="sm:hidden">- Fullscreen</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 sm:py-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-xs">
                Alt
              </kbd>
              <span>+</span>
              <kbd className="px-2 py-0.5 sm:py-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-xs">
                F
              </kbd>
              <span className="hidden sm:inline">- Toggle Fullscreen</span>
              <span className="sm:hidden">- Fullscreen</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 sm:py-1 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-xs">
                ESC
              </kbd>
              <span className="hidden sm:inline">- Exit Fullscreen</span>
              <span className="sm:hidden">- Exit</span>
            </span>
          </div>
        </div>

        {/* Main Content - Responsive Grid */}
        <div className="grid grid-cols-1">
          {/* Input Section - Takes full width on mobile, 4 columns on large screens */}
          <section className="lg:col-span-4 xl:col-span-3">
            <TimbanganInputCard
              fleetConfigs={dumptruckData}
              operatorName={operatorName}
              onTabChange={setActiveInputTab}
              mode={isCheckerMode ? "checker" : "default"}
            />
          </section>

          {/* Queue List Section - hidden on manual tab */}
          {activeInputTab !== "manual" && (
            <section className="lg:col-span-8 xl:col-span-9">
              <TimbanganList />
            </section>
          )}
        </div>

        <LoadingOverlay
          isVisible={mastersLoading}
          message="Memuat data dumptruck..."
        />
      </div>
    </>
  );
};

export default TimbanganManagement;
