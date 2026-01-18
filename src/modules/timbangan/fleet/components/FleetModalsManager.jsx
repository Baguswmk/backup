import React from "react";
import FleetModal from "@/modules/timbangan/fleet/components/FleetModal";
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
  getDumptruckCount,
  getDumptruckList,

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
          mastersLoading={false}
          fleetType={fleetType}
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
  target={deleteTarget}
  assignedCount={deleteTarget ? getDumptruckCount(deleteTarget.id) : 0}
  isProcessing={isSaving}
  requireConfirmation={true} 
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
