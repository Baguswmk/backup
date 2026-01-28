import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Settings, Plus, Database, Lock } from "lucide-react";
import { useMasterData } from "../../masterData/hooks/useMasterData";
const FleetHeader = ({
  type,
  userRole,
  isSatkerRestricted,
  userSatker,
  isRefreshing,
  canRead,
  canCreate,
  shouldShowButton,
  getDisabledMessage,
  onRefresh,
  onCreate,
  onManageFleet,
  fleetCounts,
}) => {

    const { 
      refreshAllMasterData, 
      isRefreshingMasterData 
    } = useMasterData();
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Left: Title & Role Info */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <Settings className="w-6 h-6" />
          Fleet Management - {type}
        </h1>

        <div className="flex items-center gap-2 mt-2">
          <Badge
            variant="outline"
            className="text-xs dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
          >
            <Lock className="w-3 h-3 mr-1" />
            {userRole}
          </Badge>

          {isSatkerRestricted && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              • Satker: {userSatker}
            </span>
          )}
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">

         <Button
          onClick={refreshAllMasterData}
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


        {/* Create */}
        {shouldShowButton("create") && (
          <Button
            onClick={onCreate}
            disabled={!canCreate}
            title={!canCreate ? getDisabledMessage("create") : ""}
            className="flex-1 sm:flex-none gap-2 cursor-pointer hover:bg-gray-200 dark:text-gray-200 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Buat Baru
          </Button>
        )}

        {/* Manage Fleet */}
        {shouldShowButton("create") && (
          <Button
            onClick={onManageFleet}
            variant="ghost"
            disabled={!canCreate}
            title={!canCreate ? getDisabledMessage("create") : ""}
            className="gap-2 cursor-pointer dark:bg-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            <Settings className="w-4 h-4" />
            Kelola Fleet ({fleetCounts?.total ?? 0})
          </Button>
        )}
      </div>
    </div>
  );
};

export default FleetHeader;
