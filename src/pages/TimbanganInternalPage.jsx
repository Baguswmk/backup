import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import useAuthStore from "@/modules/auth/store/authStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { Sidebar } from "@/shared/components/Sidebar";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ShieldX,
  ArrowLeft,
  TruckIcon,
  Scale,
  Database,
  BarChart3,
  ClipboardList,
  Cog,
  Construction,
  Anvil,
  EggFried,
  Flame,
  MapPinCheckInside,
  HardDrive,
  Car,
} from "lucide-react";
import FleetManagement from "@/modules/timbangan/fleet/FleetManagement";
import MasterDataManagement from "@/modules/timbangan/masterData/MasterDataManagement";
import DumptruckManagement from "@/modules/timbangan/dumptruck/DumpTruckManagement";
import TimbanganManagement from "@/modules/timbangan/timbangan/TimbanganManagement";
import TimbanganBeltScaleManagement from "@/modules/timbangan/timbangan/TimbanganBeltScaleManagement";
import LaporanManagement from "@/modules/timbangan/laporan/LaporanManagement";
import CheckPointManagement from "@/modules/timbangan/checkpoint/CheckPointManagement";
import FleetHistory from "@/modules/timbangan/fleet/components/FleetHistory";
import DumpTruckHistory from "@/modules/timbangan/dumptruck/components/DumpTruckHistory";
import OverviewPage from "@/modules/timbangan/overview/OverviewManagement";
import LoginPage from "@/pages/LoginPage";
import { OfflineProvider } from "@/shared/components/OfflineProvider";
import { OfflineSyncStatus } from "@/shared/components/OfflineSyncStatus";
import { queryClient } from "@/shared/config/queryClient";
import TimbanganManual from "@/modules/timbangan/timbangan/TimbanganManual";
import TimbanganBypass from "@/modules/timbangan/timbangan/TimbanganBypass";
const TimbanganInternalPage = () => {
  const { isAuthenticated } = useAuth();
  const { user } = useAuthStore();
  const userRole = user?.role;
  const [activeMenu, setActiveMenu] = useState("Setting Fleet Timbangan");

  const menuItems = useMemo(
    () => [
      {
        name: "Setting Fleet",
        icon: Cog,
        roles: [
          "checker",
          "pic",
          "pengawas",
          "operator_jt",
          "evaluator",
          "mitra",
          "admin",
          "super_admin",
          "ccr",
        ],
        children: [
          {
            name: "Setting Fleet Timbangan",
            icon: Anvil,
            roles: [
              "checker",
              "pic",
              "pengawas",
              "operator_jt",
              "evaluator",
              "mitra",
              "ccr",
              "admin",
              "super_admin",
            ],
            locationId: "setting-fleet-timbangan",
          },
          {
            name: "Setting Fleet Bypass",
            icon: Flame,
            roles: ["pic", "evaluator", "admin", "super_admin", "ccr"],
            locationId: "setting-fleet-bypass",
          },
          {
            name: "Setting Fleet Belt Scale",
            icon: EggFried,
            roles: ["pic", "evaluator", "admin", "super_admin", "ccr"],
            locationId: "setting-fleet-beltscale",
          },
        ],
      },
      {
        name: "Setting Dump Truck",
        icon: TruckIcon,
        roles: [
          "checker",
          "pic",
          "pengawas",
          "operator_jt",
          "evaluator",
          "mitra",
          "ccr",
          "admin",
          "super_admin",
        ],
        locationId: "setting-dumpt-truck",
      },
      {
        name: "Timbangan",
        icon: Scale,
        roles: [
          "checker",
          "pic",
          "pengawas",
          "operator_jt",
          "evaluator",
          "mitra",
          "super_admin",
          "admin",
          "ccr",
        ],
        children: [
          {
            name: "Timbangan Internal",
            icon: Anvil,
            roles: [
              "checker",
              "pic",
              "pengawas",
              "operator_jt",
              "evaluator",
              "mitra",
              "admin",
              "super_admin",
              "ccr",
            ],
            locationId: "timbangan-internal",
          },
          {
            name: "Timbangan Manual",
            icon: HardDrive,
            roles: ["pic", "evaluator", "admin", "super_admin"],
            locationId: "timbangan-manual",
          },
          {
            name: "Timbangan Bypass",
            icon: Car,
            roles: ["pic", "evaluator", "admin", "super_admin", "ccr"],
            locationId: "timbangan-bypass",
          },
          {
            name: "Timbangan Belt Scale",
            icon: EggFried,
            roles: ["pic", "evaluator", "admin", "super_admin", "ccr"],
            locationId: "timbangan-beltscale",
          },
        ],
      },

      {
        name: "Check Point",
        icon: MapPinCheckInside,

        roles: ["admin", "super_admin", "ccr"],
        locationId: "checkpoint",
      },
      {
        name: "Dashboard",
        icon: BarChart3,
        roles: ["admin", "super_admin"],
        locationId: "Dashboard",
      },
      {
        name: "Laporan",
        icon: ClipboardList,
        roles: ["admin", "pic", "evaluator", "super_admin", "ccr"],
        locationId: "laporan",
      },
      {
        name: "Master Data",
        icon: Database,
        roles: ["super_admin", "operator_jt", "ccr", "admin"],
        locationId: "master-data",
      },
    ],
    [],
  );

  const isMenuAccessible = useCallback(
    (menuItem) => {
      return menuItem?.roles?.includes(userRole);
    },
    [userRole],
  );

  const hasAnyAccess = useMemo(() => {
    const checkAccess = (items) => {
      return items.some((item) => {
        if (isMenuAccessible(item)) return true;
        if (item.children) {
          return checkAccess(item.children);
        }
        return false;
      });
    };
    return checkAccess(menuItems);
  }, [menuItems, isMenuAccessible]);

  const handleBackToHub = useCallback(() => {
    window.location.href = "/timbangan-internal/hub";
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!hasAnyAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6 transition-colors duration-200">
        <Alert
          className={cn(
            "max-w-md shadow-lg border-l-4 border-red-500 dark:border-red-600",
            "bg-white dark:bg-red-900/20 dark:border-red-800",
            "transition-all duration-300",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                "bg-red-100 dark:bg-red-900/30 shadow-sm transition-all duration-200",
              )}
            >
              <ShieldX className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <AlertDescription className="flex-1">
              <div className="font-medium text-lg text-red-900 dark:text-red-400 mb-2">
                Akses Ditolak
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Anda tidak memiliki akses ke aplikasi ini. Silakan hubungi
                administrator untuk mendapatkan izin akses.
              </p>
              <Button
                onClick={handleBackToHub}
                variant="outline"
                className={cn(
                  "mt-4 w-full transition-all duration-200",
                  "hover:bg-red-50 dark:hover:bg-red-900/30",
                  "border-red-300 dark:border-red-700",
                  "text-red-600 dark:text-red-400",
                )}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Hub
              </Button>
            </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
          <Sidebar
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            menuItems={menuItems}
            user={user}
            isMenuAccessible={isMenuAccessible}
            extraHeaderContent={
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToHub}
                  className={cn(
                    "ml-2 sm:ml-0 cursor-pointer transition-all duration-200",
                    "hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700",
                    "border-gray-300 dark:border-slate-600",
                    "text-gray-700 dark:text-gray-200",
                  )}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Kembali ke Hub</span>
                  <span className="sm:hidden">Hub</span>
                </Button>
              </div>
            }
          />

          {/* Main Content Area */}
          <div
            className={cn(
              "max-w-7xl mx-auto p-4 md:p-6",
              "transition-all duration-200",
            )}
          >
            {/* Content Container */}
            <div
              className={cn(
                "min-h-[calc(100vh-200px)]",
                "bg-white dark:bg-slate-800/50",
                "rounded-lg shadow-sm",
                "p-4 md:p-6",
                "transition-all duration-200",
              )}
            >
              {/* ===== ROUTING SECTION ===== */}

              {/* Fleet FOB */}
              {activeMenu === "Setting Fleet FOB" ? (
                <FleetManagement Type="FOB" />
              ) : activeMenu === "Riwayat Fleet FOB" ? (
                <FleetHistory Type="FOB" />
              ) : activeMenu === "Setting Fleet Timbangan" ? (
                <FleetManagement Type="Timbangan" />
              ) : activeMenu === "Riwayat Fleet Timbangan" ? (
                <FleetHistory Type="Timbangan" />
              ) : activeMenu === "Setting Fleet Bypass" ? (
                <FleetManagement Type="Bypass" />
              ) : activeMenu === "Riwayat Fleet Bypass" ? (
                <FleetHistory Type="Bypass" />
              ) : activeMenu === "Setting Fleet Belt Scale" ? (
                <FleetManagement Type="Beltscale" />
              ) : activeMenu === "Riwayat Fleet Belt Scale" ? (
                <FleetHistory Type="Beltscale" />
              ) : activeMenu === "Setting Dump Truck" ? (
                <DumptruckManagement />
              ) : activeMenu === "Riwayat Dump Truck" ? (
                <DumpTruckHistory />
              ) : activeMenu === "Timbangan Internal" ? (
                <TimbanganManagement Type="Timbangan Internal" />
              ) : activeMenu === "Timbangan Manual" ? (
                <TimbanganManual Type="Timbangan Manual" />
              ) : activeMenu === "Timbangan Belt Scale" ? (
                <TimbanganBeltScaleManagement Type="Timbangan Belt Scale" />
              ) : activeMenu === "Timbangan Bypass" ? (
                <TimbanganBypass Type="Timbangan Bypass" />
              ) : activeMenu === "Timbangan FOB" ? (
                <TimbanganManagement Type="Timbangan FOB" />
              ) : activeMenu === "Check Point" ? (
                <CheckPointManagement Type="Check Point" />
              ) : activeMenu === "Dashboard" ? (
                <OverviewPage />
              ) : activeMenu === "Master Data" ? (
                <MasterDataManagement />
              ) : activeMenu === "Laporan" ? (
                <LaporanManagement />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16">
                  <div
                    className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center mb-6",
                      "bg-gray-100 dark:bg-slate-700",
                      "transition-colors duration-200",
                    )}
                  >
                    <Construction className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Menu Tidak Ditemukan
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                    Silakan pilih menu dari navigasi di atas untuk memulai.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Offline Sync Status */}
          <div className="fixed bottom-4 right-4 z-40">
            <OfflineSyncStatus />
          </div>
        </div>

        {/* Toaster */}
        <Toaster
          position="top-right"
          toastOptions={{
            className: cn(
              "bg-white dark:bg-slate-800",
              "text-gray-900 dark:text-gray-100",
            ),
          }}
        />
      </OfflineProvider>
    </QueryClientProvider>
  );
};

export default TimbanganInternalPage;
