import { useState, useEffect, useRef } from "react";

export const useWeightStability = ({
  currentWeight,
  wsConnected,
  manualEditMode,
  isEditMode,
  updateField,
  formData,
  rfidMode,
  sendWeightStable, 
}) => {
  const [insertedWeight, setInsertedWeight] = useState(null);
  const [insertedTime, setInsertedTime] = useState(null);
  const [isWeightStale, setIsWeightStale] = useState(false);
  const [isWeightStable, setIsWeightStable] = useState(false);
  const [stableWeightCount, setStableWeightCount] = useState(0);
  const [waitingForFirstData, setWaitingForFirstData] = useState(true);
  const [rfidWaitingSubmit, setRfidWaitingSubmit] = useState(false);

  const lastUpdateTimeRef = useRef(null);
  const staleCheckIntervalRef = useRef(null);
  const prevWeightRef = useRef(null);
  const stableWeightTimerRef = useRef(null);
  const stableWeightValueRef = useRef(null);
  const stableWeightStartTimeRef = useRef(null);
  const firstDataReceivedRef = useRef(false);

  // Check for stale data
  useEffect(() => {
    if (isEditMode || !wsConnected) {
      setIsWeightStale(false);
      return;
    }

    if (staleCheckIntervalRef.current) {
      clearInterval(staleCheckIntervalRef.current);
    }

    staleCheckIntervalRef.current = setInterval(() => {
      if (!lastUpdateTimeRef.current) {
        setIsWeightStale(false);
        return;
      }

      const timeSinceUpdate = Date.now() - lastUpdateTimeRef.current;
      const STALE_THRESHOLD = 3000;

      setIsWeightStale(timeSinceUpdate > STALE_THRESHOLD);
    }, 1000);

    return () => {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
    };
  }, [wsConnected, isEditMode]);

  const handleAutoInsert = (weight) => {
    const formattedWeight = weight.toFixed(2);
    const now = new Date();
    
    setInsertedWeight(weight);
    setInsertedTime(now);
    setIsWeightStable(true);
    updateField("gross_weight", formattedWeight);

    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }

    // Trigger RFID waiting if needed
    if (rfidMode && !formData.hull_no) {
      setRfidWaitingSubmit(true);
    }
    
    // ✅ TAMBAHAN: Aktifkan RFID scan saat weight locked
    if (rfidMode && sendWeightStable) {
      sendWeightStable(true);
    }
  };

  // Monitor weight stability
  useEffect(() => {
    if (
      isEditMode ||
      manualEditMode ||
      insertedWeight !== null ||
      !wsConnected ||
      !currentWeight
    ) {
      return;
    }

    const newWeight = parseFloat(currentWeight);
    if (isNaN(newWeight) || newWeight < 0) return;

    if (waitingForFirstData && !firstDataReceivedRef.current) {
      firstDataReceivedRef.current = true;
      setWaitingForFirstData(false);
      lastUpdateTimeRef.current = Date.now();
    }

    if (prevWeightRef.current !== null) {
      const weightDiff = Math.abs(newWeight - prevWeightRef.current);

      if (weightDiff > 0.01) {
        // Weight changed - reset stability
        setIsWeightStable(false);
        setStableWeightCount(0);
        stableWeightValueRef.current = null;
        stableWeightStartTimeRef.current = null;

        if (stableWeightTimerRef.current) {
          clearTimeout(stableWeightTimerRef.current);
          stableWeightTimerRef.current = null;
        }
      } else {
        // Weight stable - increment count
        const newCount = stableWeightCount + 1;
        setStableWeightCount(newCount);

        if (stableWeightValueRef.current === null) {
          stableWeightValueRef.current = newWeight;
          stableWeightStartTimeRef.current = Date.now();
        }

        // Auto-insert after 2 seconds of stability
        if (!stableWeightTimerRef.current && stableWeightStartTimeRef.current) {
          stableWeightTimerRef.current = setTimeout(() => {
            const elapsedTime = Date.now() - stableWeightStartTimeRef.current;

            if (
              elapsedTime >= 2000 &&
              !insertedWeight &&
              wsConnected &&
              stableWeightValueRef.current !== null
            ) {
              handleAutoInsert(stableWeightValueRef.current);
            }
          }, 2000);
        }

        // Auto-insert after 10 stable readings
        if (newCount >= 10 && !insertedWeight) {
          if (stableWeightTimerRef.current) {
            clearTimeout(stableWeightTimerRef.current);
            stableWeightTimerRef.current = null;
          }
          handleAutoInsert(newWeight);
        }

        setIsWeightStable(true);
      }
    } else {
      stableWeightValueRef.current = newWeight;
      stableWeightStartTimeRef.current = Date.now();
      setStableWeightCount(1);
    }

    prevWeightRef.current = newWeight;
    lastUpdateTimeRef.current = Date.now();
  }, [
    currentWeight,
    wsConnected,
    manualEditMode,
    insertedWeight,
    isEditMode,
    stableWeightCount,
    waitingForFirstData,
  ]);

  // Manual insert - Support offline manual input
  const handleManualInsert = () => {
    if (isEditMode) {
      return;
    }

    let weight;
    
    if (wsConnected && currentWeight) {
      // Online mode - ambil dari timbangan
      weight = parseFloat(currentWeight);
    } else if (manualEditMode && formData.gross_weight) {
      // Offline manual mode - ambil dari form input
      weight = parseFloat(formData.gross_weight);
    } else {
      return;
    }

    if (isNaN(weight) || weight <= 0) {
      return;
    }

    // Set weight stable = true saat manual insert
    setIsWeightStable(true);
    
    handleAutoInsert(weight);
  };

  // ✅ FUNGSI UNLOCK - Disable RFID scan saat unlock
  const handleUnlock = () => {
    if (isEditMode) {
      return;
    }

    
    // ✅ Disable RFID scan saat unlock
    if (rfidMode && sendWeightStable) {
      sendWeightStable(false);
    }
    
    // Reset inserted weight state
    setInsertedWeight(null);
    setInsertedTime(null);
    setRfidWaitingSubmit(false);
    
    // Reset stability tracking
    setStableWeightCount(0);
    stableWeightValueRef.current = null;
    stableWeightStartTimeRef.current = null;
    
    // Clear any pending timers
    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }
    
    // Di manual mode, clear form field
    if (manualEditMode) {
      updateField("gross_weight", "");
      setIsWeightStable(false);
    } else if (wsConnected) {
      // Di online mode, biarkan weight tracking continue
      setIsWeightStable(false);
    }
  };

  // Reset state
  const resetWeightState = () => {
    // ✅ Disable RFID scan saat reset
    if (rfidMode && sendWeightStable) {
      sendWeightStable(false);
    }
    
    setInsertedWeight(null);
    setInsertedTime(null);
    setIsWeightStable(false);
    setStableWeightCount(0);
    setWaitingForFirstData(true);
    setRfidWaitingSubmit(false);
    prevWeightRef.current = null;
    stableWeightValueRef.current = null;
    stableWeightStartTimeRef.current = null;
    firstDataReceivedRef.current = false;

    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
      if (stableWeightTimerRef.current) {
        clearTimeout(stableWeightTimerRef.current);
      }
    };
  }, []);

  return {
    insertedWeight,
    insertedTime,
    isWeightStale,
    isWeightStable,
    stableWeightCount,
    waitingForFirstData,
    rfidWaitingSubmit,
    setRfidWaitingSubmit,
    handleAutoInsert,
    handleManualInsert,
    handleUnlock,
    resetWeightState,
  };
};