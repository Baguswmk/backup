import React from "react";
import FleetModal from "@/modules/timbangan/fleet/components/FleetModal";
import FleetSplitModal from "@/modules/timbangan/fleet/components/FleetSplitModal";
import FleetDetailModal from "@/modules/timbangan/fleet/components/FleetDetailModal";
import FleetSelectionDialog from "@/shared/components/FleetSelectionDialog";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import { LOADING_MESSAGES } from "@/modules/timbangan/fleet/constant/fleetConstants";

const FleetModalsManager = ({
  showConfigModal,
  onCloseConfigModal,
  selectedConfig,
  onSaveConfig,
  masters,
  canUpdate,
  fleetType,
  availableDumptruckSettings,
  showDetailModal,
  onCloseDetailModal,
  selectedDetailConfig,
  onEditConfig,

  showFleetSelectionDialog,
  onCloseFleetSelectionDialog,
  onSaveFleetSelection,

  showDeleteDialog,
  onCloseDeleteDialog,
  onConfirmDelete,
  deleteTarget,
  getDumptruckList,
  deleteActionType = "delete",
  showSplitModal,
  onCloseSplitModal,
  onSaveSplit,
  mastersLoading,
  isSaving,
}) => {
  return (
    <>
      {/* Fleet Create/Edit Modal - Only render when open */}
      {showConfigModal && (
        <FleetModal
          isOpen={showConfigModal}
          onClose={onCloseConfigModal}
          editingConfig={selectedConfig}
          onSave={onSaveConfig}
          masters={masters}
          mastersLoading={mastersLoading}
          fleetType={fleetType}
          availableDumptruckSettings={availableDumptruckSettings}
        />
      )}

      {/* Fleet Split Modal - Only render when open */}
      {showSplitModal && (
        <FleetSplitModal
          isOpen={showSplitModal}
          onClose={onCloseSplitModal}
          onSave={onSaveSplit}
          masters={masters}
          mastersLoading={mastersLoading}
          availableDumptruckSettings={availableDumptruckSettings}
        />
      )}

      {/* Fleet Detail Modal - Only render when open */}
      {showDetailModal && (
        <FleetDetailModal
          isOpen={showDetailModal}
          config={selectedDetailConfig}
          onClose={onCloseDetailModal}
          onEdit={canUpdate ? onEditConfig : null}
          readOnly={!canUpdate}
          dumptruck={
            selectedDetailConfig ? getDumptruckList(selectedDetailConfig) : []
          }
        />
      )}

      {/* Fleet Selection Dialog */}
      {showFleetSelectionDialog && (
        <FleetSelectionDialog
          isOpen={showFleetSelectionDialog}
          onClose={onCloseFleetSelectionDialog}
          onSave={onSaveFleetSelection}
        />
      )}

      {/* Delete Confirmation Dialog */}
     {showDeleteDialog && (
  <DeleteConfirmDialog
    isOpen={showDeleteDialog}
    onClose={onCloseDeleteDialog}
    onConfirm={onConfirmDelete}
    target={
      deleteTarget?.type === "single"
        ? deleteTarget.config
        : deleteTarget?.type === "split-group"
          ? deleteTarget.configs
          : deleteTarget
    }
    assignedCount={
      deleteTarget?.type === "single"
        ? deleteTarget.config?.dumptruckCount || 0
        : deleteTarget?.type === "split-group"
          ? deleteTarget.configs?.reduce(
              (sum, f) => sum + (f.dumptruckCount || f.units?.length || 0),
              0
            )
          : 0
    }
    isProcessing={isSaving}
    actionType={deleteActionType}  
  />
)}

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={isSaving}
        message={LOADING_MESSAGES.PROCESSING}
      />
    </>
  );
};

export default FleetModalsManager;
