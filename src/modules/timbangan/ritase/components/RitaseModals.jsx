import React from "react";
import { Plus, Edit, Scale } from "lucide-react";
import RitaseManualForm from "@/modules/timbangan/ritase/RitaseForm";
import RitaseForm from "@/modules/timbangan/ritase/RitaseForm";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import FleetSelectionDialog from "@/shared/components/FleetSelectionDialog";
import ModalHeader from "@/shared/components/ModalHeader";
import { TIMBANGAN_TYPES } from "@/modules/timbangan/ritase/constant/ritaseConstants";

export const InputFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isActionLoading,
  shouldAutoConnect,
  onAutoConnectComplete,
  timbanganType = TIMBANGAN_TYPES.INTERNAL,
}) => {
  if (!isOpen) return null;

  const renderFormComponent = () => {
    switch (timbanganType) {
      case TIMBANGAN_TYPES.MANUAL:
        return (
          <RitaseManualForm
            onSubmit={onSubmit}
            onCancel={onClose}
            mode="create"
          />
        );

      case TIMBANGAN_TYPES.INTERNAL:
        return (
          <RitaseForm
            onSubmit={onSubmit}
            isSubmitting={isActionLoading}
            shouldAutoConnect={shouldAutoConnect}
            onAutoConnectComplete={onAutoConnectComplete}
          />
        );


      default:
        return (
          <RitaseForm
            onSubmit={onSubmit}
            isSubmitting={isActionLoading}
            shouldAutoConnect={shouldAutoConnect}
            onAutoConnectComplete={onAutoConnectComplete}
          />
        );
    }
  };

  // Determine modal title based on type
  const getModalTitle = () => {
    switch (timbanganType) {
      case TIMBANGAN_TYPES.MANUAL:
        return "Input Ritase Manual";
      case TIMBANGAN_TYPES.CHECKPOINT:
        return "Input Ritase Checkpoint";
      case TIMBANGAN_TYPES.INTERNAL:
      default:
        return "Input Data Ritase";
    }
  };

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
      <div className="bg-neutral-50 dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-neutral-50 dark:bg-gray-900 px-6 py-4 z-10 border-b border-gray-200 dark:border-gray-700">
          <ModalHeader
            title={getModalTitle()}
            icon={Scale}
            onClose={onClose}
            disabled={isActionLoading}
          />
        </div>
        <div className="p-6">
          {renderFormComponent()}
        </div>
      </div>
    </div>
  );
};

export const EditFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  isActionLoading,
  formMode,
  timbanganType = TIMBANGAN_TYPES.INTERNAL,
}) => {
  if (!isOpen || !editingItem) return null;

  // Determine which form component to render for editing
  const renderEditFormComponent = () => {
    switch (timbanganType) {
      case TIMBANGAN_TYPES.MANUAL:
        return (
          <RitaseManualForm
            onSubmit={onSubmit}
            onCancel={onClose}
            editingItem={editingItem}
            mode={formMode}
          />
        );

      case TIMBANGAN_TYPES.INTERNAL:
      case TIMBANGAN_TYPES.CHECKPOINT:
      default:
        return (
          <RitaseForm
            onSubmit={onSubmit}
            editingItem={editingItem}
            isSubmitting={isActionLoading}
            mode={formMode}
          />
        );
    }
  };

  // Determine modal title based on type
  const getModalTitle = () => {
    switch (timbanganType) {
      case TIMBANGAN_TYPES.MANUAL:
        return "Edit Ritase Manual";
      case TIMBANGAN_TYPES.CHECKPOINT:
        return "Edit Ritase Checkpoint";
      case TIMBANGAN_TYPES.INTERNAL:
      default:
        return "Edit Data Ritase";
    }
  };

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
      <div className="bg-neutral-50 dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-neutral-50 dark:bg-gray-900 px-6 py-4 z-10 border-b border-gray-200 dark:border-gray-700">
          <ModalHeader
            title={getModalTitle()}
            icon={Edit}
            onClose={onClose}
            disabled={isActionLoading}
          />
        </div>
        <div className="p-6">
          {renderEditFormComponent()}
        </div>
      </div>
    </div>
  );
};

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

export const FleetModal = ({ isOpen, onClose, onSave, measurementType }) => {
  return (
    <FleetSelectionDialog
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      measurementType={measurementType}
    />
  );
};

const RitaseModals = ({
  showInputForm,
  onCloseInputForm,
  onSubmitInputForm,
  isActionLoading,
  shouldAutoConnect,
  onAutoConnectComplete,

  isFormOpen,
  onCloseEditForm,
  onSubmitEditForm,
  editingItem,
  formMode,

  showDeleteDialog,
  onCloseDeleteDialog,
  onConfirmDelete,
  itemToDelete,
  isDeleting,

  showFleetDialog,
  onCloseFleetDialog,
  onSaveFleetSelection,
  measurementType = "Ritase",
  timbanganType = TIMBANGAN_TYPES.INTERNAL,
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
        timbanganType={timbanganType}
      />

      <EditFormModal
        isOpen={isFormOpen}
        onClose={onCloseEditForm}
        onSubmit={onSubmitEditForm}
        editingItem={editingItem}
        isActionLoading={isActionLoading}
        formMode={formMode}
        timbanganType={timbanganType}
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
        measurementType={measurementType}
      />
    </>
  );
};

export default RitaseModals;