import { useState } from "react";
import { useRFIDWebSocket } from "@/shared/hooks/useRFIDWebSocket";

export const useRFIDHandler = ({
  enabled = true,
  // enabled = false,
  dtIndex,
  updateField,
  insertedWeight,
  isValid,
  handleSubmit,
  onSubmit,
  resetWeightState,
}) => {
  const [rfidMode] = useState(true);
  // const [rfidMode] = useState(fasle);
  const [lastRfidEpc, setLastRfidEpc] = useState("");
  const [rfidMatchStatus, setRfidMatchStatus] = useState(null);
  const [rfidWaitingSubmit, setRfidWaitingSubmit] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  const handleRfidScanFromBackend = (scanData) => {
    
    if (!scanData) {
      console.warn("⚠️ Invalid scan data - data is null/undefined");
      return;
    }

    // ✅ FIXED: Handle both string and object format
    let epcValue;
    
    if (typeof scanData === 'string') {
      // Backend kirim sebagai string langsung
      epcValue = scanData;
    } else if (typeof scanData === 'object') {
      // Backend kirim sebagai object dengan property epc
      epcValue = scanData.epc || scanData.uid || scanData.tag;
    }

    if (!epcValue) {
      console.warn("⚠️ Invalid scan data - EPC value not found");
      return;
    }

    setLastRfidEpc(epcValue);

    const match = Object.values(dtIndex).find(
      (dt) => dt.rfid === epcValue
    );

    if (!match) {
      console.warn("❌ RFID not found in dtIndex:", epcValue);
      setRfidMatchStatus({
        success: false,
        message: "RFID tidak terdaftar di fleet aktif",
        epc: epcValue,
      });
      
      // ✅ PENTING: Return di sini, jangan lanjut update form
      return;
    }


    updateField("rfid", epcValue);

    // Auto-fill form HANYA kalau ada match
    updateField("hull_no", match.hull_no);
    updateField("dumptruckId", match.dumptruckId);
    updateField("operator", match.operator_name);
    updateField("operatorId", match.operator_id);
    updateField("setting_fleet_id", match.setting_fleet_id);

    setRfidMatchStatus({
      success: true,
      message: "RFID berhasil dibaca",
      hull_no: match.hull_no,
      operator: match.operator_name,
      fleet: match.fleet_name,
      epc: epcValue,
    });

    // Auto-submit if weight is locked and form is valid
    if (insertedWeight !== null && isValid) {
      handleAutoSubmitAfterRFID();
    } 
  };

  // Auto-submit after RFID
  const handleAutoSubmitAfterRFID = async () => {
    if (autoSubmitting) {
      console.warn("⚠️ Already auto-submitting");
      return;
    }

    setAutoSubmitting(true);

    try {
      const result = await handleSubmit();

      if (result.success && onSubmit) {
        onSubmit(result);

        // Reset for next ritase
        setTimeout(() => {
          resetWeightState();
          setRfidMatchStatus(null);
          setLastRfidEpc("");
          setAutoSubmitting(false);
        }, 1000);
      } else {
        console.error("❌ Auto-submit failed:", result.error);
        setAutoSubmitting(false);
      }
    } catch (error) {
      console.error("❌ Auto-submit error:", error);
      setAutoSubmitting(false);
    }
  };

  // WebSocket connection
  const {
    isConnected: rfidConnected,
    isConnecting: rfidConnecting,
    error: rfidError,
    lastScan: rfidLastScan,
    reconnectAttempt,
    sendWeightStable,
    connect: connectRfid,
    disconnect: disconnectRfid,
    reconnect: reconnectRfid,
  } = useRFIDWebSocket({
    enabled: enabled && rfidMode,
    autoConnect: true,
    onRfidScan: handleRfidScanFromBackend,
  });

  return {
    rfidMode,
    rfidConnected,
    rfidConnecting,
    rfidError,
    rfidLastScan,
    rfidMatchStatus,
    rfidWaitingSubmit,
    autoSubmitting,
    lastRfidEpc,
    reconnectAttempt,
    handleRfidScan: handleRfidScanFromBackend,
    connectRfid,
    disconnectRfid,
    reconnectRfid,
    setRfidWaitingSubmit,
    sendWeightStable,

    //dtmode
    // rfidMode: false,
    // rfidConnected: false,
    // rfidConnecting: false,
    // rfidError: null,
    // rfidLastScan: null,
    // rfidMatchStatus: null,
    // rfidWaitingSubmit: false,
    // autoSubmitting: false,
    // lastRfidEpc: "",
    // reconnectAttempt: 0,
    // handleRfidScan: () => {},
    // connectRfid: () => {},
    // disconnectRfid: () => {},
    // reconnectRfid: () => {},
    // setRfidWaitingSubmit: () => {},
    // sendWeightStable: () => {},
  };
};