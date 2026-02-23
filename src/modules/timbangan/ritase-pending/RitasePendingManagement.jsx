import React, { useEffect, useRef, useState } from "react";
import { RitasePendingCard } from "./components/RitasePendingCard";
import { RitasePendingList } from "./components/RitasePendingList";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useOffline } from "@/shared/components/OfflineProvider";
import { calculateCurrentShiftAndGroup } from "@/shared/utils/group";
import useAuthStore from "@/modules/auth/store/authStore";

const RitasePendingManagement = () => {
  const { isOnline } = useOffline();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftInfo, setShiftInfo] = useState(() =>
    calculateCurrentShiftAndGroup(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const user = useAuthStore((state) => state.user);

  const refreshFnRef = useRef(null);

  const handleRegisterRefresh = (fn) => {
    refreshFnRef.current = fn;
  };

  const handleRefresh = async () => {
    if (!refreshFnRef.current) return;
    setIsRefreshing(true);
    try {
      await refreshFnRef.current();
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const toggleFullscreen = React.useCallback(() => {
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
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [toggleFullscreen]);

  return (
    <>
      <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center text-center md:text-left md:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Ritase Pending CCR
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Monitoring ritase yang menunggu konfirmasi dalam 8 jam terakhir
              </p>
            </div>

            {/* Date, Time, Shift, Online, Refresh */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs sm:text-sm md:text-base">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDayDate()}
                </span>
              </div>

              <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
                |
              </span>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {formatTime()}
                </span>
              </div>

              <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
                |
              </span>

              <div className="flex items-center gap-x-3">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 dark:text-gray-300">
                    Group{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {shiftInfo.activeGroup}
                    </span>
                  </span>
                </div>

                <span className="text-gray-400 dark:text-gray-500">|</span>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {shiftInfo.currentShift}
                  </span>
                </div>
              </div>

              {/* Online indicator + Refresh button — grouped together */}
              <div className="flex items-center gap-2">
                {/* Online/Offline pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700">
                  {isOnline ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">
                        Online
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 dark:text-orange-400" />
                      <span className="text-orange-600 dark:text-orange-400">
                        Offline
                      </span>
                    </>
                  )}
                </div>

                {/* Refresh button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  title="Refresh data"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <RitasePendingCard />

        {/* Main List — pass refresh registration callback */}
        <RitasePendingList onRegisterRefresh={handleRegisterRefresh} />

        <LoadingOverlay isVisible={isLoading} message="Memuat data ritase..." />
      </div>
    </>
  );
};

export default RitasePendingManagement;
