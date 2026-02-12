import React, { useEffect, useCallback, useState } from "react";
import { TimbanganInputCard } from "./components/TimbanganInputCard";
import { TimbanganList } from "./components/TimbanganList";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { WifiOff, Wifi, Maximize, Minimize, ExternalLink, User, Edit2 } from "lucide-react";
import { useOffline } from "@/shared/components/OfflineProvider";
import { useFleet } from "../fleet/hooks/useFleet";
import { calculateCurrentShiftAndGroup } from "@/shared/utils/group";
import useAuthStore from "@/modules/auth/store/authStore";
import OperatorNameModal from "./components/OperatorNameModal";

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

  // Check if operator name exists on mount
  useEffect(() => {
    const savedName = localStorage.getItem("operator_sib_name");
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
    const savedName = localStorage.getItem("operator_sib_name");
    if (savedName) {
      setShowOperatorModal(false);
    }
  };

  const handleOpenRitase = useCallback(() => {
    // Buka halaman dengan menu Ritase di tab baru
    const url = window.location.origin + window.location.pathname + '?menu=Ritase';
    window.open(url, '_blank');
  }, []);

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
          <div className="flex flex-col md:flex-row items-center text-center md:text-left md:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Timbangan
              </h1>
              <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Operator:{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {operatorName || user?.name || user?.username || "User"}
                  </span>
                </p>
                <button
                  onClick={handleOpenOperatorModal}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  title="Edit Nama Operator"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
                 {/* Date, Time, Shift Info - Responsive Grid */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs sm:text-sm md:text-base ">
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

            {/* Group dan Shift dalam satu wrapper agar selalu 1 baris di bawah md */}
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
          </div>

            {/* Status Indicators - Mobile: Stack, Desktop: Inline */}
            <div className="flex flex-row items-center gap-2">
              {/* Online/Offline Status */}
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
              
              {/* Button Buka Ritase di Tab Baru */}
              <button
                onClick={handleOpenRitase}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Buka Ritase di Tab Baru"
              >
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500 dark:text-purple-400" />
                <span className="text-purple-600 dark:text-purple-400">
                  Ritase
                </span>
              </button>

              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Toggle Fullscreen (F11 atau Alt+F)"
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-blue-600 dark:text-blue-400 hidden xs:inline">
                      Exit
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 xs:hidden">
                      Exit Fullscreen
                    </span>
                  </>
                ) : (
                  <>
                    <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-blue-600 dark:text-blue-400">
                      Fullscreen
                    </span>
                  </>
                )}
              </button>
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
            <TimbanganInputCard fleetConfigs={dumptruckData} operatorName={operatorName} />
          </section>

          {/* Queue List Section - Takes full width on mobile, 8 columns on large screens */}
          <section className="lg:col-span-8 xl:col-span-9">
            <TimbanganList />
          </section>
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