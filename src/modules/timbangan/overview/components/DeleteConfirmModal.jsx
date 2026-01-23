import React from "react";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/shared/components/ConfirmDialog";

const DeleteConfirmModal = ({ isOpen, ritase, onClose, onConfirm }) => {
  if (!isOpen || !ritase) return null;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => {
        onConfirm(ritase.id);
        onClose();
      }}
      title="Konfirmasi Hapus"
      confirmLabel="Hapus"
      cancelLabel="Batal"
      variant="destructive"
      icon={Trash2}
    >
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        Apakah Anda yakin ingin menghapus ritase ini?
      </p>
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md mb-4">
        <p className="text-sm dark:text-gray-300">
          <span className="font-semibold">Unit:</span> {ritase.unit_dump_truck}
        </p>
        <p className="text-sm dark:text-gray-300">
          <span className="font-semibold">Driver:</span> {ritase.driver}
        </p>
        <p className="text-sm dark:text-gray-300">
          <span className="font-semibold">Berat:</span> {ritase.net_weight} Ton
        </p>
      </div>
      <p className="text-sm text-red-600 dark:text-red-400">
        Data yang dihapus tidak dapat dikembalikan!
      </p>
    </ConfirmDialog>
  );
};

export default DeleteConfirmModal;