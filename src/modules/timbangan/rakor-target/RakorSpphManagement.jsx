import React, { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Trash2, Edit2, FileDown } from "lucide-react";
import { formatNumber } from "@/shared/utils/number";
import { useRakorTarget } from "./hooks/useRakorTarget";
import { RakorTargetFormModal } from "./components/RakorTargetFormModal";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import { apiConfig } from "@/shared/config/env";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const RakorSpphManagement = ({ mode = "rakor" }) => {
  const isSpphMode = mode === "spph";

  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    // filter khusus SPPH mode
    spph: "",
    // filter khusus Rakor mode
    company: "",
    // mode TIDAK disimpan di state – selalu diambil dari prop saat fetch
  });

  const {
    data: rakorData,
    loading,
    fetchTargets,
    createTarget,
    updateTarget,
    deleteTarget,
  } = useRakorTarget();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    item: null,
  });

  const loadData = useCallback(() => {
    fetchTargets({ ...filters, mode });
  }, [filters, fetchTargets, mode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (payload, file) => {
    let success = false;
    if (editingItem) {
      success = await updateTarget(editingItem.id, payload, file);
    } else {
      success = await createTarget(payload, file);
    }

    if (success) {
      setIsModalOpen(false);
      loadData();
    }
  };

  const confirmDelete = async () => {
    if (deleteDialog.item) {
      const success = await deleteTarget(deleteDialog.item.id);
      if (success) {
        setDeleteDialog({ isOpen: false, item: null });
        loadData();
      }
    }
  };

  const getMediaUrl = (mediaObj) => {
    if (!mediaObj) return null;
    const url = mediaObj.url;
    if (url.startsWith("http")) return url;
    return `${apiConfig.baseUrl}${url}`;
  };

  return (
    <div className="space-y-3 min-h-screen p-3">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {isSpphMode ? "Manajemen SPPH" : "Rakor Bulanan"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isSpphMode 
              ? "Kelola data target/rencana berdasarkan SPPH." 
              : "Manajemen data target rakor bulanan."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              name="year" 
              value={filters.year} 
              onChange={handleFilterChange}
              className="w-24 border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
              placeholder="Tahun"
            />
            <select 
              name="month" 
              value={filters.month || ""} 
              onChange={handleFilterChange}
              className="h-10 w-32 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-800 dark:text-gray-300"
            >
              <option value="">Semua Bulan</option>
              {MONTH_NAMES.map((monthName, index) => (
                <option key={index + 1} value={index + 1}>{monthName}</option>
              ))}
            </select>
            {/* Rakor Bulanan → filter by company */}
            {!isSpphMode && (
              <Input 
                name="company" 
                placeholder="Cari Mitra..." 
                value={filters.company} 
                onChange={handleFilterChange}
                className="w-48 border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300" 
              />
            )}
            {/* SPPH → filter by SPPH number */}
            {isSpphMode && (
              <Input 
                name="spph" 
                placeholder="Cari Nomor SPPH..." 
                value={filters.spph} 
                onChange={handleFilterChange}
                className="w-52 border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300" 
              />
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            disabled={loading}
            title="Refresh Data"
            className="shrink-0 cursor-pointer border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            onClick={handleOpenAdd}
            className="shrink-0 cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Target
          </Button>
        </div>
      </div>

      {/* Main Content / Table List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex justify-center p-8 text-slate-500">Memuat data target...</div>
        ) : !rakorData || rakorData.length === 0 ? (
          <div className="flex justify-center p-8 text-slate-500 border border-dashed rounded-md dark:border-slate-700">
            Belum ada data target untuk filter yang dipilih.
          </div>
        ) : (
          <div className="rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800">
                <TableRow>
                  <TableHead className="text-slate-600 dark:text-gray-300 w-10">No</TableHead>
                  <TableHead className="text-slate-600 dark:text-gray-300">Periode</TableHead>
                  {/* Rakor = tampilkan Company | SPPH = tampilkan Nomor SPPH */}
                  {isSpphMode
                    ? <TableHead className="text-slate-600 dark:text-gray-300">Nomor SPPH</TableHead>
                    : <TableHead className="text-slate-600 dark:text-gray-300">Mitra / Company</TableHead>
                  }
                  <TableHead className="text-slate-600 dark:text-gray-300">Target (Ton)</TableHead>
                  <TableHead className="text-slate-600 dark:text-gray-300">Lokasi Loading</TableHead>
                  <TableHead className="text-slate-600 dark:text-gray-300">Lokasi Dumping</TableHead>
                  <TableHead className="text-slate-600 dark:text-gray-300">Dokumen</TableHead>
                  <TableHead className="text-right text-slate-600 dark:text-gray-300">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rakorData.map((item, i) => (
                  <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="text-slate-800 dark:text-gray-200">
                      <span className="font-medium">{i + 1}</span>
                    </TableCell>
                    <TableCell className="text-slate-800 dark:text-gray-200">
                      <span className="font-medium">{MONTH_NAMES[item.month - 1] || `Bulan ${item.month}`}</span> {item.year}
                    </TableCell>
                    <TableCell>
                      {/* Rakor = tampilkan company | SPPH = tampilkan nomor SPPH */}
                      {isSpphMode
                        ? <div className="font-medium text-slate-800 dark:text-gray-200">{item.spph}</div>
                        : <div className="font-medium text-slate-800 dark:text-gray-200">{item.company}</div>
                      }
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatNumber(item.target_ton)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" >
                      <div className="text-xs text-slate-600 dark:text-gray-300">{item.loading_location}</div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" >
                      <div className="text-xs text-slate-600 dark:text-gray-300">{item.dumping_location}</div>
                    </TableCell>
                    <TableCell>
                      {item.rakor_document ? (
                        <a 
                          href={getMediaUrl(item.rakor_document)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <FileDown className="w-3 h-3 mr-1" />
                          Unduh
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialog({ isOpen: true, item })}
                          className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <RakorTargetFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        editingItem={editingItem}
        isLoading={loading}
        mode={mode}
      />

      {deleteDialog.isOpen && (
        <DeleteConfirmDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog({ isOpen: false, item: null })}
          onConfirm={confirmDelete}
          title="Hapus Target"
          description={`Apakah Anda yakin ingin menghapus data target untuk SPPH: ${deleteDialog.item?.spph}? Data ini tidak dapat dikembalikan.`}
          isProcessing={loading}
        />
      )}
    </div>
  );
};
