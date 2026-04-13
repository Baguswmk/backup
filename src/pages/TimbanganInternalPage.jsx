import React, { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import useAuthStore from "@/modules/auth/store/authStore";
import { QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/shared/components/Sidebar";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ShieldX,
  ArrowLeft,
  Scale,
  Database,
  BarChart3,
  Cog,
  Construction,
  History,
  ClipboardList,
  Grid3x3,
  Truck,
  Train,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import FleetManagement from "@/modules/timbangan/fleet/FleetManagement";
import MasterDataManagement from "@/modules/timbangan/masterData/MasterDataManagement";
import RitaseManagement from "@/modules/timbangan/ritase/RitaseManagement";
import LaporanManagement from "@/modules/timbangan/laporan/LaporanManagement";
import OverviewPage from "@/modules/timbangan/overview/OverviewManagement";
import { OfflineSyncStatus } from "@/shared/components/OfflineSyncStatus";
import LoginPage from "@/pages/LoginPage";
import { queryClient } from "@/shared/config/queryClient";
import RitaseHistory from "@/modules/timbangan/ritase/RitaseHistory";
import BeltscaleManagement from "@/modules/timbangan/ritase/BeltScaleManagement";
import TimbanganManagement from "@/modules/timbangan/timbangan/TimbanganManagement";
import RitasePendingManagement from "@/modules/timbangan/ritase-pending/RitasePendingManagement";
import RencanaRealisasiManagement from "@/modules/timbangan/rencana-realisasi/RencanaRealisasiManagement";
import BeltConveyorManagement from "@/modules/timbangan/beltconveyor/BeltConveyorManagement";
import PengeluaranFOTManagement from "@/modules/timbangan/fot/PengeluaranFOTManagement";
import PengeluaranBCManagement from "@/modules/timbangan/beltconveyor/PengeluaranBCManagement";
import PengeluaranKAManagement from "@/modules/timbangan/pengeluaran-ka/PengeluaranKAManagement";
// import RitasePendingManagement from "@/modules/timbangan/ritase-pending/RitasePendingManagement";

const TimbanganInternalPage = () => {
  const { isAuthenticated } = useAuth();
  const { user } = useAuthStore();
  const userRole = user?.role;

  const isOperator = userRole === "operator_jt";

  const menuItems = useMemo(
    () => [
      {
        name: "Setting Fleet",
        icon: Cog,
        roles: ["pic", "pengawas", "evaluator", "admin", "super_admin", "ccr"],
        locationId: "Setting Fleet",
      },
      {
        name: "Timbangan",
        icon: Scale,
        roles: ["operator_jt", "checker"],
        locationId: "timbangan",
      },
      {
        name: "Penerimaan Batubara",
        icon: Scale,
        roles: [
          "checker",
          "pic",
          "pengawas",
          "operator_jt",
          "evaluator",
          "admin",
          "super_admin",
          "ccr",
          "viewer",
          "spph",
        ],
        locationId: "ritase",
      },
      {
        name: "Penerimaan Batubara History",
        icon: History,
        roles: [
          "checker",
          "pic",
          "pengawas",
          "operator_jt",
          "evaluator",
          "admin",
          "super_admin",
          "ccr",
          "viewer",
          "spph",
        ],
        locationId: "ritase-history",
      },
      {
        name: "Ritase Pending",
        icon: History,
        roles: ["admin", "super_admin", "ccr", "checker"],
        locationId: "ritase-pending",
      },
      {
        name: "Adjustment Beltscale",
        icon: Scale,
        roles: ["super_admin", "ccr"],
        locationId: "beltscale",
      },
      {
        name: "Belt Conveyor",
        icon: Grid3x3,
        roles: [ "admin", "super_admin", "ccr", "operator"],
        locationId: "belt-conveyor",
      },

      {
        name: "Rencana Coal Flow",
        icon: ClipboardList,
        roles: ["admin", "super_admin", "ccr"],
        locationId: "rencana-coal-flow",
      },
      {
        name: "Overview",
        icon: BarChart3,
        roles: [
          "admin",
          "super_admin",
          "ccr",
          "pengawas",
          "pic",
          "viewer",
          "spph",
        ],
        locationId: "overview",
      },
      {
        name: "Laporan",
        icon: BarChart3,
        roles: ["admin", "super_admin", "ccr", "pic", "viewer", "spph"],
        locationId: "laporan",
      },
      {
        name: "Master Data",
        icon: Database,
        roles: ["super_admin", "operator_jt", "ccr"],
        locationId: "master-data",
      },

      {
        name: "Pengeluaran Via KA",
        icon: Train,
        roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
        children: [
          {
            name: "Dashboard",
            icon: LayoutDashboard,
            roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
            locationId: "dashboard-ka",
          },
          {
            name: "Laporan",
            icon: FileText,
            roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
            locationId: "laporan-ka",
          },
        ],
      },
      {
        name: "Pengeluaran UPTE",
        icon: Truck,
        roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
        children: [
                    {
            name: "Pengeluaran Belt Conveyor",
            icon: Grid3x3,
            roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
            children: [
              {
                name: "Dashboard",
                icon: LayoutDashboard,
                roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
                locationId: "dashboard-bc",
              },
              {
                name: "Laporan",
                icon: FileText,
                roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
                locationId: "laporan-bc",
              },
            ],
          },
          // {
          //   name: "FOT",
          //   icon: Truck,
          //   roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
          //   children: [
          //     {
          //       name: "Dashboard",
          //       icon: LayoutDashboard,
          //       roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
          //       locationId: "dashboard-fot",
          //     },
          //     {
          //       name: "Laporan",
          //       icon: FileText,
          //       roles: ["pic", "pengawas", "admin", "super_admin", "ccr"],
          //       locationId: "laporan-fot",
          //     },
          //   ],
          // },
        ],
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

  const getDefaultMenu = useCallback(() => {
    if (userRole === "operator") {
      return "belt-conveyor";
    }

    if (isOperator || userRole === "checker") {
      return "timbangan";
    }

    if (userRole === "viewer" || userRole === "spph") {
      return "overview";
    }

    return "Setting Fleet";
  }, [isOperator, userRole]);

  const findMenuRecursively = useCallback((items, menuName) => {
    for (const item of items) {
      if ((item.locationId || item.name) === menuName) return item;
      if (item.children) {
        const found = findMenuRecursively(item.children, menuName);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const getUrlMenu = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const menuParam = urlParams.get("menu");

    if (!menuParam) {
      return null;
    }

    const targetMenu = findMenuRecursively(menuItems, menuParam);
    return targetMenu && isMenuAccessible(targetMenu) ? menuParam : null;
  }, [menuItems, isMenuAccessible, findMenuRecursively]);

  const [activeMenu, setActiveMenuState] = useState(
    () => getUrlMenu() || getDefaultMenu(),
  );

  const selectedMenu = useMemo(() => {
    const currentMenu = findMenuRecursively(menuItems, activeMenu);

    if (currentMenu && isMenuAccessible(currentMenu)) {
      return activeMenu;
    }

    return getUrlMenu() || getDefaultMenu();
  }, [
    activeMenu,
    menuItems,
    isMenuAccessible,
    getUrlMenu,
    getDefaultMenu,
    findMenuRecursively,
  ]);

  const setActiveMenu = useCallback((menuName) => {
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("menu", menuName);
    window.history.replaceState({}, "", newUrl);
    setActiveMenuState(menuName);
  }, []);

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
            "bg-neutral-50 dark:bg-red-900/20 dark:border-red-800",
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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
        <Sidebar
          activeMenu={selectedMenu}
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
              "bg-neutral-50 dark:bg-slate-800/50",
              "rounded-lg shadow-sm",
              "p-4 md:p-6",
              "transition-all duration-200",
            )}
          >
            {/* ===== ROUTING SECTION ===== */}
            {selectedMenu === "Setting Fleet" ? (
              <FleetManagement Type="Setting Fleet" />
            ) : selectedMenu === "timbangan" ? (
              <TimbanganManagement Type="Timbangan" />
            ) : selectedMenu === "ritase" ? (
              <RitaseManagement Type="Penerimaan Batubara" />
            ) : selectedMenu === "belt-conveyor" ? (
              <BeltConveyorManagement />
            ) : selectedMenu === "dashboard-fot" ? (
              <PengeluaranFOTManagement Type="Dashboard" />
            ) : selectedMenu === "laporan-fot" ? (
              <PengeluaranFOTManagement Type="Laporan" />
            ) : selectedMenu === "dashboard-bc" ? (
              <PengeluaranBCManagement Type="Dashboard" />
            ) : selectedMenu === "laporan-bc" ? (
              <PengeluaranBCManagement Type="Laporan" />
            ) : selectedMenu === "dashboard-ka" ? (
              <PengeluaranKAManagement Type="Dashboard" />
            ) : selectedMenu === "laporan-ka" ? (
              <PengeluaranKAManagement Type="Laporan" />
            ) : selectedMenu === "ritase-pending" ? (
              <RitasePendingManagement Type="Ritase Pending" />
            ) : selectedMenu === "ritase-history" ? (
              <RitaseHistory Type="Penerimaan Batubara History" />
            ) : selectedMenu === "beltscale" ? (
              <BeltscaleManagement Type="Adjustment Beltscale" />
            ) : selectedMenu === "overview" ? (
              <OverviewPage />
            ) : selectedMenu === "rencana-coal-flow" ? (
              <RencanaRealisasiManagement />
            ) : selectedMenu === "laporan" ? (
              <LaporanManagement />
            ) : selectedMenu === "master-data" ? (
              <MasterDataManagement />
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
    </QueryClientProvider>
  );
};

export default TimbanganInternalPage;
