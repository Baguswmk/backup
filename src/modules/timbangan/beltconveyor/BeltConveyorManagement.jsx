import React, { useState, useCallback, useMemo } from "react";
import { Plus, Search, RefreshCw, Database } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DateRangePicker } from "@/shared/components/DateRangePicker";
import { useBeltConveyor } from "./hooks/useBeltConveyor";
import { getCurrentShift } from "@/shared/utils/shift";
import BeltConveyorList from "./components/BeltConveyorList";
import TambahBeltConveyorModal from "./components/TambahBeltConveyorModal";
import EditBeltConveyorModal from "./components/EditBeltConveyorModal";
import DetailBeltConveyorModal from "./components/DetailBeltConveyorModal";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";

// ─── Dashboard Tab ─────────────────────────────────────────────────────────────
const DashboardTab = ({ data, isLoading, filters, onFiltersChange, onRefreshData, onRefreshMaster, mastersLoading, onEdit, onDetail, onDelete, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = useMemo(
    () =>
      data?.filter(
        (item) =>
          item.loader?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.hauler?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.loading_point?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.dumping_point?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.coal_type?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status?.toLowerCase().includes(searchTerm.toLowerCase()),
      ) || [],
    [data, searchTerm],
  );

  const handleDateRangeChange = useCallback(
    ({ from, to, shift }) => {
      onFiltersChange({ dateRange: { from, to }, shift: shift || filters.shift });
    },
    [onFiltersChange, filters.shift],
  );

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Belt Conveyor</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
            Daftar rekaman Belt Conveyor
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={onAdd}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Data</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onRefreshMaster}
            disabled={mastersLoading}
            title="Refresh master data (coal type, loading/dumping points)"
            className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 gap-1.5"
          >
            <Database className={`w-3.5 h-3.5 ${mastersLoading ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">Refresh Master</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onRefreshData}
            disabled={isLoading}
            title="Refresh data Belt Conveyor"
            className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Date Range Picker */}
        <div className="w-full sm:w-auto sm:min-w-[260px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
          <DateRangePicker
            dateRange={filters.dateRange}
            currentShift={getCurrentShift()}
            viewingShift={filters.shift}
            isLoading={isLoading}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-7xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari loader, hauler, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <BeltConveyorList
          data={filteredData}
          isLoading={isLoading}
          onEdit={onEdit}
          onDetail={onDetail}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};

// ─── Main Management Component ─────────────────────────────────────────────────
const BeltConveyorManagement = () => {
  const {
    data,
    isLoading,
    deleteData,
    updateData,
    filters,
    updateFilters,
    refetch,
    masters,
    mastersLoading,
    refreshMasters,
  } = useBeltConveyor();

  const [selectedItem, setSelectedItem] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleEdit = useCallback((item) => { setSelectedItem(item); setIsEditModalOpen(true); }, []);
  const handleDetail = useCallback((item) => { setSelectedItem(item); setIsDetailModalOpen(true); }, []);
  const handleDelete = useCallback((item) => { setSelectedItem(item); setIsDeleteDialogOpen(true); }, []);

  const handleEditSubmit = useCallback(
    async (formData) => {
      if (selectedItem?.id) {
        await updateData({ id: selectedItem.id, payload: formData });
        setIsEditModalOpen(false);
        setSelectedItem(null);
      }
    },
    [selectedItem, updateData],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (selectedItem?.id) {
      await deleteData(selectedItem.id);
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  }, [selectedItem, deleteData]);

  const handleRefreshMaster = useCallback(() => {
    refreshMasters({ forceRefresh: true });
  }, [refreshMasters]);

  return (
    <>
      <DashboardTab
        data={data}
        isLoading={isLoading}
        filters={filters}
        onFiltersChange={updateFilters}
        onRefreshData={refetch}
        onRefreshMaster={handleRefreshMaster}
        mastersLoading={mastersLoading}
        onEdit={handleEdit}
        onDetail={handleDetail}
        onDelete={handleDelete}
        onAdd={() => setIsAddModalOpen(true)}
      />

      <TambahBeltConveyorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          refetch();
        }}
      />

      {/* Edit Modal */}
      {isEditModalOpen && selectedItem && (
        <EditBeltConveyorModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setSelectedItem(null); }}
          data={selectedItem}
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedItem && (
        <DetailBeltConveyorModal
          isOpen={isDetailModalOpen}
          onClose={() => { setIsDetailModalOpen(false); setSelectedItem(null); }}
          data={selectedItem}
        />
      )}

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => { setIsDeleteDialogOpen(false); setSelectedItem(null); }}
        onConfirm={handleConfirmDelete}
        itemInfo={
          selectedItem
            ? `Shift: ${selectedItem.shift} | Tonase: ${selectedItem.tonase}T | ${selectedItem.loader}`
            : ""
        }
        type="belt_conveyor"
      />
    </>
  );
};

export default BeltConveyorManagement;
