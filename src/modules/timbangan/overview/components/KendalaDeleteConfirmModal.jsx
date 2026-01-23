// KendalaDeleteConfirmModal.jsx - Modal konfirmasi hapus kendala
import React from "react";
import { AlertTriangle } from "lucide-react";
import ConfirmDialog from "@/shared/components/ConfirmDialog";

const KendalaDeleteConfirmModal = ({ isOpen, kendala, onClose, onConfirm, isDeleting }) => {
  if (!kendala) return null;

  const handleConfirm = () => {
    onConfirm(kendala.id);
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Hapus Kendala"
      confirmLabel={isDeleting ? "Menghapus..." : "Hapus"}
      cancelLabel="Batal"
      variant="destructive"
      icon={AlertTriangle}
      isConfirmDisabled={isDeleting}
    >
      <div className="space-y-4">
        {/* Warning Message */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Peringatan!
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Data kendala yang dihapus tidak dapat dikembalikan. Pastikan Anda yakin sebelum melanjutkan.
              </p>
            </div>
          </div>
        </div>

        {/* Kendala Details */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Kategori
            </label>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
              {kendala.hindrance_category}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Kendala
            </label>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
              {kendala.hindrance}
            </p>
          </div>

          {kendala.description && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Deskripsi
              </label>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {kendala.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Tanggal
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {kendala.date}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Waktu
              </label>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {kendala.start_time} - {kendala.end_time}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Shift
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
              {kendala.shift}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Apakah Anda yakin ingin menghapus data kendala ini?
        </p>
      </div>
    </ConfirmDialog>
  );
};

export default KendalaDeleteConfirmModal;