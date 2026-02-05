import React, { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Package, Scale, Truck, TrendingUp } from "lucide-react";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";

const RitaseSummary = ({ summaryData, isLoading = false }) => {
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    type: null,
    position: "bottom",
    data: [],
    locked: false,
  });
  const tooltipRef = useRef(null);

  const { workUnits = [], users = [] } = useMasterData();

  const ritasesData = summaryData?.ritases;

  const localStats = useMemo(() => {
    if (!ritasesData || ritasesData.length === 0) {
      return {
        uniqueDumpTrucks: [],
        uniqueExcavators: [],
        totalLocalDT: 0,
        totalLocalExca: 0,
      };
    }

    const dtMap = new Map();
    const excaMap = new Map();

    ritasesData.forEach((ritase) => {
      if (ritase.unit_dump_truck) {
        if (!dtMap.has(ritase.unit_dump_truck)) {
          const dtDetail =
            workUnits.length > 0
              ? workUnits.find((wu) => wu.hull_no === ritase.unit_dump_truck)
              : null;

          const operatorDetail =
            users.length > 0
              ? users.find((u) => u.name === ritase.operator)
              : null;

          dtMap.set(ritase.unit_dump_truck, {
            hull_no: ritase.unit_dump_truck,
            operator: operatorDetail?.name || ritase.operator || "-",
            company: dtDetail?.company?.name || ritase.company || "-",
            type: dtDetail?.type || null,
            count: 1,
          });
        } else {
          dtMap.get(ritase.unit_dump_truck).count++;
        }
      }

      if (ritase.unit_exca) {
        if (!excaMap.has(ritase.unit_exca)) {
          const excaDetail =
            workUnits.length > 0
              ? workUnits.find(
                  (wu) =>
                    wu.name === ritase.unit_exca ||
                    wu.hull_no === ritase.unit_exca,
                )
              : null;

          excaMap.set(ritase.unit_exca, {
            name: ritase.unit_exca,
            loading_location: ritase.loading_location || "-",
            company: excaDetail?.company?.name || ritase.company || "-",
            count: 1,
          });
        } else {
          excaMap.get(ritase.unit_exca).count++;
        }
      }
    });

    return {
      uniqueDumpTrucks: Array.from(dtMap.values()),
      uniqueExcavators: Array.from(excaMap.values()),
      totalLocalDT: dtMap.size,
      totalLocalExca: excaMap.size,
    };
  }, [ritasesData, workUnits, users]);

  const stats = useMemo(() => {
    if (
      !summaryData?.summaries?.data ||
      summaryData.summaries.data.length === 0
    ) {
      return {
        totalRitase: 0,
        totalTonase: 0,
        totalActiveDT: 0,
        uniqueExcavators: 0,
      };
    }

    const totalRitase = summaryData.summaries.data.reduce(
      (sum, item) => sum + (item.total_ritase || 0),
      0,
    );

    const totalTonase = summaryData.summaries.data.reduce(
      (sum, item) => sum + (item.total_tonase || 0),
      0,
    );

    const totalActiveDT =
      summaryData.summaries.summary_detail?.total_unique_dt || 0;
    const uniqueExcavators =
      summaryData.summaries.summary_detail?.total_unique_exca || 0;

    return {
      totalRitase,
      totalTonase,
      totalActiveDT,
      uniqueExcavators,
    };
  }, [summaryData]);

  const handleTooltipShow = (type, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const position =
      spaceBelow >= 400 ? "bottom" : spaceAbove > 300 ? "top" : "bottom";

    const data =
      type === "dt" ? localStats.uniqueDumpTrucks : localStats.uniqueExcavators;

    setTooltipState({
      visible: true,
      type: type,
      position: position,
      data: data,
      locked: false,
    });
  };

  const handleTooltipHide = () => {
    if (!tooltipState.locked) {
      setTooltipState({
        visible: false,
        type: null,
        position: "bottom",
        data: [],
        locked: false,
      });
    }
  };

  const handleTooltipClick = (type, event) => {
    event.stopPropagation();
    if (tooltipState.locked && tooltipState.type === type) {
      setTooltipState({
        visible: false,
        type: null,
        position: "bottom",
        data: [],
        locked: false,
      });
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      const position =
        spaceBelow >= 400 ? "bottom" : spaceAbove > 300 ? "top" : "bottom";

      const data =
        type === "dt"
          ? localStats.uniqueDumpTrucks
          : localStats.uniqueExcavators;

      setTooltipState({
        visible: true,
        type: type,
        position: position,
        data: data,
        locked: true,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setTooltipState({
          visible: false,
          type: null,
          position: "bottom",
          data: [],
          locked: false,
        });
      }
    };

    if (tooltipState.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [tooltipState.visible]);

  const statCards = [
    {
      title: "Total Ritase",
      value: stats.totalRitase,
      icon: Package,
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
      darkLightColor: "dark:bg-blue-900/20",
      textColor: "text-blue-600",
      darkTextColor: "dark:text-blue-400",
      tooltipEnabled: false,
    },
    {
      title: "Total Tonase",
      value: `${stats.totalTonase.toFixed(2)} ton`,
      icon: Scale,
      color: "bg-green-500",
      lightColor: "bg-green-50",
      darkLightColor: "dark:bg-green-900/20",
      textColor: "text-green-600",
      darkTextColor: "dark:text-green-400",
      tooltipEnabled: false,
    },
    {
      title: "Active Dump Trucks",
      value: `${stats.totalActiveDT}`,
      icon: Truck,
      color: "bg-orange-500",
      lightColor: "bg-orange-50",
      darkLightColor: "dark:bg-orange-900/20",
      textColor: "text-orange-600",
      darkTextColor: "dark:text-orange-400",
      tooltipEnabled: true,
      tooltipType: "dt",
    },
    {
      title: "Active Excavators",
      value: `${stats.uniqueExcavators}`,
      icon: TrendingUp,
      color: "bg-purple-500",
      lightColor: "bg-purple-50",
      darkLightColor: "dark:bg-purple-900/20",
      textColor: "text-purple-600",
      darkTextColor: "dark:text-purple-400",
      tooltipEnabled: true,
      tooltipType: "excavator",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const isTooltipActive =
          tooltipState.visible && tooltipState.type === stat.tooltipType;

        return (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-slate-800"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {stat.title}
                  </p>
                  {stat.tooltipEnabled ? (
                    <div className="relative inline-block">
                      <p
                        className={`text-2xl font-bold ${stat.textColor} ${stat.darkTextColor} cursor-pointer hover:opacity-80 transition-opacity`}
                        onMouseEnter={(e) =>
                          handleTooltipShow(stat.tooltipType, e)
                        }
                        onMouseLeave={handleTooltipHide}
                        onClick={(e) => handleTooltipClick(stat.tooltipType, e)}
                        ref={isTooltipActive ? tooltipRef : null}
                      >
                        {stat.value}
                      </p>

                      {/* Tooltip */}
                      {isTooltipActive && (
                        <div
                          className={`absolute ${
                            tooltipState.position === "top"
                              ? "bottom-full mb-2"
                              : "top-full mt-2"
                          } left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-[300px] max-w-[350px]`}
                        >
                          {/* Arrow indicator */}
                          <div
                            className={`absolute left-4 transform w-0 h-0 ${
                              tooltipState.position === "top"
                                ? "top-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-300 dark:border-t-gray-600"
                                : "bottom-full border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-gray-300 dark:border-b-gray-600"
                            }`}
                          />

                          <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1">
                            {stat.tooltipType === "dt"
                              ? "List Dump Trucks"
                              : "List Excavators"}
                          </div>

                          {tooltipState.data.length > 0 ? (
                            <div className="max-h-[300px] overflow-y-auto">
                              <ul className="space-y-1">
                                {tooltipState.data.map((item, idx) => (
                                  <li
                                    key={idx}
                                    className="text-xs text-gray-600 dark:text-gray-400 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
                                  >
                                    {stat.tooltipType === "dt" ? (
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                          <span className="font-medium block">
                                            {item.hull_no}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-500 text-[10px] block">
                                            👤 {item.operator}
                                          </span>
                                          <span className="text-gray-400 dark:text-gray-600 text-[10px] block">
                                            🏢 {item.company}
                                          </span>
                                          {item.type && (
                                            <span className="text-gray-400 dark:text-gray-600 text-[10px] block">
                                              🚛 {item.type}
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                                          {item.count}x
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                          <span className="font-medium block">
                                            {item.name}
                                          </span>
                                          <span className="text-gray-500 dark:text-gray-500 text-[10px] block">
                                            📍 {item.loading_location}
                                          </span>
                                          <span className="text-gray-400 dark:text-gray-600 text-[10px] block">
                                            🏢 {item.company}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                              Tidak ada data{" "}
                              {stat.tooltipType === "dt"
                                ? "dump truck"
                                : "excavator"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p
                      className={`text-2xl font-bold ${stat.textColor} ${stat.darkTextColor}`}
                    >
                      {stat.value}
                    </p>
                  )}
                </div>
                <div
                  className={`${stat.lightColor} ${stat.darkLightColor} p-3 rounded-full`}
                >
                  <Icon
                    className={`w-6 h-6 ${stat.textColor} ${stat.darkTextColor}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RitaseSummary;
