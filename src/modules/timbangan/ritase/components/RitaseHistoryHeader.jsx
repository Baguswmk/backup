import React, { useState, useEffect } from "react";
import { RefreshCw, History, Edit2 } from "lucide-react";
import { DateRangePicker } from "@/shared/components/DateRangePicker";
import { Button } from "@/shared/components/ui/button";
import OperatorNameModal from "@/modules/timbangan/timbangan/components/OperatorNameModal";
import { calculateCurrentShiftAndGroup } from "@/shared/utils/group";

const RitaseHistoryHeader = ({
  user,
  dateRange,
  currentShift,
  viewingShift,
  isLoading,
  isSearching,
  onDateRangeChange,
  onRefresh,
}) => {
  // State for Operator Name
  const [operatorName, setOperatorName] = useState("");
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftInfo, setShiftInfo] = useState(() =>
    calculateCurrentShiftAndGroup(),
  );

  // Load initial operator name form localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("internal_operator_sib_name");
    if (savedName) {
      setOperatorName(savedName);
    } else if (user?.name || user?.username) {
      setOperatorName(user.name || user.username);
      localStorage.setItem("internal_operator_sib_name", user.name || user.username);
    }
  }, [user]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setShiftInfo(calculateCurrentShiftAndGroup(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    const h = String(currentTime.getHours()).padStart(2, "0");
    const m = String(currentTime.getMinutes()).padStart(2, "0");
    const s = String(currentTime.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  const formatDayDate = () =>
    currentTime.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });

  // Handle operator name saved from modal
  const handleOperatorNameSaved = (newName) => {
    setOperatorName(newName);
    setIsOperatorModalOpen(false);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg dark:bg-gray-800 transition-colors">
      <div className="p-3 sm:p-4">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2 sm:mb-3">
          {/* Title & User Info */}
          <div className="flex flex-row items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0 dark:bg-blue-900/50">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-md sm:text-lg font-bold text-gray-900 truncate dark:text-gray-100">
                Batubara Tracking System
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate dark:text-gray-400 max-w-[200px] sm:max-w-none flex flex-wrap items-center gap-1">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {operatorName || "Pilih Operator"}
                </span>
                <Button
                  onClick={() => setIsOperatorModalOpen(true)}
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  title="Edit Nama Operator"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </p>
            </div>
          </div>

          {/* Live Clock / Group / Shift */}
          <div className="flex items-center gap-1.5 text-md text-gray-600 dark:text-gray-400 flex-wrap lg:flex-nowrap">
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {formatDayDate()}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
              {formatTime()}
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200 ">
              Group{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {shiftInfo.activeGroup}
              </span>
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {shiftInfo.currentShift}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none min-w-[200px]">
                <DateRangePicker
                  dateRange={dateRange}
                  currentShift={currentShift}
                  viewingShift={viewingShift}
                  isLoading={isLoading || isSearching}
                  onDateRangeChange={onDateRangeChange}
                />
              </div>

              {/* ✅ Tombol Refresh - Pure Tailwind */}
              <button
                onClick={onRefresh}
                disabled={
                  isLoading ||
                  isSearching ||
                  !dateRange.from ||
                  !dateRange.to ||
                  !viewingShift
                }
                className="cursor-pointer shrink-0 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isSearching ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {isSearching && (
              <span className="text-xs text-blue-600 flex items-center gap-1 dark:text-blue-400 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Wait...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Operator Name Modal */}
      <OperatorNameModal
        isOpen={isOperatorModalOpen}
        onConfirm={handleOperatorNameSaved}
        onClose={() => setIsOperatorModalOpen(false)}
      />
    </div>
  );
};

export default RitaseHistoryHeader;
