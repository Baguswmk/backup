import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import SearchableSelect from "@/shared/components/SearchableSelect";
import ScaleConnectionStatus from "./ScaleConnectionStatus";
import {
  Truck,
  Scale,
  AlertCircle,
  Save,
  X,
  Weight,
  CheckCircle2,
  Loader2,
  Info,
  WifiOff,
  Download,
  Edit2,
  Radio,
  Wifi,
} from "lucide-react";
import { showToast } from "@/shared/utils/toast";
import { ritaseServices } from "@/modules/timbangan/ritase/services/ritaseServices";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import { format } from "date-fns";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";

const MEASUREMENT_TYPES = {
  TIMBANGAN: "Timbangan",
  BYPASS: "Bypass",
  BELTSCALE: "Beltscale",
  MANUAL: "Manual",
  CHECKPOINT: "Checkpoint",
};

const HIDDEN_DURATION_MS = 10 * 60 * 1000;

const RitaseInputModal = ({
  isOpen,
  onClose,
  onSubmit,
  fleetConfigs = [],
  shouldAutoConnect = false,
}) => {
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [hullNo, setHullNo] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [tareWeight, setTareWeight] = useState(null);
  const [calculatedNetWeight, setCalculatedNetWeight] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();

  const [insertedWeight, setInsertedWeight] = useState(null);
  const [insertedTime, setInsertedTime] = useState(null);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [displayWeight, setDisplayWeight] = useState("");
  const [isWeightStable, setIsWeightStable] = useState(false);
  const [stableWeightCount, setStableWeightCount] = useState(0);
  const [waitingForFirstData, setWaitingForFirstData] = useState(true);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState(false);

  const prevWeightRef = useRef(null);
  const stableWeightTimerRef = useRef(null);
  const stableWeightValueRef = useRef(null);
  const stableWeightStartTimeRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const autoUnhideTimerRef = useRef(null);

  const hiddenDumptrucks = useRitaseStore((state) => state.hiddenDumptrucks);
  const hideDumptruck = useRitaseStore((state) => state.hideDumptruck);
  const unhideDumptruck = useRitaseStore((state) => state.unhideDumptruck);

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

  useEffect(() => {
    if (!isOpen) return;

    const checkAndUnhideExpired = () => {
      const now = Date.now();

      Object.entries(hiddenDumptrucks).forEach(([key, data]) => {
        const hiddenTime = new Date(data.timestamp).getTime();
        const elapsed = now - hiddenTime;

        if (elapsed >= HIDDEN_DURATION_MS) {
          unhideDumptruck(data.originalHullNo);

          showToast.info(
            `${data.originalHullNo} sudah tersedia kembali setelah 10 menit`,
            { duration: 3000 },
          );
        }
      });
    };

    checkAndUnhideExpired();

    autoUnhideTimerRef.current = setInterval(checkAndUnhideExpired, 30000);

    return () => {
      if (autoUnhideTimerRef.current) {
        clearInterval(autoUnhideTimerRef.current);
      }
    };
  }, [isOpen, hiddenDumptrucks, unhideDumptruck]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const measurementType =
      selectedFleet?.measurement_type ||
      selectedFleet?.measurementType ||
      MEASUREMENT_TYPES.TIMBANGAN;

    if (
      measurementType === MEASUREMENT_TYPES.TIMBANGAN &&
      grossWeight &&
      tareWeight !== null
    ) {
      const gross = parseFloat(grossWeight);
      const tare = parseFloat(tareWeight);

      if (!isNaN(gross) && !isNaN(tare) && gross > 0) {
        const netCalc = gross - tare;
        setCalculatedNetWeight(netCalc > 0 ? netCalc : 0);
      } else {
        setCalculatedNetWeight(null);
      }
    } else {
      setCalculatedNetWeight(null);
    }
  }, [grossWeight, tareWeight, selectedFleet]);

  useEffect(() => {
    if (
      shouldAutoConnect &&
      !wsConnected &&
      !isAutoConnecting &&
      !autoConnectAttempted &&
      isSupported &&
      !isConnecting &&
      isOpen
    ) {
      setIsAutoConnecting(true);
      setAutoConnectAttempted(true);
      setConnectionTimeout(false);

      connectionTimeoutRef.current = setTimeout(() => {
        if (!wsConnected && isAutoConnecting) {
          console.warn("⚠️ Auto-connect timeout after 5 seconds");
          setConnectionTimeout(true);
          setIsAutoConnecting(false);
        }
      }, 5000);

      autoConnect()
        .then(() => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
          }
          setIsAutoConnecting(false);
        })
        .catch((error) => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
          }
          console.error("❌ Auto-connect error:", error);
          setIsAutoConnecting(false);
        });
    }

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [
    shouldAutoConnect,
    wsConnected,
    isSupported,
    isConnecting,
    isAutoConnecting,
    autoConnectAttempted,
    isOpen,
    autoConnect,
  ]);

  useEffect(() => {
    if (isOpen) {
      prevWeightRef.current = null;
      setDisplayWeight("");
      setInsertedWeight(null);
      setInsertedTime(null);
      setManualEditMode(false);
      setIsWeightStable(false);
      setStableWeightCount(0);
      setWaitingForFirstData(true);
      stableWeightValueRef.current = null;
      stableWeightStartTimeRef.current = null;
    }

    return () => {
      if (stableWeightTimerRef.current) {
        clearTimeout(stableWeightTimerRef.current);
        stableWeightTimerRef.current = null;
      }
    };
  }, [isOpen]);

  const handleAutoInsert = useCallback(
    (weight) => {
      const formattedWeight = weight.toFixed(2);
      const now = new Date();
      setInsertedWeight(weight);
      setInsertedTime(now);
      setDisplayWeight(formattedWeight);
      setIsWeightStable(true);

      const measurementType =
        selectedFleet?.measurement_type ||
        selectedFleet?.measurementType ||
        MEASUREMENT_TYPES.TIMBANGAN;
      const hasWeighBridge = user?.weigh_bridge != null;

      if (measurementType === MEASUREMENT_TYPES.TIMBANGAN && hasWeighBridge) {
        setGrossWeight(formattedWeight);
      } else if (
        (measurementType === MEASUREMENT_TYPES.TIMBANGAN && !hasWeighBridge) ||
        measurementType === MEASUREMENT_TYPES.BYPASS
      ) {
        setNetWeight(formattedWeight);
      }

      if (stableWeightTimerRef.current) {
        clearTimeout(stableWeightTimerRef.current);
        stableWeightTimerRef.current = null;
      }
    },
    [selectedFleet, user],
  );

  useEffect(() => {
    if (
      manualEditMode ||
      insertedWeight !== null ||
      !wsConnected ||
      !currentWeight
    ) {
      return;
    }

    const newWeight = parseFloat(currentWeight);
    if (isNaN(newWeight) || newWeight < 0) return;

    if (waitingForFirstData) {
      setWaitingForFirstData(false);
    }

    if (prevWeightRef.current !== null) {
      const weightDiff = Math.abs(newWeight - prevWeightRef.current);

      if (weightDiff > 0.01) {
        setIsWeightStable(false);
        setStableWeightCount(0);
        stableWeightValueRef.current = null;
        stableWeightStartTimeRef.current = null;

        if (stableWeightTimerRef.current) {
          clearTimeout(stableWeightTimerRef.current);
          stableWeightTimerRef.current = null;
        }
      } else {
        const newCount = stableWeightCount + 1;
        setStableWeightCount(newCount);

        if (stableWeightValueRef.current === null) {
          stableWeightValueRef.current = newWeight;
          stableWeightStartTimeRef.current = Date.now();
        }

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
  }, [
    currentWeight,
    wsConnected,
    manualEditMode,
    insertedWeight,
    stableWeightCount,
    waitingForFirstData,
    handleAutoInsert,
  ]);

  useEffect(() => {
    if (manualEditMode || insertedWeight !== null) return;

    const timeoutId = setTimeout(() => {
      if (wsConnected && currentWeight !== null) {
        const newWeight = parseFloat(currentWeight);
        if (!isNaN(newWeight) && newWeight >= 0) {
          setDisplayWeight(newWeight.toFixed(2));
        }
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [currentWeight, wsConnected, manualEditMode, insertedWeight]);

  const getRemainingHiddenTime = useCallback(
    (hullNo) => {
      const normalizedHull = String(hullNo)
        .replace(/[\s\-_]+/g, "")
        .toUpperCase()
        .slice(0, 50);

      const hiddenData = hiddenDumptrucks[normalizedHull];
      if (!hiddenData) return null;

      const hiddenTime = new Date(hiddenData.timestamp).getTime();
      const now = Date.now();
      const elapsed = now - hiddenTime;
      const remaining = HIDDEN_DURATION_MS - elapsed;

      if (remaining <= 0) return null;

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      return { minutes, seconds, total: remaining };
    },
    [hiddenDumptrucks],
  );

  const hullNoOptions = useMemo(() => {
    const hullNos = new Map();
    const now = Date.now();

    fleetConfigs.forEach((fleet) => {
      const dumptrucks = fleet.dumptruck || fleet.units || [];
      dumptrucks.forEach((dt) => {
        const hull = dt.hull_no || dt.hullNo;
        if (!hull) return;

        const normalizedHull = String(hull)
          .replace(/[\s\-_]+/g, "")
          .toUpperCase()
          .slice(0, 50);

        const hiddenData = hiddenDumptrucks[normalizedHull];

        if (hiddenData) {
          const hiddenTime = new Date(hiddenData.timestamp).getTime();
          const elapsed = now - hiddenTime;

          if (elapsed < HIDDEN_DURATION_MS) {
            const remaining = getRemainingHiddenTime(normalizedHull);

            return;
          } else {
            unhideDumptruck(hull);
          }
        }

        hullNos.set(hull, {
          value: hull,
          label: hull,
          hint: `${fleet.excavator} | ${dt.operator || dt.operator_name || "No Operator"}`,
        });
      });
    });

    const options = Array.from(hullNos.values());
    return options;
  }, [fleetConfigs, hiddenDumptrucks, getRemainingHiddenTime, unhideDumptruck]);

  const findFleetForHullNo = useCallback(
    (hull) => {
      if (!hull) return null;

      for (const fleet of fleetConfigs) {
        const dumptrucks = fleet.dumptruck || fleet.units || [];
        const hasDumptruck = dumptrucks.some(
          (dt) => (dt.hull_no || dt.hullNo) === hull,
        );
        if (hasDumptruck) {
          return fleet;
        }
      }
      return null;
    },
    [fleetConfigs],
  );

  const handleHullNoChange = useCallback(
    (value) => {
      setHullNo(value);

      const fleet = findFleetForHullNo(value);
      setSelectedFleet(fleet);

      if (fleet && value) {
        const dumptrucks = fleet.dumptruck || fleet.units || [];
        const selectedDT = dumptrucks.find(
          (dt) => (dt.hull_no || dt.hullNo) === value,
        );

        if (selectedDT) {
          const tare = selectedDT.tareWeight || selectedDT.tare_weight;
          setTareWeight(
            tare !== null && tare !== undefined ? parseFloat(tare) : null,
          );
        } else {
          setTareWeight(null);
        }
      } else {
        setTareWeight(null);
      }

      setErrors((prev) => ({ ...prev, hull_no: null, fleet: null }));
    },
    [findFleetForHullNo],
  );

  const handleInsert = useCallback(() => {
    if (!wsConnected || !currentWeight) return;

    const weight = parseFloat(currentWeight);
    const formattedWeight = weight.toFixed(2);
    const now = new Date();

    setInsertedWeight(weight);
    setInsertedTime(now);
    setDisplayWeight(formattedWeight);
    setIsWeightStable(true);

    const measurementType =
      selectedFleet?.measurement_type ||
      selectedFleet?.measurementType ||
      MEASUREMENT_TYPES.TIMBANGAN;
    const hasWeighBridge = user?.weigh_bridge != null;

    if (measurementType === MEASUREMENT_TYPES.TIMBANGAN && hasWeighBridge) {
      setGrossWeight(formattedWeight);
    } else if (
      (measurementType === MEASUREMENT_TYPES.TIMBANGAN && !hasWeighBridge) ||
      measurementType === MEASUREMENT_TYPES.BYPASS
    ) {
      setNetWeight(formattedWeight);
    }

    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }
  }, [wsConnected, currentWeight, selectedFleet, user]);

  const handleToggleManualEdit = useCallback(() => {
    const newMode = !manualEditMode;
    setManualEditMode(newMode);

    if (newMode) {
      setInsertedWeight(null);
      setInsertedTime(null);
      setIsWeightStable(false);
      setStableWeightCount(0);
    }

    if (!newMode && wsConnected && currentWeight) {
      const weight = parseFloat(currentWeight);
      const formattedWeight = weight.toFixed(2);
      setDisplayWeight(formattedWeight);
    }
  }, [manualEditMode, wsConnected, currentWeight]);

    const handleManualWeightChange = useCallback(
      (value) => {
        const canEdit = manualEditMode || insertedWeight !== null;

        if (canEdit) {
          let formattedValue = value.replace(/,/g, ".");

          const measurementType =
            selectedFleet?.measurement_type ||
            selectedFleet?.measurementType ||
            MEASUREMENT_TYPES.TIMBANGAN;
          const hasWeighBridge = user?.weigh_bridge != null;

          const isGrossWeight =
            measurementType === MEASUREMENT_TYPES.TIMBANGAN && hasWeighBridge;
          const isNetWeight =
            (measurementType === MEASUREMENT_TYPES.TIMBANGAN &&
              !hasWeighBridge) ||
            measurementType === MEASUREMENT_TYPES.BYPASS;

          const netWeightRegex = /^\d{0,2}(\.\d{0,2})?$/;
          const grossWeightRegex = /^\d{0,3}(\.\d{0,2})?$/;

          let isValid = false;
          if (formattedValue === "") {
            isValid = true;
          } else if (isGrossWeight) {
            isValid = grossWeightRegex.test(formattedValue);
            const numValue = parseFloat(formattedValue);
            if (!isNaN(numValue) && numValue > 199.99) {
              isValid = false;
            }
          } else if (isNetWeight) {
            isValid = netWeightRegex.test(formattedValue);
            const numValue = parseFloat(formattedValue);
            if (!isNaN(numValue) && numValue > 99.99) {
              isValid = false;
            }
          }

          if (isValid) {
            setDisplayWeight(formattedValue);

            if (isGrossWeight) {
              setGrossWeight(formattedValue);
              setErrors((prev) => ({ ...prev, gross_weight: null }));
            } else if (isNetWeight) {
              setNetWeight(formattedValue);
              setErrors((prev) => ({ ...prev, net_weight: null }));
            }

            if (insertedWeight !== null) {
              setInsertedWeight(null);
              setInsertedTime(null);
              setIsWeightStable(false);
            }
          }
        }
      },
      [manualEditMode, insertedWeight, selectedFleet, user],
    );

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!hullNo || hullNo.trim() === "") {
      newErrors.hull_no = "Nomor lambung harus diisi";
    }

    if (!selectedFleet) {
      newErrors.fleet = "Fleet tidak ditemukan untuk nomor lambung ini";
    }

    if (selectedFleet) {
      const measurementType =
        selectedFleet.measurement_type ||
        selectedFleet.measurementType ||
        MEASUREMENT_TYPES.TIMBANGAN;
      const hasWeighBridge = user?.weigh_bridge != null;
      if (measurementType === MEASUREMENT_TYPES.TIMBANGAN) {
        if (hasWeighBridge) {
          if (!grossWeight || parseFloat(grossWeight) <= 0) {
            newErrors.gross_weight =
              "Gross weight harus diisi dan lebih dari 0";
          } else if (parseFloat(grossWeight) > 999.99) {
            newErrors.gross_weight = "Gross weight maksimal 999.99 ton";
          }
        } else {
          if (!netWeight || parseFloat(netWeight) <= 0) {
            newErrors.net_weight = "Net weight harus diisi dan lebih dari 0";
          } else if (parseFloat(netWeight) > 999.99) {
            newErrors.net_weight = "Net weight maksimal 999.99 ton";
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [hullNo, selectedFleet, grossWeight, netWeight, user]);

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!validateForm()) {
      showToast.error("Mohon lengkapi form dengan benar");
      return;
    }

    setIsSubmitting(true);

    try {
      const measurementType =
        selectedFleet.measurement_type ||
        selectedFleet.measurementType ||
        MEASUREMENT_TYPES.TIMBANGAN;
      const hasWeighBridge = user?.weigh_bridge != null;

      if (!selectedFleet.id) {
        throw new Error("Fleet ID tidak ditemukan");
      }

      const dumptrucks = selectedFleet.dumptruck || selectedFleet.units || [];
      const selectedDT = dumptrucks.find(
        (dt) => (dt.hull_no || dt.hullNo) === hullNo,
      );

      if (!selectedDT) {
        throw new Error("Dump truck tidak ditemukan dalam fleet");
      }

      const submissionData = {
        setting_fleet: parseInt(selectedFleet.id),
        unit_dump_truck: parseInt(selectedDT.id || selectedDT.dumpTruckId),
        operator:
          selectedDT.operatorId || selectedDT.operator_id
            ? parseInt(selectedDT.operatorId || selectedDT.operator_id)
            : null,
        clientCreatedAt: new Date().toISOString(),
        created_by_user: user?.id || null,
        measurement_type: measurementType,
        has_weigh_bridge: hasWeighBridge,
      };

      if (measurementType === MEASUREMENT_TYPES.TIMBANGAN) {
        if (hasWeighBridge) {
          if (!grossWeight || parseFloat(grossWeight) <= 0) {
            throw new Error(
              "Gross weight harus diisi untuk user dengan jembatan timbang",
            );
          }
          submissionData.gross_weight = parseFloat(grossWeight);
        } else {
          if (!netWeight || parseFloat(netWeight) <= 0) {
            throw new Error(
              "Net weight harus diisi untuk user tanpa jembatan timbang",
            );
          }
          submissionData.net_weight = parseFloat(netWeight);
        }
      }

      const result = await ritaseServices.submitTimbanganForm(
        submissionData,
        "create",
      );

      if (result.queued) {
        showToast.success("Data disimpan offline dan akan tersinkron otomatis");

        hideDumptruck(hullNo, "submitted");

        resetForm();
        if (onSubmit) {
          onSubmit({
            success: true,
            queued: true,
            data: null,
            shouldClose: true,
          });
        }
        return;
      }

      if (result.success && result.data) {
        showToast.success("Data berhasil disimpan");

        hideDumptruck(hullNo, "submitted");

        resetForm();
        if (onSubmit) {
          onSubmit({ success: true, data: result.data, shouldClose: true });
        }
      } else {
        throw new Error(result.error || "Gagal menyimpan data");
      }
    } catch (error) {
      console.error("❌ Error saving ritase:", error);
      showToast.error(error?.message || "Gagal menyimpan data");
      if (onSubmit) {
        onSubmit({ success: false, error: error?.message, shouldClose: false });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setHullNo("");
    setGrossWeight("");
    setNetWeight("");
    setSelectedFleet(null);
    setTareWeight(null);
    setCalculatedNetWeight(null);
    setErrors({});
    setInsertedWeight(null);
    setInsertedTime(null);
    setDisplayWeight("");
    setManualEditMode(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const getMeasurementTypeBadge = (type) => {
    const colors = {
      [MEASUREMENT_TYPES.TIMBANGAN]: "bg-blue-600 dark:bg-blue-500",
      [MEASUREMENT_TYPES.BELTSCALE]: "bg-cyan-600 dark:bg-cyan-500",
      [MEASUREMENT_TYPES.BYPASS]: "bg-green-600 dark:bg-green-500",
      [MEASUREMENT_TYPES.MANUAL]: "bg-yellow-600 dark:bg-yellow-500",
      [MEASUREMENT_TYPES.CHECKPOINT]: "bg-purple-600 dark:bg-purple-500",
    };
    return colors[type] || "bg-gray-600 dark:bg-gray-500";
  };

  const measurementType =
    selectedFleet?.measurement_type ||
    selectedFleet?.measurementType ||
    MEASUREMENT_TYPES.TIMBANGAN;
  const isJembatan = user?.weigh_bridge != null;
  const showGrossWeight =
    isJembatan && measurementType === MEASUREMENT_TYPES.TIMBANGAN;
  const showNetWeight =
    !isJembatan && measurementType === MEASUREMENT_TYPES.TIMBANGAN;
  const showWeightFields = showGrossWeight || showNetWeight;
  const canEditWeight = manualEditMode || insertedWeight !== null;

  const activeHiddenCount = useMemo(() => {
    const now = Date.now();
    return Object.values(hiddenDumptrucks).filter((data) => {
      const hiddenTime = new Date(data.timestamp).getTime();
      return now - hiddenTime < HIDDEN_DURATION_MS;
    }).length;
  }, [hiddenDumptrucks]);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700">
            {/* Header - Sticky */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                  <Truck className="w-5 h-5" />
                  Input Data Ritase
                </div>
                <div className="flex items-center gap-2">
                  {showWeightFields && (
                    <ScaleConnectionStatus
                      isSupported={isSupported}
                      isAutoConnecting={isAutoConnecting}
                      connectionTimeout={connectionTimeout}
                      wsConnected={wsConnected}
                      isConnecting={isConnecting}
                      waitingForFirstData={waitingForFirstData}
                      insertedWeight={insertedWeight}
                      currentWeight={currentWeight}
                      isWeightStable={isWeightStable}
                      stableWeightCount={stableWeightCount}
                      scaleError={scaleError}
                      onConnect={connect}
                      onDisconnect={disconnect}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="h-8 w-8 dark:text-neutral-50 dark:hover:bg-slate-900"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Hidden DT Counter */}
              {/* {activeHiddenCount > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-md">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {activeHiddenCount} dump truck tersembunyi (akan muncul otomatis setelah 10 menit)
                  </span>
                </div>
              )} */}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mx-6">
              {/* No Fleet Warning */}
              {fleetConfigs.length === 0 && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    Tidak ada fleet yang terdaftar. Silakan hubungi
                    administrator.
                  </AlertDescription>
                </Alert>
              )}

              {/* Hull Number Input */}
              <div>
                <Label className="flex items-center gap-2 my-2 text-gray-700 dark:text-gray-300">
                  <Truck className="w-4 h-4" />
                  Nomor Lambung / Nomor DT *
                </Label>
                <SearchableSelect
                  items={hullNoOptions}
                  value={hullNo}
                  onChange={handleHullNoChange}
                  placeholder="Pilih atau ketik nomor lambung..."
                  error={!!errors.hull_no}
                  disabled={isSubmitting || fleetConfigs.length === 0}
                />
                {errors.hull_no && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                    {errors.hull_no}
                  </p>
                )}
              </div>

              {/* Fleet Info Display */}
              {selectedFleet && (
                <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-900 dark:text-green-200">
                          Fleet Ditemukan:
                        </span>
                        <Badge
                          className={`${getMeasurementTypeBadge(measurementType)} text-white`}
                        >
                          {measurementType}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Excavator:
                          </span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {selectedFleet.excavator}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Loading:
                          </span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {selectedFleet.loadingLocation}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Dumping:
                          </span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {selectedFleet.dumpingLocation}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">
                            Distance:
                          </span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                            {selectedFleet.distance} m
                          </span>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Error for fleet not found */}
              {errors.fleet && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {errors.fleet}
                  </AlertDescription>
                </Alert>
              )}

              {/* Weight Input - Conditional based on measurement type */}
              {showWeightFields && selectedFleet && (
                <>
                  {showGrossWeight && (
                    <div>
                      <Label className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                        <Weight className="w-4 h-4" />
                        Gross Weight (ton) *
                      </Label>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={displayWeight}
                            onChange={(e) =>
                              handleManualWeightChange(e.target.value)
                            }
                            placeholder="0.00"
                            disabled={isSubmitting}
                            readOnly={!canEditWeight}
                            className={`${errors.gross_weight ? "border-red-500 dark:border-red-400" : ""} ${
                              manualEditMode
                                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 font-bold"
                                : insertedWeight !== null
                                  ? "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600 font-bold"
                                  : wsConnected
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                                    : "bg-white dark:bg-gray-900"
                            } border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {manualEditMode ? (
                              <Edit2 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            ) : insertedWeight !== null ? (
                              <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : wsConnected ? (
                              <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                            ) : (
                              <WifiOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                        </div>

                        {!wsConnected && (
                          <Button
                            type="button"
                            onClick={handleToggleManualEdit}
                            className={`gap-1 shrink-0 ${
                              manualEditMode
                                ? "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                                : "bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                            } text-white`}
                            size="default"
                          >
                            {manualEditMode ? (
                              <>
                                <Wifi className="w-4 h-4" />
                                <span className="hidden sm:inline">Auto</span>
                              </>
                            ) : (
                              <>
                                <Edit2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Manual</span>
                              </>
                            )}
                          </Button>
                        )}

                        {wsConnected && !manualEditMode && (
                          <Button
                            type="button"
                            onClick={handleInsert}
                            disabled={
                              !wsConnected ||
                              !currentWeight ||
                              !isWeightStable ||
                              waitingForFirstData
                            }
                            className={`gap-1 shrink-0 ${
                              insertedWeight !== null
                                ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            } text-white`}
                            size="default"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">
                              {insertedWeight !== null ? "Re-Insert" : "Insert"}
                            </span>
                          </Button>
                        )}
                      </div>

                      {errors.gross_weight && (
                        <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                          {errors.gross_weight}
                        </p>
                      )}

                      <div className="space-y-1">
                        {manualEditMode && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                            <Edit2 className="w-3 h-3" />
                            <span>Mode manual</span>
                          </div>
                        )}

                        {!manualEditMode &&
                          insertedWeight !== null &&
                          insertedTime && (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <Download className="w-3 h-3" />
                              <span>
                                Locked: {insertedWeight.toFixed(2)} ton -{" "}
                                {format(insertedTime, "HH:mm:ss")}
                              </span>
                            </div>
                          )}

                        {!manualEditMode &&
                          insertedWeight === null &&
                          wsConnected &&
                          !waitingForFirstData &&
                          !isWeightStable && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <Radio className="w-3 h-3 animate-pulse" />
                              <span>
                                Menunggu stabil... ({stableWeightCount}/10)
                              </span>
                            </div>
                          )}

                        {!manualEditMode &&
                          insertedWeight === null &&
                          wsConnected &&
                          !waitingForFirstData &&
                          isWeightStable && (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Berat stabil - Siap insert</span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {showGrossWeight && calculatedNetWeight !== null && (
                    <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="flex items-center justify-between text-sm font-semibold text-green-900 dark:text-green-100">
                        <div className="text-center flex-1">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            Gross
                          </div>
                          <div>{parseFloat(grossWeight).toFixed(2)}</div>
                        </div>

                        <div className="px-2 text-gray-400">−</div>

                        <div className="text-center flex-1">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            Tare
                          </div>
                          <div>{tareWeight.toFixed(2)}</div>
                        </div>

                        <div className="px-2 text-gray-400">=</div>

                        <div className="text-center flex-1">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            Net
                          </div>
                          <div className="text-green-600 dark:text-green-400 text-base font-bold">
                            {calculatedNetWeight.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showNetWeight && (
                    <div>
                      <Label className="flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                        <Scale className="w-4 h-4" />
                        Net Weight (ton) *
                      </Label>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={displayWeight}
                            onChange={(e) =>
                              handleManualWeightChange(e.target.value)
                            }
                            placeholder="0.00"
                            disabled={isSubmitting}
                            readOnly={!canEditWeight}
                            className={`${errors.net_weight ? "border-red-500 dark:border-red-400" : ""} ${
                              manualEditMode
                                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 font-bold"
                                : insertedWeight !== null
                                  ? "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600 font-bold"
                                  : wsConnected
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                                    : "bg-white dark:bg-gray-900"
                            } border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
                          />

                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {manualEditMode ? (
                              <Edit2 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            ) : insertedWeight !== null ? (
                              <Download className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : wsConnected ? (
                              <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                            ) : (
                              <WifiOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                        </div>

                        {!wsConnected && (
                          <Button
                            type="button"
                            onClick={handleToggleManualEdit}
                            className={`gap-1 shrink-0 ${
                              manualEditMode
                                ? "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                                : "bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                            } text-white`}
                            size="default"
                          >
                            {manualEditMode ? (
                              <>
                                <Wifi className="w-4 h-4" />
                                <span className="hidden sm:inline">Auto</span>
                              </>
                            ) : (
                              <>
                                <Edit2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Manual</span>
                              </>
                            )}
                          </Button>
                        )}

                        {wsConnected && !manualEditMode && (
                          <Button
                            type="button"
                            onClick={handleInsert}
                            disabled={
                              !wsConnected ||
                              !currentWeight ||
                              !isWeightStable ||
                              waitingForFirstData
                            }
                            className={`gap-1 shrink-0 ${
                              insertedWeight !== null
                                ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            } text-white`}
                            size="default"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">
                              {insertedWeight !== null ? "Re-Insert" : "Insert"}
                            </span>
                          </Button>
                        )}
                      </div>

                      {errors.net_weight && (
                        <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                          {errors.net_weight}
                        </p>
                      )}

                      <div className="space-y-1">
                        {manualEditMode && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                            <Edit2 className="w-3 h-3" />
                            <span>Mode manual</span>
                          </div>
                        )}

                        {!manualEditMode &&
                          insertedWeight !== null &&
                          insertedTime && (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <Download className="w-3 h-3" />
                              <span>
                                Locked: {insertedWeight.toFixed(2)} ton -{" "}
                                {format(insertedTime, "HH:mm:ss")}
                              </span>
                            </div>
                          )}

                        {!manualEditMode &&
                          insertedWeight === null &&
                          wsConnected &&
                          !waitingForFirstData &&
                          !isWeightStable && (
                            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <Radio className="w-3 h-3 animate-pulse" />
                              <span>
                                Menunggu stabil... ({stableWeightCount}/10)
                              </span>
                            </div>
                          )}

                        {!manualEditMode &&
                          insertedWeight === null &&
                          wsConnected &&
                          !waitingForFirstData &&
                          isWeightStable && (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Berat stabil - Siap insert</span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {!showWeightFields && selectedFleet && (
                <Alert className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                  <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <AlertDescription className="text-sm text-purple-900 dark:text-purple-200">
                    Mode <strong>{measurementType}</strong> - Hanya memerlukan
                    nomor lambung. Klik simpan untuk melanjutkan.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-end gap-2 py-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Batal
                </Button>

                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !hullNo ||
                    !selectedFleet ||
                    fleetConfigs.length === 0 ||
                    (!manualEditMode &&
                      wsConnected &&
                      showWeightFields &&
                      insertedWeight === null)
                  }
                  className="min-w-32 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Simpan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default RitaseInputModal;
