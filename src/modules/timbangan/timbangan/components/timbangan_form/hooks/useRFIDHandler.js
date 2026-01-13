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
    console.log("📡 RFID Scan Data received:", scanData);
    
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
      console.log("Received data:", scanData);
      return;
    }

    console.log("🔍 Searching for EPC:", epcValue);
    setLastRfidEpc(epcValue);

    // ✅ FIXED: Find match in dtIndex dengan logging
    // const match = Object.values(dtIndex).find(
    //   (dt) => {
    //     const isMatch = dt.rfid_uid === epcValue || dt.rfid_epc === epcValue;
    //     if (isMatch) {
    //       console.log("✅ Match found:", dt.hull_no);
    //     }
    //     return isMatch;
    //   }
    // );

    const match = Object.values(dtIndex).find(
      (dt) => dt.rfid === epcValue
    );

    if (!match) {
      console.warn("❌ RFID not found in dtIndex:", epcValue);
      console.log("Available RFIDs:", Object.values(dtIndex).map(dt => ({
        hull_no: dt.hull_no,
        rfid_uid: dt.rfid_uid,
        rfid_epc: dt.rfid_epc
      })));
      
      setRfidMatchStatus({
        success: false,
        message: "RFID tidak terdaftar di fleet aktif",
        epc: epcValue,
      });
      
      // ✅ PENTING: Return di sini, jangan lanjut update form
      return;
    }

    console.log("✅ RFID Match found:", {
      hull_no: match.hull_no,
      operator: match.operator_name,
      fleet: match.fleet_name,
    });

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
      console.log("🚀 Triggering auto-submit...");
      handleAutoSubmitAfterRFID();
    } else {
      console.log("⏳ Waiting for form to be valid before auto-submit");
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
      console.log("📤 Auto-submitting form...");
      const result = await handleSubmit();

      if (result.success && onSubmit) {
        console.log("✅ Auto-submit successful");
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