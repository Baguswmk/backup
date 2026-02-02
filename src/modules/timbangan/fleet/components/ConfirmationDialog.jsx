import React from "react";
import { Button } from "@/shared/components/ui/button";
import { AlertCircle, X } from "lucide-react";

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, unit, fromFleetInfo, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Konfirmasi Pindah Dump Truck
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Dump truck <span className="font-semibold text-gray-900 dark:text-gray-100">{unit?.hull_no}</span> saat ini sedang digunakan di fleet lain:
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Excavator:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{fromFleetInfo?.excavator || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Loading:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{fromFleetInfo?.loadingLocation || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dumping:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{fromFleetInfo?.dumpingLocation || "-"}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Apakah Anda yakin ingin memindahkan dump truck ini ke setting fleet saat ini? 
            Dump truck akan <span className="font-semibold text-red-600 dark:text-red-400">otomatis dihapus</span> dari fleet sebelumnya.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-neutral-50"
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? "Memproses..." : "Ya, Pindahkan"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;