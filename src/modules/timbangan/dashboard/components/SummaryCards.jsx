import React from "react";
import { Card } from "@/shared/components/ui/card";
import {
  TrendingUp,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Activity,
} from "lucide-react";

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  isLoading,
}) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    red: "bg-red-50 text-red-600 border-red-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-300 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};

const SummaryCards = ({ data, isLoading }) => {
  const cards = [
    {
      title: "Total Tonase",
      value: data
        ? `${data.total_ton.toLocaleString("id-ID", {
            maximumFractionDigits: 2,
          })} ton`
        : "-",
      subtitle: `${data?.total_ritase || 0} ritase`,
      icon: TrendingUp,
      color: "blue",
    },
    {
      title: "Rata-rata per Ritase",
      value: data ? `${data.avg_ton_per_ritase.toFixed(2)} ton` : "-",
      subtitle: "Avg. per trip",
      icon: Package,
      color: "purple",
    },
    {
      title: "Ritase Selesai",
      value: data ? data.finish_ritase.toLocaleString("id-ID") : "-",
      subtitle: `${
        data ? ((data.finish_ritase / data.total_ritase) * 100).toFixed(1) : 0
      }% completion`,
      icon: CheckCircle2,
      color: "green",
    },
    {
      title: "In Transit",
      value: data ? data.in_transit_ritase.toLocaleString("id-ID") : "-",
      subtitle: "Belum selesai",
      icon: Clock,
      color: "orange",
    },
    {
      title: "Total Ritase",
      value: data ? data.total_ritase.toLocaleString("id-ID") : "-",
      subtitle: "Semua status",
      icon: Activity,
      color: "gray",
    },
    {
      title: "Dump Truck Aktif",
      value: data ? data.active_dumptrucks.toLocaleString("id-ID") : "-",
      subtitle: "Unit beroperasi",
      icon: Truck,
      color: "red",
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Ringkasan Operasional
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, index) => (
          <StatCard key={index} {...card} isLoading={isLoading} />
        ))}
      </div>
    </div>
  );
};

export default SummaryCards;
