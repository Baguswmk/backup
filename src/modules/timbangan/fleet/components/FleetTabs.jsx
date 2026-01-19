import React from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Truck } from "lucide-react";

const FleetTabs = ({ fleetCounts }) => {
  return (
    <div className="border-b dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            Fleet Timbangan
          </span>
          {fleetCounts.total > 0 && (
            <Badge className="bg-green-600 dark:bg-green-700 text-white">
              {fleetCounts.total} Active
            </Badge>
          )}
        </div>

        {fleetCounts.total > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total {fleetCounts.timbangan} fleet terpilih
          </p>
        )}
      </div>
    </div>
  );
};

export default FleetTabs;
