import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Menu, X, ChevronRight, ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import useAuthStore from "@/modules/auth/store/authStore";
import LogoutConfirmationDialog from "@/shared/components/LogoutConfirmationDialog";
import { showToast } from "@/shared/utils/toast";
import { useMenuAccess } from "@/shared/hooks/useMenuAccess";
import ThemeToggle from "@/shared/components/ThemeToggle";

export const Sidebar = ({
  activeMenu,
  setActiveMenu,
  menuItems,
  isMenuAccessible,
  extraHeaderContent,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { checkMenuAccess } = useMenuAccess(menuItems, isMenuAccessible);

  const isActive = useMemo(() => {
    const isNodeActive = (node) => {
      if (!node) return false;
      const nodeId = node.locationId || node.name;
      if (nodeId === activeMenu) return true;
      if (node.children && Array.isArray(node.children)) {
        return node.children.some(isNodeActive);
      }
      return false;
    };
    return isNodeActive;
  }, [activeMenu]);

  const handleMenuClick = useCallback(
    (menuName, item) => {
      if (item?.children && item.children.length > 0) return;
      if (!item || !checkMenuAccess(item)) return;

      setActiveMenu(menuName);
      setIsSidebarOpen(false);
    },
    [checkMenuAccess, setActiveMenu],
  );

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    const loadingToastId = showToast.loading("Logging out...");

    try {
      const { logout } = useAuthStore.getState();
      await logout();

      showToast.safeDismiss(loadingToastId);
      showToast.success("Logged out successfully");

      window.location.replace("/timbangan-internal/login");
    } catch (error) {
      console.error("Logout error:", error);
      showToast.safeDismiss(loadingToastId);
      showToast.error("Logout failed. Please try again.", {
        description: error.message || "An unexpected error occurred",
      });

      setTimeout(() => {
        window.location.replace("/timbangan-internal/login");
      }, 2000);
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);

  const toggleSubmenu = useCallback((itemPath) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [itemPath]: !prev[itemPath],
    }));
  }, []);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleClickOutside = (e) => {
      const sidebar = document.getElementById("sidebar");
      const toggle = document.getElementById("sidebar-toggle");

      if (
        sidebar &&
        !sidebar.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen]);

  const renderMenuItem = (item, level = 0) => {
    if (!item) return null;

    const hasChildren = item.children && item.children.length > 0;
    const hasAccess =
      checkMenuAccess(item) ||
      (hasChildren && item.children.some((child) => checkMenuAccess(child)));

    if (!hasAccess) return null;

    const Icon = item.icon;
    const itemPath = item.locationId || item.name;
    const isDropdownOpen = openDropdowns[itemPath];
    const isItemActive = isActive(item);

    const paddingLeft = level === 0 ? "pl-4" : level === 1 ? "pl-8" : "pl-12";

    if (hasChildren) {
      return (
        <div key={item.name}>
          <Button
            onClick={() => toggleSubmenu(itemPath)}
            variant="ghost"
            className={cn(
              "w-full justify-between text-left transition-all duration-200 cursor-pointer my-1",
              paddingLeft,
              "py-3",
              isItemActive
                ? "bg-[#ea661c] text-white hover:bg-[#ea661c]   "
                : "hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200",
            )}
            aria-expanded={isDropdownOpen}
          >
            <span className="flex items-center gap-3">
              {Icon && <Icon className="w-5 h-5 shrink-0" />}
              <span className="font-medium">{item.name}</span>
            </span>
            <ChevronDown
              className={cn(
                "w-5 h-5 transition-transform duration-200 shrink-0",
                isDropdownOpen && "rotate-180",
              )}
            />
          </Button>

          {isDropdownOpen && (
            <div className="border-l-2 border-gray-200 dark:border-slate-700 ml-6">
              {item.children.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Button
        key={itemPath}
        onClick={() => handleMenuClick(itemPath, item)}
        variant="ghost"
        className={cn(
          "w-full justify-start text-left transition-all duration-200 cursor-pointer",
          paddingLeft,
          "py-3",
          activeMenu === itemPath
            ? "bg-[#ea661c] text-white hover:bg-[#ea661c] dark:bg-[#ea661c]"
            : "hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200",
        )}
      >
        <span className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 shrink-0" />}
          <span className="font-medium">{item.name}</span>
        </span>
      </Button>
    );
  };

  return (
    <>
      {/* Top Bar */}
      <header className="bg-neutral-50 dark:bg-slate-900 shadow-sm z-50 transition-colors duration-200 fixed top-0 left-0 right-0">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Left: Toggle + Extra Content */}
            <div className="flex items-center space-x-4">
              <Button
                id="sidebar-toggle"
                variant="ghost"
                size="sm"
                className="dark:text-gray-200 dark:hover:bg-slate-800 cursor-pointer"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={isSidebarOpen}
              >
                {isSidebarOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>

              {extraHeaderContent}
            </div>

            {/* Right: Theme + Logout */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <LogoutConfirmationDialog onLogout={handleLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 detail-modal z-40 transition-opacity duration-200"
          style={{ top: "64px" }}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          "fixed left-0 top-16 h-[calc(100vh-4rem)] w-96 bg-neutral-50 dark:bg-slate-900 shadow-lg z-50",
          "transform transition-transform duration-300 ease-in-out",
          "overflow-y-auto scrollbar-thin",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="py-4 space-y-1 mx-4">
          {menuItems.map((item) => renderMenuItem(item, 0))}
        </div>
      </aside>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  );
};
