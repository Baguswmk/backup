import React from "react";
import { Plus, Edit } from "lucide-react";
import TimbanganForm from "@/modules/timbangan/timbangan/TimbanganFormBaru";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import FleetSelectionDialog from "@/shared/components/FleetSelectionDialog";
import ModalHeader from "@/shared/components/ModalHeader";

// Input Form Modal
export const InputFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isActionLoading,
  shouldAutoConnect,
  onAutoConnectComplete,
}) => {
  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="px-6 py-2">
          <ModalHeader
            title="Input Data Timbangan"
            icon={Plus}
            onClose={onClose}
            disabled={isActionLoading}
          />
          <TimbanganForm
            onSubmit={onSubmit}
            isSubmitting={isActionLoading}
            shouldAutoConnect={shouldAutoConnect}
            onAutoConnectComplete={onAutoConnectComplete}
          />
        </div>
      </div>
    </div>
  );
};

// Edit Form Modal
export const EditFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  isActionLoading,
  formMode,
}) => {
  if (!isOpen || !editingItem) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <ModalHeader
            title="Edit Data Timbangan"
            icon={Edit}
            onClose={onClose}
            disabled={isActionLoading}
          />
          <TimbanganForm
            onSubmit={onSubmit}
            editingItem={editingItem}
            isSubmitting={isActionLoading}
            mode={formMode}
          />
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal
export const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemToDelete,
  isDeleting,
}) => {
  const target = itemToDelete?.isMultiple
    ? {
        name: `${itemToDelete.count} Data Terpilih`,
        excavator: "-",
        shift: "Multiple",
        workUnit: "-",
      }
    : itemToDelete;

  return (
    <DeleteConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      target={target}
      assignedCount={itemToDelete?.isMultiple ? itemToDelete.count : 0}
      isProcessing={isDeleting}
    />
  );
};

// Fleet Selection Modal
export const FleetModal = ({ isOpen, onClose, onSave }) => {
  return (
    <FleetSelectionDialog
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
    />
  );
};

// All Modals Container
const TimbanganModals = ({
  // Input Form
  showInputForm,
  onCloseInputForm,
  onSubmitInputForm,
  isActionLoading,
  shouldAutoConnect,
  onAutoConnectComplete,
  // Edit Form
  isFormOpen,
  onCloseEditForm,
  onSubmitEditForm,
  editingItem,
  formMode,
  // Delete
  showDeleteDialog,
  onCloseDeleteDialog,
  onConfirmDelete,
  itemToDelete,
  isDeleting,
  // Fleet
  showFleetDialog,
  onCloseFleetDialog,
  onSaveFleetSelection,
}) => {
  return (
    <>
      <InputFormModal
        isOpen={showInputForm}
        onClose={onCloseInputForm}
        onSubmit={onSubmitInputForm}
        isActionLoading={isActionLoading}
        shouldAutoConnect={shouldAutoConnect}
        onAutoConnectComplete={onAutoConnectComplete}
      />

      <EditFormModal
        isOpen={isFormOpen}
        onClose={onCloseEditForm}
        onSubmit={onSubmitEditForm}
        editingItem={editingItem}
        isActionLoading={isActionLoading}
        formMode={formMode}
      />

      <DeleteModal
        isOpen={showDeleteDialog}
        onClose={onCloseDeleteDialog}
        onConfirm={onConfirmDelete}
        itemToDelete={itemToDelete}
        isDeleting={isDeleting}
      />

      <FleetModal
        isOpen={showFleetDialog}
        onClose={onCloseFleetDialog}
        onSave={onSaveFleetSelection}
      />
    </>
  );
};

export default TimbanganModals;