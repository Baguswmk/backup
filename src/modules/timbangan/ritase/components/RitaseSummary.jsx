import React, { useMemo } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Package, Scale, Truck, TrendingUp } from "lucide-react";

const RitaseSummary = ({ summaryData, isLoading = false }) => {
  const stats = useMemo(() => {
   if (!summaryData?.summaries?.data || summaryData.summaries.data.length === 0) {
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
      const totalActiveDT = summaryData.summaries.data.reduce(
        (sum, item) => sum + (item.total_active_dt || 0),
        0,
      );
      const uniqueExcavators = new Set(
        summaryData.summaries.data.map((item) => item.unit_exca),
      ).size;
      
      return {
        totalRitase,
        totalTonase,
        totalActiveDT,
        uniqueExcavators,
      };
    }, [summaryData]);

    
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
    },
    {
      title: "Active Dump Trucks",
      value: stats.totalActiveDT,
      icon: Truck,
      color: "bg-orange-500",
      lightColor: "bg-orange-50",
      darkLightColor: "dark:bg-orange-900/20",
      textColor: "text-orange-600",
      darkTextColor: "dark:text-orange-400",
    },
    {
      title: "Active Excavators",
      value: stats.uniqueExcavators,
      icon: TrendingUp,
      color: "bg-purple-500",
      lightColor: "bg-purple-50",
      darkLightColor: "dark:bg-purple-900/20",
      textColor: "text-purple-600",
      darkTextColor: "dark:text-purple-400",
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
        return (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow duration-200 dark:bg-slate-800"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {stat.title}
                  </p>
                  <p
                    className={`text-2xl font-bold ${stat.textColor} ${stat.darkTextColor}`}
                  >
                    {stat.value}
                  </p>
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