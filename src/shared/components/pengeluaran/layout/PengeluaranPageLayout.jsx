import React from "react";
import { cn } from "@/lib/utils";

const PengeluaranPageLayout = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col space-y-4 md:space-y-6 w-full", className)}>
      {children}
    </div>
  );
};

PengeluaranPageLayout.Header = ({ title, subtitle, extra }) => (
  <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between px-1">
    <div>
      <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white">
        {title}
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
        {subtitle}
      </p>
    </div>
    {extra && <div>{extra}</div>}
  </div>
);

PengeluaranPageLayout.Tabs = ({ activeTab, onTabChange }) => (
  <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50 w-full md:w-max mx-1 shadow-sm">
    <button
      onClick={() => onTabChange("dashboard")}
      className={cn(
        "flex-1 md:flex-none px-6 py-2 text-xs uppercase tracking-wider font-bold rounded-md transition-all duration-200",
        activeTab === "dashboard"
          ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
      )}
    >
      Dashboard
    </button>
    <button
      onClick={() => onTabChange("laporan")}
      className={cn(
        "flex-1 md:flex-none px-6 py-2 text-xs uppercase tracking-wider font-bold rounded-md transition-all duration-200",
        activeTab === "laporan"
          ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
      )}
    >
      Laporan
    </button>
  </div>
);

PengeluaranPageLayout.Toolbar = ({ children }) => (
  <div className="flex flex-col space-y-3 p-3 md:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm mx-1 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
    {children}
  </div>
);

PengeluaranPageLayout.ToolbarLeft = ({ children }) => (
  <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between items-center sm:items-center">
    {children}
  </div>
);

PengeluaranPageLayout.ToolbarRight = ({ children }) => (
  <div className="flex items-center gap-2 mt-3 sm:mt-0 ml-auto w-full sm:w-auto">
    {children}
  </div>
);

PengeluaranPageLayout.FilterExpanded = ({ isOpen, children }) => (
  <div className={cn("grid transition-all duration-300 ease-in-out", isOpen ? "grid-rows-[1fr] mt-4" : "grid-rows-[0fr]")}>
    <div className="overflow-hidden">
      {children}
    </div>
  </div>
);

PengeluaranPageLayout.Content = ({ isLoading, children }) => (
  <div className={cn("transition-opacity duration-300 mx-1", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
    {children}
  </div>
);

export default PengeluaranPageLayout;
