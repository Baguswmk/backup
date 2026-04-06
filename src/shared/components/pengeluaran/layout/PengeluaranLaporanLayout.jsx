import React from "react";
import { Button } from "@/shared/components/ui/button";
import PengeluaranPageLayout from "./PengeluaranPageLayout";
import { SummaryOverviewCards } from "../laporan/SummaryOverviewCards";
import { PengeluaranLaporanTable } from "../laporan/PengeluaranLaporanTable";
import Pagination from "@/shared/components/Pagination";
import { RefreshCcw } from "lucide-react";

export const PengeluaranLaporanLayout = ({
  pageTitle,
  pageSubtitle,
  summaryData = {},
  isSummaryLoading = false,
  isTableLoading = false,
  tableData = [],
  columns = [],
  filters,
  canAdd = true,
  canWrite = true,
  onAdd,
  onViewDetail,
  onEdit,
  onDelete,
  modalsComponent,
  onRefreshData,
  isRefreshingData = false,
  onRefreshMasterData,
  isRefreshingMasterData = false,
  // Pagination
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 25,
  totalItems = 0,
  onPageChange,
  onItemsPerPageChange,
  // Render overrides
  children
}) => {
  return (
    <>
      <div className="flex flex-col space-y-4 md:space-y-6 w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between px-1">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              {pageTitle}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {pageSubtitle}
            </p>
          </div>
        </div>



        {/* Filters Toolbar */}
        {filters && (
          <div className="flex flex-col space-y-3 p-3 md:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm mx-1">
            {filters}
          </div>
        )}

        {/* Main Content */}
        <div className={`transition-opacity duration-300 mx-1 ${isSummaryLoading || isTableLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {summaryData && Object.keys(summaryData).length > 0 && (
              <SummaryOverviewCards data={summaryData} />
            )}

            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  List Log Aktivitas
                </h3>
                <div className="flex items-center gap-2">
                  {onRefreshMasterData && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefreshMasterData}
                      disabled={isRefreshingMasterData}
                      className="h-8 text-[11px] font-bold border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400"
                    >
                      <RefreshCcw/>
                      {isRefreshingMasterData ? "Updating..." : "Master"}
                    </Button>
                  )}
                  {canAdd && onAdd && (
                    <Button
                      size="sm"
                      onClick={onAdd}
                      className="h-8 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Tambah Laporan
                    </Button>
                  )}
                </div>
              </div>

              {children ? (
                children
              ) : (
                <>
                  {columns.length > 0 && (
                    <PengeluaranLaporanTable
                      data={tableData}
                      columns={columns}
                      offset={(currentPage - 1) * itemsPerPage}
                      onViewDetail={onViewDetail}
                      onEdit={canWrite ? onEdit : undefined}
                      onDelete={canWrite ? onDelete : undefined}
                    />
                  )}

                  {totalItems > 0 && onPageChange && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={onPageChange}
                      isLoading={isTableLoading}
                      itemsPerPage={itemsPerPage}
                      onItemsPerPageChange={onItemsPerPageChange}
                      totalItems={totalItems}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {modalsComponent}
    </>
  );
};
