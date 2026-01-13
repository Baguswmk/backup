// FleetTabs.jsx - SIMPLIFIED VERSION (No Tabs, Just Info Display)
// Since we only have Timbangan now, tabs are not needed
// This component can be used to show fleet count info

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

// ============================================
// ALTERNATIVE: If you want to completely remove this component
// ============================================
// You can delete this file entirely and remove imports from:
// - FleetManagement.jsx
// - Any other components using FleetTabs
//
// Then in FleetManagement.jsx, remove:
// import FleetTabs from "@/modules/timbangan/fleet/components/FleetTabs";
// 
// And remove this JSX:
// <FleetTabs
//   activeTab={activeTab}
//   onTabChange={setActiveTab}
//   fleetCounts={fleetCounts}
// />
//
// The component is already removed from the fixed FleetManagement.jsx above