import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Settings,
  Plus,
  Database,
  Lock,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { useMasterData } from "../../masterData/hooks/useMasterData";
import MMCTEquipmentListModal from "./MMCTEquipmentListModal";
import ExportFleetButtons from "./ExportFleetButtons";

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
  fleetData = [],
  selectedSatker,
  selectedUrutkan,
}) => {
  const { refreshAllMasterData, isRefreshingMasterData } = useMasterData();

  // State untuk MMCT Equipment List Modal
  const [showMMCTEquipmentModal, setShowMMCTEquipmentModal] = useState(false);

  // Check if user is CCR
  const isCCR = userRole?.toLowerCase() === "ccr";

  return (
    <>
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
          {/* Export Buttons (PDF & Excel) */}
          <ExportFleetButtons
            fleetData={fleetData}
            selectedSatker={selectedSatker}
            selectedUrutkan={selectedUrutkan}
            type={type}
            userRole={userRole}
          />

          {/* MMCT Equipment List Button - Only for CCR */}
          {isCCR && (
            <Button
              onClick={() => setShowMMCTEquipmentModal(true)}
              variant="outline"
              title="List Alat PM/BD MMCT"
              className="flex-1 sm:flex-none gap-2 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-400"
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">List Alat PM/BD MMCT</span>
              <span className="sm:hidden">PM/BD MMCT</span>
            </Button>
          )}

          {/* Refresh Master Data Button */}
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

          {/* Refresh Fleet Data Button */}
          <Button
            onClick={onRefresh}
            variant="outline"
            disabled={isRefreshing}
            title="Refresh Data Setting Fleet"
            className="flex-1 sm:flex-none gap-2 border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-700 dark:text-blue-400"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Fleet</span>
          </Button>

          {/* Create Button */}
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
        </div>
      </div>

      {/* MMCT Equipment List Modal */}
      {isCCR && (
        <MMCTEquipmentListModal
          isOpen={showMMCTEquipmentModal}
          onClose={() => setShowMMCTEquipmentModal(false)}
        />
      )}
    </>
  );
};

export default FleetHeader;