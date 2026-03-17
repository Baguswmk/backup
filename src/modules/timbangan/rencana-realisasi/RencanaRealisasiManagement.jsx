import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, RefreshCcw, UploadCloud } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker } from "@/shared/components/DateRangePicker";
import { useRencanaRealisasi } from "./hooks/useRencanaRealisasi";
import TambahRencanaModal from "./components/TambahRencanaModal";
import EditRencanaModal from "./components/EditRencanaModal";
import DetailRencanaModal from "./components/DetailRencanaModal";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import RencanaRealisasiList from "./components/RencanaRealisasiList";
import { getTodayDateRange } from "@/shared/utils/date";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";

export default function RencanaRealisasiManagement() {
  const { data, isLoading, fetchData, createData, updateData, deleteData, uploadExcel } =
    useRencanaRealisasi();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // States for Edit, Detail, Delete
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [dateRange, setDateRange] = useState(() => {
    const today = getTodayDateRange();
    return {
      from: today.from,
      to: today.to,
      startDate: today.from,
      endDate: today.to,
      shift: "",
    };
  });

  const { user } = useAuthStore();
  const { masters } = useFleet(user);

  useEffect(() => {
    fetchData({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }, [fetchData, dateRange.startDate, dateRange.endDate]);

  const handleDateRangeChange = useCallback((payload) => {
    setDateRange((prev) => ({
      ...prev,
      ...payload,
    }));
  }, []);

  const handleRefresh = () => {
    fetchData({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  };

  const handleCreateSubmit = async (formData, file, onProgress) => {
    const res = await createData(formData, file, onProgress);
    if (res.success) {
      setIsModalOpen(false);
    }
  };

  const handleUploadSubmit = async (file, onProgress) => {
    const uploadRes = await uploadExcel(file, onProgress);
    if (uploadRes.success) {
      handleRefresh();
      setIsUploadModalOpen(false);
    }
  };

  const handleDelete = (item) => {
    // Provide target mapping expected by DeleteConfirmDialog structure
    setSelectedItem({
      id: item.id,
      excavator: item.pic || "-",
      loadingLocation: item.loading_location,
      dumpingLocation: item.dumping_location,
      dumptruckCount: item.jumlah_fleet,
    });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem || isDeleting) return;
    setIsDeleting(true);
    const res = await deleteData(selectedItem.id);
    if (res.success) {
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    }
    setIsDeleting(false);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (id, formData) => {
    const res = await updateData(id, formData);
    if (res.success) {
      setIsEditModalOpen(false);
      setSelectedItem(null);
    }
  };

  const handleDetail = (item) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };


  return (
    <div className="space-y-3 min-h-screen p-3">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Rencana & Realisasi
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manajemen data rencana pengangkutan dan realisasinya.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {/* Date Range Picker */}
          <div className="w-full sm:w-[260px]">
            <DateRangePicker
              dateRange={dateRange}
              currentShift={dateRange.shift}
              onDateRangeChange={handleDateRangeChange}
              isLoading={isLoading}
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh Data"
            className="shrink-0 cursor-pointer border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          {/* <Button
            variant="outline"
            onClick={() => setIsUploadModalOpen(true)}
            className="shrink-0 cursor-pointer border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload Excel
          </Button> */}

          <Button
            onClick={() => setIsModalOpen(true)}
            className="shrink-0 cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Rencana
          </Button>
        </div>
      </div>

      {/* Main Content / Table List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <RencanaRealisasiList
          data={data}
          isLoading={isLoading}
          onDelete={(id) => {
            const itm = data.find((i) => i.id === id);
            if (itm) handleDelete(itm);
          }}
          onEdit={handleEdit}
          onDetail={handleDetail}
        />
      </div>

      {/* Modals */}
      {/* <UploadRencanaModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUploadSubmit}
        isLoading={isLoading}
      /> */}

      <TambahRencanaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={isLoading}
        masters={masters}
      />

      <EditRencanaModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={handleEditSubmit}
        initialData={selectedItem}
        isLoading={isLoading}
        masters={masters}
      />

      <DetailRencanaModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedItem(null);
        }}
        data={selectedItem}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={handleConfirmDelete}
        target={selectedItem}
        isProcessing={isDeleting}
      />
    </div>
  );
}
