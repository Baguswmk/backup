import React, { useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useUnitLog } from "@/modules/timbangan/fleet/hooks/useUnitLog";
import { CreateUnitLogModal, VerifyUnitLogModal } from "@/modules/timbangan/fleet/components/UnitLogModal";

const MMCTAdditionalSections = ({ selectedSatker, fleetData = [], onRefresh, masters, mastersLoading }) => {
  
  const { activeUnitLogs, isLoading, mmctEquipmentLists, refreshMMCT } = useUnitLog();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!selectedSatker || !selectedSatker.includes("Mine-Mouth Coal Transportation")) {
    return null;
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh MMCT data
      await refreshMMCT();
      
      // Jika ada callback onRefresh dari parent, panggil juga
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

const getDumpTruckStatusByCompany = () => {
  const companyStats = {};
  
  fleetData.forEach(fleet => {
    fleet.units?.forEach(unit => {
      const company = unit.company || "Unknown";
      if (!companyStats[company]) {
        companyStats[company] = {
          total: 0,
          onDuty: 0,
          standby: 0,
          breakdown: 0,
          pmService: 0
        };
      }
      companyStats[company].total++;
      
      // Count based on unit status
      if (unit.status === "ON DUTY") {
        companyStats[company].onDuty++;
      } else if (unit.status === "STANDBY") {
        companyStats[company].standby++;
      }
    });
  });
  
  // Add breakdown from MMCT lists
  mmctEquipmentLists.dt_bd?.forEach(item => {
    const company = item.company || "Unknown";
    if (!companyStats[company]) {
      companyStats[company] = {
        total: 0,
        onDuty: 0,
        standby: 0,
        breakdown: 0,
        pmService: 0
      };
    }
    companyStats[company].breakdown++;
    companyStats[company].total++;
  });
  
  // Add service from MMCT lists
  mmctEquipmentLists.dt_service?.forEach(item => {
    const company = item.company || "Unknown";
    if (!companyStats[company]) {
      companyStats[company] = {
        total: 0,
        onDuty: 0,
        standby: 0,
        breakdown: 0,
        pmService: 0
      };
    }
    companyStats[company].pmService++;
    companyStats[company].total++;
  });
  
  return companyStats;
};

// Get excavator status
const getExcavatorStatus = (excavatorName) => {
  // Check if in breakdown list
  const inBreakdown = mmctEquipmentLists.exca_bd?.some(
    item => item.equipmentName === excavatorName
  );
  if (inBreakdown) return { status: "BREAKDOWN", variant: "destructive" };
  
  // Check if in service list
  const inService = mmctEquipmentLists.exca_service?.some(
    item => item.equipmentName === excavatorName
  );
  if (inService) return { status: "SERVICE", variant: "warning" };
  
  // Default operational
  return { status: "OPERATIONAL", variant: "success" };
};

  const dumpTruckStats = getDumpTruckStatusByCompany();

  // Get all units from fleet data
  const allUnits = fleetData.flatMap(fleet => 
    fleet.units?.map(unit => ({
      ...unit,
      excavator: fleet.excavator,
      excavatorCompany: fleet.excavatorCompany,
    })) || []
  );

  // Filter breakdown and service units
  const breakdownUnits = allUnits.filter(unit => unit.status === "BREAKDOWN");
  const serviceUnits = allUnits.filter(unit => unit.status === "SERVICE");

  const handleCreateLog = (unit) => {
    setSelectedUnit(unit);
    setIsCreateModalOpen(true);
  };

  const handleVerifyLog = (log) => {
    setSelectedLog(log);
    setIsVerifyModalOpen(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getDuration = (entryDate) => {
    const start = new Date(entryDate);
    const now = new Date();
    const diffMs = now - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}h ${hours % 24}j`;
    }
    
    return `${hours}j ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Section 1 - Status Dumptruck per Mitra */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Status Dumptruck per Mitra
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    No
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Mitra
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Populasi
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Operasi
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Standby Ready
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Breakdown
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    PM / Service
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Total Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {Object.entries(dumpTruckStats).map(([company, stats], idx) => (
                  <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {company}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {stats.total}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 font-semibold">
                      {stats.onDuty}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 font-semibold">
                      {stats.standby}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-red-600 dark:text-red-400 font-semibold">
                      {stats.breakdown}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-gray-300 dark:border-gray-600 text-yellow-600 dark:text-yellow-400 font-semibold">
                      {stats.pmService}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100 font-semibold">
                      {stats.onDuty + stats.standby + stats.breakdown + stats.pmService}
                    </td>
                  </tr>
                ))}

                {Object.keys(dumpTruckStats).length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada data status dumptruck
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Section 2 - Status Excavator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Status Excavator Tidak Beroperasi
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Real-time monitoring excavator
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    No
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Alat Loading
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Mitra
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-300 dark:border-gray-600">
                    Lokasi
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {fleetData.map((fleet, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {fleet.excavator || "Unknown"}
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {fleet.excavatorCompany || "Unknown"}
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                      {fleet.loadingLocation || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-center">
  {(() => {
    const { status, variant } = getExcavatorStatus(fleet.excavator);
    return (
      <Badge 
        variant={variant} 
        className={
          variant === "success" 
            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
            : variant === "destructive"
            ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
        }
      >
        {status}
      </Badge>
    );
  })()}
</td>
                  </tr>
                ))}

                {fleetData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada data excavator
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateUnitLogModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedUnit(null);
        }}
        masters={masters}
        mastersLoading={mastersLoading}
        unit={selectedUnit}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          setSelectedUnit(null);
        }}
      />

      <VerifyUnitLogModal
        isOpen={isVerifyModalOpen}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setSelectedLog(null);
        }}
        unitLog={selectedLog}
        onSuccess={() => {
          setIsVerifyModalOpen(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
};

export default MMCTAdditionalSections;