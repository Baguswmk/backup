import React, { useState, useEffect, useRef } from "react";
import { useTimbanganForm } from "@/modules/timbangan/timbangan/hooks/useTimbanganForm";
import { useTimbanganStore } from "@/modules/timbangan/timbangan/store/timbanganStore";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";

// Components
import ConnectionStatus from "@/modules/timbangan/timbangan/components/timbangan_form/components/ConnectionStatus";
import RFIDStatus from "@/modules/timbangan/timbangan/components/timbangan_form/components/RFIDStatus";
import ShortcutHelp from "@/modules/timbangan/timbangan/components/timbangan_form/components/ShortcutHelp";
import WeightInput from "@/modules/timbangan/timbangan/components/timbangan_form/components/WeightInput";
import HullNoInput from "@/modules/timbangan/timbangan/components/timbangan_form/components/HullNoInput";
import FleetSummary from "@/modules/timbangan/timbangan/components/timbangan_form/components/FleetSummary";
import FormActions from "@/modules/timbangan/timbangan/components/timbangan_form/components/FormActions";
import DeleteConfirmation from "@/modules/timbangan/timbangan/components/timbangan_form/components/DeleteConfirmation";
import EditForm from "@/modules/timbangan/timbangan/components/timbangan_form/components/EditForm";

// Hooks
import { useWeightStability } from "@/modules/timbangan/timbangan/components/timbangan_form/hooks/useWeightStability";
import { useKeyboardShortcuts } from "@/modules/timbangan/timbangan/components/timbangan_form/hooks/useKeyboardShortcuts";
import { useRFIDHandler } from "@/modules/timbangan/timbangan/components/timbangan_form/hooks/useRFIDHandler";
import { useAutoConnect } from "@/modules/timbangan/timbangan/components/timbangan_form/hooks/useAutoConnect";

// Utils
import { getFormOptions } from "@/modules/timbangan/timbangan/components/timbangan_form/utils/formOptions";

const TimbanganForm = ({
  onSubmit,
  editingItem,
  mode = "create",
  isSubmitting = false,
  shouldAutoConnect = false,
  onAutoConnectComplete,
}) => {
  const { user } = useAuthStore();
  const { masters } = useFleet(user ? { user } : null);
  const dtIndex = useTimbanganStore((state) => state.dtIndex);

  // Form state
  const {
    formData,
    errors,
    isValid,
    isLoading,
    updateField,
    resetForm,
    validateField,
    handleSubmit,
    formSummary,
  } = useTimbanganForm(editingItem, mode, masters);

  // Scale connection
  const {
    isConnected: wsConnected,
    isConnecting,
    currentWeight,
    isSupported,
    connect,
    disconnect,
    autoConnect,
    error: scaleError,
  } = useWebSerialScale();

  // UI state
  const [manualEditMode, setManualEditMode] = useState(false);
  const [displayWeight, setDisplayWeight] = useState("");
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  // RFID handling - Only initialize in create mode
  const rfidEnabled = mode === "create";
  const {
    rfidMode,
    rfidConnected,
    rfidConnecting,
    rfidError,
    rfidMatchStatus,
    rfidWaitingSubmit,
    autoSubmitting,
    lastRfidEpc,
    reconnectAttempt,
    lastScan,
    connectRfid,
    reconnectRfid,
    sendWeightStable, // ✅ Ambil sendWeightStable dari RFID handler
  } = useRFIDHandler({
    enabled: rfidEnabled,
    dtIndex,
    updateField,
    insertedWeight: null, // Sementara null, akan di-update di bawah
    isValid,
    handleSubmit,
    onSubmit,
    resetWeightState: () => {}, // Sementara kosong
  });

  // ✅ Weight stability - Pass sendWeightStable ke hook
  const {
    insertedWeight,
    insertedTime,
    isWeightStable,
    isWeightStale,
    stableWeightCount,
    waitingForFirstData,
    handleManualInsert,
    handleUnlock, // ✅ Ambil handleUnlock
    resetWeightState,
  } = useWeightStability({
    currentWeight,
    wsConnected,
    manualEditMode,
    isEditMode: mode === "edit",
    updateField,
    formData,
    rfidMode: rfidEnabled && rfidMode,
    sendWeightStable: rfidEnabled ? sendWeightStable : undefined, // ✅ Pass ke weight stability
  });

  // Auto-connect on mount
  useAutoConnect({
    shouldAutoConnect,
    wsConnected,
    isSupported,
    mode,
    autoConnect,
    onAutoConnectComplete,
  });

  // Handle reset
  const handleReset = () => {
    resetForm();
    resetWeightState();
    setDisplayWeight("");
    setManualEditMode(false);
  };

  // Handle form submit
  const handleFormSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const isEditMode = mode === "edit";

    if (!isEditMode && !manualEditMode && wsConnected && insertedWeight === null && currentWeight !== null) {
      return;
    }

    const result = await handleSubmit();
    if (result.success && onSubmit) {
      onSubmit(result);
      if (!isEditMode) {
        handleReset();
      }
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    mode,
    wsConnected,
    currentWeight,
    isWeightStable,
    manualEditMode,
    isValid,
    isSubmitting,
    formSummary,
    showShortcutHelp,
    handleInsert: handleManualInsert,
    handleUnlock, // ✅ Pass handleUnlock
    handleSubmit: handleFormSubmit,
    resetForm: handleReset,
    setShowShortcutHelp,
    setManualEditMode,
    onSubmit,
  });

  // Form options
  const formOptions = getFormOptions(masters, dtIndex);

  // Refs
  const updateFieldRef = useRef(updateField);
  useEffect(() => {
    updateFieldRef.current = updateField;
  }, [updateField]);

  // Mode checks
  const isDeleteMode = mode === "delete";
  const isEditMode = mode === "edit";
  const canEditWeight = manualEditMode || isEditMode || insertedWeight !== null;

  // Handle weight change
  const handleManualWeightChange = (value) => {
    if (canEditWeight) {
      if (value === "" || parseFloat(value) <= 999.99) {
        setDisplayWeight(value);
        updateField("gross_weight", value);
      }
    }
  };

  // Update display weight from current weight
  useEffect(() => {
    if (isEditMode || manualEditMode || insertedWeight !== null) return;

    const timeoutId = setTimeout(() => {
      if (wsConnected && currentWeight !== null) {
        const newWeight = parseFloat(currentWeight);
        if (!isNaN(newWeight) && newWeight >= 0) {
          setDisplayWeight(newWeight.toFixed(2));
          updateField("gross_weight", newWeight.toFixed(2));
        }
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [currentWeight, wsConnected, manualEditMode, insertedWeight, isEditMode, updateField]);

  // ✅ Monitor lastScan dari RFID
  useEffect(() => {
    if (lastScan) {
      console.log("📡 RFID scan detected in form:", lastScan);
    }
  }, [lastScan]);

  // Handle edit mode initialization
  useEffect(() => {
    if (isEditMode && editingItem?.gross_weight) {
      setDisplayWeight(editingItem.gross_weight.toString());
      setManualEditMode(true);
    }
  }, [isEditMode, editingItem]);

  // Render delete confirmation
  if (isDeleteMode) {
    return (
      <DeleteConfirmation
        editingItem={editingItem}
        onConfirm={handleFormSubmit}
        onCancel={() => onSubmit?.({ cancelled: true })}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Render edit form
  if (isEditMode) {
    return (
      <EditForm
        editingItem={editingItem}
        formData={formData}
        errors={errors}
        formOptions={formOptions}
        updateField={updateField}
        onSubmit={handleFormSubmit}
        onCancel={() => onSubmit?.({ cancelled: true })}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Render create form
  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {rfidEnabled && (
        <RFIDStatus
          rfidMode={rfidMode}
          rfidConnected={rfidConnected}
          rfidConnecting={rfidConnecting}
          rfidError={rfidError}
          rfidMatchStatus={rfidMatchStatus}
          rfidWaitingSubmit={rfidWaitingSubmit}
          autoSubmitting={autoSubmitting}
          lastRfidEpc={lastRfidEpc}
          insertedWeight={insertedWeight}
          isWeightStable={isWeightStable}
          reconnectAttempt={reconnectAttempt}
          connectRfid={connectRfid}
          reconnectRfid={reconnectRfid}
        />
      )}

      {showShortcutHelp && (
        <ShortcutHelp onClose={() => setShowShortcutHelp(false)} />
      )}

      <ConnectionStatus
        isSupported={isSupported}
        wsConnected={wsConnected}
        isConnecting={isConnecting}
        currentWeight={currentWeight}
        scaleError={scaleError}
        waitingForFirstData={waitingForFirstData}
        insertedWeight={insertedWeight}
        isWeightStable={isWeightStable}
        stableWeightCount={stableWeightCount}
        connect={connect}
        disconnect={disconnect}
      />

      <WeightInput
        displayWeight={displayWeight}
        formData={formData}
        errors={errors}
        wsConnected={wsConnected}
        currentWeight={currentWeight}
        manualEditMode={manualEditMode}
        insertedWeight={insertedWeight}
        insertedTime={insertedTime}
        isWeightStable={isWeightStable}
        isWeightStale={isWeightStale}
        stableWeightCount={stableWeightCount}
        waitingForFirstData={waitingForFirstData}
        canEditWeight={canEditWeight}
        isLoading={isLoading}
        autoSubmitting={autoSubmitting}
        showShortcutHelp={showShortcutHelp}
        rfidMode={rfidEnabled && rfidMode}
        rfidWaitingSubmit={rfidWaitingSubmit}
        onWeightChange={handleManualWeightChange}
        onInsert={handleManualInsert}
        onUnlock={handleUnlock} // ✅ Pass handleUnlock
        onToggleManual={() => setManualEditMode(!manualEditMode)}
        onToggleHelp={() => setShowShortcutHelp(!showShortcutHelp)}
        validateField={validateField}
      />

      <HullNoInput
        value={formData.hull_no}
        options={formOptions.hullNoOptions}
        error={errors.hull_no}
        dtIndex={dtIndex}
        rfidMode={rfidEnabled && rfidMode}
        rfidWaitingSubmit={rfidWaitingSubmit}
        autoSubmitting={autoSubmitting}
        isLoading={isLoading}
        onChange={(value, item) => {
          if (item?.__data?.isHidden) return;
          updateField("hull_no", value);
          updateField("dumptruckId", item.__data.dumptruckId);
          updateField("operator", item.__data.operator_name);
          updateField("operatorId", item.__data.operator_id);
          updateField("setting_fleet_id", item.__data.setting_fleet_id);
        }}
      />

      {formSummary.fleetInfo && formSummary.isAutoFilled && (
        <FleetSummary
          fleetInfo={formSummary.fleetInfo}
          hullNo={formSummary.hull_no}
          rfidTapDetected={rfidMatchStatus?.success}
        />
      )}

      <FormActions
        isValid={isValid}
        isSubmitting={isSubmitting}
        isLoading={isLoading}
        autoSubmitting={autoSubmitting}
        isAutoFilled={formSummary.isAutoFilled}
        hasErrors={Object.keys(errors).length > 0}
        hullNo={formData.hull_no}
        rfidMode={rfidEnabled && rfidMode}
        rfidWaitingSubmit={rfidWaitingSubmit}
        onSubmit={handleFormSubmit}
        onReset={handleReset}
        onCancel={() => onSubmit?.({ cancelled: true })}
      />
    </div>
  );
};

export default TimbanganForm;