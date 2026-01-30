import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Plus, RefreshCw, Database } from "lucide-react";
import { USER_ROLES } from "@/modules/timbangan/ritase/constant/ritaseConstants";
import { calculateCurrentShiftAndGroup } from "@/shared/utils/group";

const RitaseHeader = ({
  user,
  userRole,
  filteredFleetCount,
  isRefreshing,
  isInitialLoading,
  onRefresh,
  onOpenInputModal,
  onRefreshMasterData,
  isRefreshingMasterData,
  refreshButtonRef,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftInfo, setShiftInfo] = useState(() => calculateCurrentShiftAndGroup());

  // Update waktu dan shift setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setShiftInfo(calculateCurrentShiftAndGroup(now));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getInputButtonText = () => {
    return userRole === USER_ROLES.OPERATOR_JT ? "Timbang" : "Input Data";
  };

  const getInputButtonTextMobile = () => {
    return userRole === USER_ROLES.OPERATOR_JT ? "Timbang" : "Input";
  };

  // Format hari dan tanggal (contoh: Jumat, 30 Januari 2026)
  const formatDayDate = () => {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return currentTime.toLocaleDateString("id-ID", options);
  };

  // Format jam real-time (HH:MM:SS)
  const formatTime = () => {
    const hours = String(currentTime.getHours()).padStart(2, "0");
    const minutes = String(currentTime.getMinutes()).padStart(2, "0");
    const seconds = String(currentTime.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  const isCCR = userRole.toLowerCase().includes("ccr");
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between">

      
      {/* Header Title & User Info */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Ritase Timbangan
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Selamat datang,{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {user?.username || "User"}
            </span>
          </p>
          {userRole === USER_ROLES.OPERATOR_JT && (
            <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 sm:ml-2">
              ({filteredFleetCount} fleet ditugaskan)
            </span>
          )}
        </div>
      </div>

      {/* Date, Time, Group, Shift - Minimalist Inline */}
        <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDayDate()}
          </span>
          <span className="text-gray-400 dark:text-gray-500">|</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {formatTime()}
          </span>
          <span className="text-gray-400 dark:text-gray-500">|</span>
          <span className="text-gray-900 dark:text-white">
            Group <span className="font-semibold">{shiftInfo.activeGroup}</span>
          </span>
          <span className="text-gray-400 dark:text-gray-500">|</span>
          <span className="text-gray-900 dark:text-white">
            {shiftInfo.currentShift}
          </span>
        </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh Master Data Button */}
        <Button
          onClick={onRefreshMasterData}
          variant="outline"
          disabled={isRefreshingMasterData}
          title="Refresh Master Data (Unit, Operator, dll)"
          className="flex-1 sm:flex-none gap-2 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400"
        >
          <Database
            className={`w-4 h-4 ${isRefreshingMasterData ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Master</span>
        </Button>

        {/* Refresh Ritase Button */}
        <Button
          ref={refreshButtonRef}
          onClick={onRefresh}
          variant="outline"
          disabled={isRefreshing}
          title="Refresh Data Ritase"
          className="flex-1 sm:flex-none gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* Input/Timbang Button */}
        {!isCCR && (
          <Button
            onClick={onOpenInputModal}
            disabled={isInitialLoading || filteredFleetCount === 0}
            className="flex-1 sm:flex-none gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {/* Show shorter text on mobile */}
            <span className="sm:hidden">{getInputButtonTextMobile()}</span>
            <span className="hidden sm:inline">{getInputButtonText()}</span>
          </Button>
        )}
      </div></div>
    </div>
  );
};

export default RitaseHeader;