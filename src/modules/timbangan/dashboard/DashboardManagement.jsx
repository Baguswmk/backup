import React, { useEffect, useState } from "react";
import { dashboardStore } from "@/modules/timbangan/dashboard/store/dashboardStore";
import useAuthStore from "@/modules/auth/store/authStore";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  RefreshCw,
  Calendar,
  Filter,
  Download,
  AlertCircle,
} from "lucide-react";
import { showToast } from "@/shared/utils/toast";

import DashboardFilters from "@/modules/timbangan/dashboard/components/DashboardFilters";
import SummaryCards from "@/modules/timbangan/dashboard/components/SummaryCards";
import TrendChart from "@/modules/timbangan/dashboard/components/TrendChart";
import ShiftBreakdownChart from "@/modules/timbangan/dashboard/components/ShiftBreakdownChart";
import LocationBreakdownChart from "@/modules/timbangan/dashboard/components/LocationBreakdownChart";
import LeaderboardChart from "@/modules/timbangan/dashboard/components/LeaderboardChart";
import QueueTable from "@/modules/timbangan/dashboard/components/QueueTable";

const DashboardManagement = () => {
  const { user } = useAuthStore();
  const {
    summary,
    trend,
    byShift,
    byLocation,
    leaderboard,
    queue,
    isLoading,
    error,
    lastFetch,
    fetchAll,
    refresh,
    clearError,
  } = dashboardStore();

  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(
      () => {
        refresh();
        showToast.info("Dashboard diperbarui otomatis");
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const handleRefresh = () => {
    refresh();
    showToast.success("Dashboard diperbarui");
  };

  const handleExport = () => {
    showToast.info("Fitur export akan segera tersedia");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Dashboard Timbangan
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Monitoring & Analytics Real-time
            </p>
            {lastFetch && (
              <p className="text-xs text-gray-500 mt-1">
                Terakhir diperbarui:{" "}
                {new Date(lastFetch).toLocaleString("id-ID")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>

            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{user.username}</span>
            <span>•</span>
            <span>{user.role}</span>
            {user.weigh_bridge && (
              <>
                <span>•</span>
                <span className="text-blue-600 font-medium">
                  {user.weigh_bridge.name || user.weigh_bridge}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Tutup
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6">
          <DashboardFilters />
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">
                Memuat data dashboard...
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6">
        <SummaryCards data={summary} isLoading={isLoading} />
      </div>

      {/* Main Charts - 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2">
          <TrendChart data={trend} isLoading={isLoading} />
        </div>

        {/* Shift Breakdown */}
        <ShiftBreakdownChart data={byShift} isLoading={isLoading} />

        {/* Location Breakdown */}
        <LocationBreakdownChart data={byLocation} isLoading={isLoading} />
      </div>

      {/* Leaderboard & Queue - 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Leaderboard */}
        <LeaderboardChart data={leaderboard} isLoading={isLoading} />

        {/* Queue Table */}
        <QueueTable data={queue} isLoading={isLoading} />
      </div>

      {/* Auto Refresh Toggle */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {autoRefresh ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Auto-refresh aktif (5 menit)
            </span>
          ) : (
            <span>Klik untuk aktifkan auto-refresh</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default DashboardManagement;
