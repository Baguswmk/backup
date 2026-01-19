import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Truck, RefreshCw, Plus } from "lucide-react";

const DumpTruckHeader = ({
  userRole,
  userSatker,
  isSatkerRestricted,
  onRefresh,
  onAddNew,
  canCreate,
  canRead,
  isRefreshing,
  shouldShowButton,
  getDisabledMessage,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <Truck className="w-6 h-6" />
          Dump Truck Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Role: {userRole} {isSatkerRestricted && `• Satker: ${userSatker}`}
        </p>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing || !canRead}
          className="flex-1 sm:flex-none cursor-pointer disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
          title={!canRead ? getDisabledMessage("read") : ""}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>

        {shouldShowButton("create") && (
          <Button
            onClick={onAddNew}
            disabled={!canCreate}
            className="flex-1 sm:flex-none gap-2 cursor-pointer disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-200"
            title={!canCreate ? getDisabledMessage("create") : ""}
          >
            <Plus className="w-4 h-4" />
            Tambah DT
          </Button>
        )}
      </div>
    </div>
  );
};

export default DumpTruckHeader;
