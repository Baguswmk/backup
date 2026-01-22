import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { USER_ROLES } from "@/modules/timbangan/ritase/constant/ritaseConstants";

const RitaseHeader = ({ 
  user, 
  userRole, 
  filteredFleetCount, 
  isRefreshing, 
  isInitialLoading,
  onRefresh, 
  onOpenInputModal 
}) => {
  const getInputButtonText = () => {
    return userRole === USER_ROLES.OPERATOR_JT ? "Timbang" : "Input Data";
  };

  const getInputButtonTextMobile = () => {
    return userRole === USER_ROLES.OPERATOR_JT ? "Timbang" : "Input";
  };

  const isCCR = userRole.toLowerCase().includes("ccr");
  return (
    <div className="space-y-4">
      {/* Header Title & User Info */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Ritase Timbangan
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Selamat datang, <span className="font-semibold text-gray-900 dark:text-white">{user?.username || "User"}</span>
          </p>
          {userRole === USER_ROLES.OPERATOR_JT && (
            <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 sm:ml-2">
              ({filteredFleetCount} fleet ditugaskan)
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh Button */}
        <Button
          onClick={onRefresh}
          variant="outline"
          disabled={isRefreshing}
          className="flex-1 sm:flex-none gap-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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

      </div>
    </div>
  );
};

export default RitaseHeader;