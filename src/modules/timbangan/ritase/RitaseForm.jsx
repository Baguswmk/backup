import React, { useMemo, useState, useEffect, useRef } from "react";
import { useRitaseForm } from "@/modules/timbangan/ritase/hooks/useRitaseForm";
import { useRitaseStore } from "@/modules/timbangan/ritase/store/ritaseStore";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Badge } from "@/shared/components/ui/badge";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Truck,
  Clock,
  AlertCircle,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Weight,
  Search,
  MapPin,
  Calendar as CalendarIcon,
  X,
  Wifi,
  WifiOff,
  Radio,
  Edit2,
  Download,
  Keyboard,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { formatWeight } from "@/shared/utils/number";
import { Calendar } from "@/shared/components/ui/calendar";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import { showToast } from "@/shared/utils/toast";
const RitaseForm = ({
  onSubmit,
  editingItem,
  mode = "create",
  isSubmitting = false,
  shouldAutoConnect = false,
  onAutoConnectComplete,
}) => {
  const { user } = useAuthStore();
  const { masters } = useFleet(user ? { user } : null);

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
  } = useRitaseForm(editingItem, mode, masters);

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

  const dtIndex = useRitaseStore((state) => state.dtIndex);
  const hiddenDumptrucks = useRitaseStore((state) => state.hiddenDumptrucks);

  const [insertedWeight, setInsertedWeight] = useState(null);
  const [insertedTime, setInsertedTime] = useState(null);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [displayWeight, setDisplayWeight] = useState("");
  const [isWeightStale, setIsWeightStale] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [isWeightStable, setIsWeightStable] = useState(false);
  const [stableWeightCount, setStableWeightCount] = useState(0);
  const [waitingForFirstData, setWaitingForFirstData] = useState(true);

  const lastUpdateTimeRef = useRef(null);
  const staleCheckIntervalRef = useRef(null);
  const prevWeightRef = useRef(null);
  const updateFieldRef = useRef(updateField);

  const sessionIdRef = useRef(Date.now());
  const connectionTimeoutRef = useRef(null);
  const stableWeightTimerRef = useRef(null);
  const stableWeightValueRef = useRef(null);
  const stableWeightStartTimeRef = useRef(null);

  const isDeleteMode = mode === "delete";
  const isEditMode = mode === "edit";

  useEffect(() => {
    updateFieldRef.current = updateField;
  }, [updateField]);

  useEffect(() => {
    if (
      shouldAutoConnect &&
      !wsConnected &&
      !isAutoConnecting &&
      !autoConnectAttempted &&
      isSupported &&
      mode === "create" &&
      !isConnecting
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

          if (onAutoConnectComplete) {
            onAutoConnectComplete();
          }
        })
        .catch((error) => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
          }

          console.error("❌ Auto-connect error:", error);
          setIsAutoConnecting(false);

          if (onAutoConnectComplete) {
            onAutoConnectComplete();
          }
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
    mode,
    autoConnect,
    onAutoConnectComplete,
    isConnecting,
    isAutoConnecting,
    autoConnectAttempted,
  ]);

  useEffect(() => {
    if (isEditMode && editingItem) {
      if (editingItem.gross_weight) {
        setDisplayWeight(editingItem.gross_weight.toString());
      }
      setManualEditMode(true);
    }
  }, [isEditMode, editingItem]);

  useEffect(() => {
    if (mode === "create") {
      sessionIdRef.current = Date.now();
      prevWeightRef.current = null;
      lastUpdateTimeRef.current = null;
      setDisplayWeight("");
      setIsWeightStale(false);
      setInsertedWeight(null);
      setInsertedTime(null);
      setManualEditMode(false);
      setIsWeightStable(false);
      setStableWeightCount(0);
      setWaitingForFirstData(true);
      stableWeightValueRef.current = null;
      stableWeightStartTimeRef.current = null;
      updateFieldRef.current("gross_weight", "");
    }

    return () => {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
      if (stableWeightTimerRef.current) {
        clearTimeout(stableWeightTimerRef.current);
      }
    };
  }, [mode]);

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

      if (timeSinceUpdate > STALE_THRESHOLD) {
        if (!isWeightStale) {
          setIsWeightStale(true);
        }
      } else {
        if (isWeightStale) {
          setIsWeightStale(false);
        }
      }
    }, 1000);

    return () => {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
    };
  }, [wsConnected, isEditMode, isWeightStale]);

  const handleAutoInsert = (weight) => {
    const formattedWeight = weight.toFixed(2);
    const now = new Date();
    setInsertedWeight(weight);
    setInsertedTime(now);
    setDisplayWeight(formattedWeight);
    setIsWeightStable(true);
    updateFieldRef.current("gross_weight", formattedWeight);

    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }
  };
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

    if (waitingForFirstData) {
      setWaitingForFirstData(false);
      lastUpdateTimeRef.current = Date.now();
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

  const loadingLocationOptions = useMemo(() => {
    return (masters.loadingLocations || []).map((loc) => ({
      value: loc.name,
      label: loc.name,
      hint: loc.type,
    }));
  }, [masters.loadingLocations]);

  const dumpingLocationOptions = useMemo(() => {
    return (masters.dumpingLocations || []).map((loc) => ({
      value: loc.name,
      label: loc.name,
      hint: loc.type,
    }));
  }, [masters.dumpingLocations]);

  const dumptruckOptions = useMemo(() => {
    return (masters.dumpTruck || []).map((dt) => ({
      value: dt.hull_no || dt.hullNo,
      label: dt.hull_no || dt.hullNo,
      hint: `${dt.company || dt.contractor || "-"}`,
    }));
  }, [masters.dumpTruck]);

  const excavatorOptions = useMemo(() => {
    return (masters.excavators || []).map((ex) => ({
      value: ex.hull_no || ex.name,
      label: ex.hull_no || ex.name,
      hint: ex.company || "-",
    }));
  }, [masters.excavators]);

  const shiftOptions = useMemo(() => {
    return (masters.shifts || []).map((s) => ({
      value: s.name,
      label: s.name,
      hint: s.hours,
    }));
  }, [masters.shifts]);

  const coalTypeOptions = useMemo(() => {
    return (masters.coalTypes || []).map((ct) => ({
      value: ct.name,
      label: ct.name,
      hint: "",
    }));
  }, [masters.coalTypes]);

  const workUnitOptions = useMemo(() => {
    return (masters.workUnits || []).map((wu) => ({
      value: wu.subsatker,
      label: wu.subsatker,
      hint: wu.satker,
    }));
  }, [masters.workUnits]);

  const hullNoOptions = useMemo(() => {
    const options = Object.entries(dtIndex)
      .map(([key, data]) => {
        const isHidden = !!hiddenDumptrucks[key];
        const isCurrentItem =
          isEditMode &&
          editingItem &&
          (data.hull_no === editingItem.hull_no ||
            data.unit_id === editingItem.dumptruckId);

        return {
          value: data.hull_no,
          label: data.hull_no,
          hint: `${data.excavator} | ${data.operator_name || "No Operator"}`,
          isHidden,
          isCurrent: isCurrentItem,
          __data: data,
        };
      })
      .filter((option) => !option.isHidden || option.isCurrent);
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [dtIndex, hiddenDumptrucks, isEditMode, editingItem]);

  useEffect(() => {
    if (isEditMode || manualEditMode || insertedWeight !== null) return;

    const timeoutId = setTimeout(() => {
      if (wsConnected && currentWeight !== null) {
        const newWeight = parseFloat(currentWeight);
        if (!isNaN(newWeight) && newWeight >= 0) {
          setDisplayWeight(newWeight.toFixed(2));
          updateFieldRef.current("gross_weight", newWeight.toFixed(2));
        }
      }
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [currentWeight, wsConnected, manualEditMode, insertedWeight, isEditMode]);

  const handleInsert = () => {
    if (isEditMode || !wsConnected || !currentWeight) {
      return;
    }

    const weight = parseFloat(currentWeight);
    const formattedWeight = weight.toFixed(2);
    const now = new Date();

    setInsertedWeight(weight);
    setInsertedTime(now);
    setDisplayWeight(formattedWeight);
    setIsWeightStable(true);
    updateFieldRef.current("gross_weight", formattedWeight);

    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }
  };

  const handleToggleManualEdit = () => {
    if (isEditMode) return;

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
      updateFieldRef.current("gross_weight", formattedWeight);
    }
  };

  const handleManualWeightChange = (value) => {
    const canEdit = manualEditMode || isEditMode || insertedWeight !== null;

    if (canEdit) {
      if (value === "" || parseFloat(value) <= 999.99) {
        setDisplayWeight(value);
        updateFieldRef.current("gross_weight", value);

        if (insertedWeight !== null) {
          setInsertedWeight(null);
          setInsertedTime(null);
          setIsWeightStable(false);
        }
      }
    }
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (
      !isEditMode &&
      !manualEditMode &&
      wsConnected &&
      insertedWeight === null &&
      currentWeight !== null
    ) {
      showToast.warning(
        "Klik tombol 'Insert' untuk mengunci berat terlebih dahulu",
      );
      return;
    }

    try {
      const result = await handleSubmit();

      const isQueued = result?.queued === true;
      const shouldClose = result?.shouldClose === true;

      if (isQueued || (result?.success && !result?.data)) {
        showToast.info(
          "📤 Data disimpan di queue dan akan otomatis tersinkron saat online",
          { duration: 4000 },
        );

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

      if (result?.success && result?.data) {
        if (onSubmit) {
          onSubmit(result);
        }

        if (!isEditMode) {
          setInsertedWeight(null);
          setInsertedTime(null);
          setDisplayWeight("");
          setManualEditMode(false);
          setIsWeightStable(false);
          setStableWeightCount(0);
          setWaitingForFirstData(true);
          prevWeightRef.current = null;
          stableWeightValueRef.current = null;
          stableWeightStartTimeRef.current = null;
          if (stableWeightTimerRef.current) {
            clearTimeout(stableWeightTimerRef.current);
            stableWeightTimerRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error("❌ [RitaseForm] Error:", err);

      const isQueuedError =
        err?.queued || err?.message?.includes("queued for offline sync");

      if (isQueuedError) {
        showToast.info(
          "📤 Data disimpan di queue dan akan otomatis tersinkron saat online",
          { duration: 4000 },
        );

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

      const isValidation =
        err?.validationError ||
        (err?.response?.status >= 400 && err?.response?.status < 500);

      if (isValidation) {
        showToast.error(err?.message || "Validasi gagal. Periksa input Anda.");
      } else {
        const errorMsg = err?.message || "Gagal menyimpan data";
        showToast.error(errorMsg);
      }
    }
  };

  useEffect(() => {
    if (mode !== "create") return;

    const handleShortcut = (e) => {
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();

        const wrapper = document.getElementById("hull-no-select-wrapper");

        if (wrapper) {
          const selectButton = wrapper.querySelector('button[role="combobox"]');

          if (selectButton && !selectButton.disabled) {
            const isOpen =
              selectButton.getAttribute("aria-expanded") === "true";

            if (isOpen) {
              const commandInput = document.querySelector("input[cmdk-input]");
              if (commandInput) {
                commandInput.focus();
                commandInput.value = "";
                commandInput.dispatchEvent(
                  new Event("input", { bubbles: true }),
                );
              }
            } else {
              selectButton.click();

              setTimeout(() => {
                const commandInput =
                  document.querySelector("input[cmdk-input]");

                if (commandInput) {
                  commandInput.focus();
                  commandInput.value = "";
                  commandInput.dispatchEvent(
                    new Event("input", { bubbles: true }),
                  );
                }
              }, 100);
            }
          }
        }
      }

      if (e.altKey && e.key.toLowerCase() === "w") {
        e.preventDefault();
        const weightInput = document.getElementById("gross_weight");
        if (weightInput && !weightInput.readOnly) {
          weightInput.focus();
        }
      }

      if (e.altKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        if (wsConnected && currentWeight && !manualEditMode && isWeightStable) {
          handleInsert();
        }
      }

      if (e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (!isEditMode) {
          handleToggleManualEdit();
        }
      }

      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isValid && !isSubmitting && formSummary.isAutoFilled) {
          handleFormSubmit(e);
        }
      }

      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetForm();
        setInsertedWeight(null);
        setInsertedTime(null);
        setDisplayWeight("");
        setManualEditMode(false);
        setIsWeightStable(false);
        setStableWeightCount(0);
        setWaitingForFirstData(true);
        prevWeightRef.current = null;
        stableWeightValueRef.current = null;
        stableWeightStartTimeRef.current = null;
        if (stableWeightTimerRef.current) {
          clearTimeout(stableWeightTimerRef.current);
          stableWeightTimerRef.current = null;
        }
      }

      if (e.altKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowShortcutHelp(!showShortcutHelp);
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (showShortcutHelp) {
          setShowShortcutHelp(false);
        } else if (onSubmit) {
          onSubmit({ cancelled: true });
        }
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    mode,
    handleInsert,
    handleFormSubmit,
    resetForm,
    onSubmit,
    manualEditMode,
    wsConnected,
    currentWeight,
    isValid,
    isSubmitting,
    formSummary.isAutoFilled,
    showShortcutHelp,
    isEditMode,
    isWeightStable,
  ]);

  const renderConnectionStatus = () => {
    if (!isSupported) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            WebSerial tidak didukung di browser ini. Gunakan Chrome atau Edge
            versi 89+
          </AlertDescription>
        </Alert>
      );
    }

    if (isAutoConnecting) {
      return (
        <Card className="border-blue-200 bg-linear-to-r from-blue-50 to-blue-100 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-neutral-50 p-2 rounded-lg shadow-sm">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-blue-900">
                    🔄 Menghubungkan ke Timbangan...
                  </div>
                  <div className="text-xs text-blue-700 mt-0.5">
                    Mohon tunggu, sedang mencari perangkat timbangan
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (connectionTimeout && !wsConnected) {
      return (
        <Card className="border-orange-200 bg-linear-to-r from-orange-50 to-orange-100 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-neutral-50 p-2 rounded-lg shadow-sm">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-orange-900">
                    ⚠️ Koneksi Timeout
                  </div>
                  <div className="text-xs text-orange-700 mt-0.5">
                    Tidak dapat terhubung ke timbangan. Klik Connect untuk
                    mencoba lagi atau gunakan mode manual.
                  </div>
                </div>
              </div>
              <Button
                onClick={connect}
                size="default"
                className="bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg transition-all gap-2 px-6"
              >
                <Wifi className="w-4 h-4" />
                <span className="font-semibold cursor-pointer">Coba Lagi</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (wsConnected) {
      if (waitingForFirstData && !insertedWeight) {
        return (
          <Card className="border-blue-200 bg-linear-to-r from-blue-50 to-blue-100 shadow-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="bg-neutral-50 p-2 rounded-lg shadow-sm">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-blue-900">
                      ⏳ Menunggu Data dari Timbangan...
                    </div>
                    <div className="text-xs text-blue-700 mt-0.5">
                      Terhubung! Menunggu pembacaan berat pertama dari perangkat
                    </div>
                  </div>
                </div>
                <Button
                  onClick={disconnect}
                  size="sm"
                  variant="outline"
                  className="border-blue-300 hover:bg-blue-100 cursor-pointer"
                >
                  <WifiOff className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }

      return (
        <Card className="border-green-200 dark:border-green-800 bg-linear-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 shadow-sm">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="bg-neutral-50 dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                  <Wifi className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-green-900 dark:text-green-300">
                    ✅ Timbangan Terhubung
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-400 mt-0.5 font-mono flex items-center gap-2">
                    {currentWeight ? (
                      <>
                        <span>
                          Live Weight: {formatWeight(currentWeight)} ton
                        </span>
                        {!insertedWeight && isWeightStable && (
                          <Badge className="bg-green-600 text-xs animate-pulse">
                            Stable ({stableWeightCount}/10)
                          </Badge>
                        )}
                      </>
                    ) : (
                      "Menunggu data..."
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={disconnect}
                size="sm"
                variant="outline"
                className="border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer dark:text-green-300"
              >
                <WifiOff className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-blue-200 bg-linear-to-r from-blue-50 to-blue-100 shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-neutral-50 p-2 rounded-lg shadow-sm">
                <WifiOff className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-900">
                  Timbangan Belum Terhubung
                </div>
                <div className="text-xs text-blue-700 mt-0.5">
                  {isConnecting
                    ? "⏳ Menghubungkan ke timbangan..."
                    : "Klik Connect untuk menghubungkan dengan perangkat timbangan"}
                </div>
              </div>
            </div>
            <Button
              onClick={connect}
              size="default"
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-gray-200 shadow-md hover:shadow-lg transition-all gap-2 px-6 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-semibold">Connecting...</span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="font-semibold cursor-pointer">Connect</span>
                </>
              )}
            </Button>
          </div>
          {scaleError && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-800">
                    Error Koneksi:
                  </p>
                  <p className="text-xs text-red-700 mt-1">{scaleError}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  if (isDeleteMode) {
    return (
      <ConfirmDialog
        isOpen={true}
        onClose={() => onSubmit?.({ cancelled: true })}
        onConfirm={handleFormSubmit}
        title="Konfirmasi Hapus"
        confirmLabel="Hapus Data"
        cancelLabel="Batal"
        variant="destructive"
        isProcessing={isSubmitting}
        icon={AlertCircle}
      >
        {editingItem && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Waktu:</span>
              <span className="font-medium dark:text-gray-200">
                {format(
                  new Date(editingItem.createdAt),
                  "dd MMM yyyy HH:mm:ss",
                  { locale: localeId },
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                No Lambung:
              </span>
              <span className="font-medium dark:text-gray-200">
                {editingItem.hull_no}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Net Weight:
              </span>
              <span className="font-medium dark:text-gray-200">
                {editingItem.gross_weight || "-"} ton
              </span>
            </div>
          </div>
        )}
      </ConfirmDialog>
    );
  }

  const canEditWeight = manualEditMode || isEditMode || insertedWeight !== null;

  if (isEditMode) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-blue-200 bg-blue-50 mt-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-blue-800">
              <CalendarIcon className="w-4 h-4" />
              Data Original
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-neutral-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Dibuat:</span>
                  <span className="font-medium ml-2">
                    {editingItem?.createdAt
                      ? format(
                          new Date(editingItem.createdAt),
                          "dd MMM yyyy | HH:mm:ss",
                          { locale: localeId },
                        )
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Original Date:</span>
                  <span className="font-medium ml-2">
                    {editingItem?.date || "-"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Weight className="w-4 h-4" />
                Weight Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="gross_weight_edit" className="pb-2">
                    Weight (ton) *
                  </Label>
                  <Input
                    id="gross_weight_edit"
                    type="text"
                    inputMode="decimal"
                    value={formData.gross_weight}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === "") {
                        updateField("gross_weight", value);
                        return;
                      }

                      const regex = /^\d*\.?\d{0,2}$/;
                      if (!regex.test(value)) {
                        return;
                      }

                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue > 999.99) {
                        return;
                      }

                      updateField("gross_weight", value);
                    }}
                    className={errors.gross_weight ? "border-red-500" : ""}
                    placeholder="0.00"
                  />
                  {errors.gross_weight && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.gross_weight}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimal 999.99 ton
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="w-4 h-4" />
                Unit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="pb-2">Unit Dump Truck *</Label>
                  <SearchableSelect
                    items={dumptruckOptions}
                    value={formData.unit_dump_truck}
                    onChange={(value) => updateField("unit_dump_truck", value)}
                    placeholder="Pilih dump truck..."
                    error={!!errors.unit_dump_truck}
                  />
                  {errors.unit_dump_truck && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.unit_dump_truck}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="pb-2">Unit Excavator *</Label>
                  <SearchableSelect
                    items={excavatorOptions}
                    value={formData.unit_exca}
                    onChange={(value) => updateField("unit_exca", value)}
                    placeholder="Pilih excavator..."
                    error={!!errors.unit_exca}
                  />
                  {errors.unit_exca && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.unit_exca}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4" />
                Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="pb-2">Loading Location *</Label>
                  <SearchableSelect
                    items={loadingLocationOptions}
                    value={formData.loading_location}
                    onChange={(value) => updateField("loading_location", value)}
                    placeholder="Pilih loading location..."
                    error={!!errors.loading_location}
                  />
                  {errors.loading_location && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.loading_location}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="pb-2">Dumping Location *</Label>
                  <SearchableSelect
                    items={dumpingLocationOptions}
                    value={formData.dumping_location}
                    onChange={(value) => updateField("dumping_location", value)}
                    placeholder="Pilih dumping location..."
                    error={!!errors.dumping_location}
                  />
                  {errors.dumping_location && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.dumping_location}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="pb-2">PIC Work Unit *</Label>
                  <SearchableSelect
                    items={workUnitOptions}
                    value={formData.pic_work_unit}
                    onChange={(value) => updateField("pic_work_unit", value)}
                    placeholder="Pilih work unit..."
                    error={!!errors.pic_work_unit}
                  />
                  {errors.pic_work_unit && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.pic_work_unit}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="w-4 h-4" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="pb-2" htmlFor="date">
                    Date *
                  </Label>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        disabled={isSubmitting}
                        className="w-full cursor-pointer hover:bg-gray-200 justify-start text-left font-normal dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date
                          ? format(new Date(formData.date), "dd MMMM yyyy", {
                              locale: localeId,
                            })
                          : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      className="w-auto p-0 bg-neutral-50 border-none dark:bg-gray-800 dark:border-gray-700"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={
                          formData.date ? new Date(formData.date) : undefined
                        }
                        onSelect={(date) => {
                          if (!date) return;
                          updateField("date", format(date, "yyyy-MM-dd"));
                        }}
                        locale={localeId}
                        disabled={isSubmitting}
                        initialFocus
                        className="dark:text-gray-200"
                      />
                    </PopoverContent>
                  </Popover>

                  {errors.date && (
                    <p className="text-sm text-red-500 mt-1">{errors.date}</p>
                  )}
                </div>

                <div>
                  <Label className="pb-2">Shift *</Label>
                  <SearchableSelect
                    items={shiftOptions}
                    value={formData.shift}
                    onChange={(value) => updateField("shift", value)}
                    placeholder="Pilih shift..."
                    error={!!errors.shift}
                  />
                  {errors.shift && (
                    <p className="text-sm text-red-500 mt-1">{errors.shift}</p>
                  )}
                </div>

                <div>
                  <Label className="pb-2" htmlFor="distance">
                    Distance (m) *
                  </Label>
                  <Input
                    id="distance"
                    type="number"
                    value={formData.distance}
                    onChange={(e) => updateField("distance", e.target.value)}
                    className={errors.distance ? "border-red-500" : ""}
                  />
                  {errors.distance && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.distance}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="pb-2">Coal Type *</Label>
                  <SearchableSelect
                    items={coalTypeOptions}
                    value={formData.coal_type}
                    onChange={(value) => updateField("coal_type", value)}
                    placeholder="Pilih coal type..."
                    error={!!errors.coal_type}
                  />
                  {errors.coal_type && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.coal_type}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <p className="font-medium mb-1">
                  Mohon perbaiki {Object.keys(errors).length} kesalahan berikut:
                </p>
                <ul className="text-sm space-y-1 mt-2">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>• {error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSubmit?.({ cancelled: true })}
                  disabled={isSubmitting}
                  className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Batal
                </Button>

                <div className="flex items-center gap-2">
                  {/* {isValid && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Form siap untuk diupdate</span>
                    </div>
                  )} */}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-w-30 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutHelp && (
        <Card className="border-purple-200 bg-purple-50 mt-2 py-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-purple-800">
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcutHelp(false)}
                className="cursor-pointer hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Fokus ke Nomor DT</span>
                  <Badge variant="outline" className="font-mono">
                    Alt + D
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Insert Weight</span>
                  <Badge variant="outline" className="font-mono">
                    Alt + I
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Simpan Form</span>
                  <Badge variant="outline" className="font-mono">
                    Alt + S
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Reset Form</span>
                  <Badge variant="outline" className="font-mono">
                    Alt + R
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Bantuan Shortcuts</span>
                  <Badge variant="outline" className="font-mono ">
                    Alt + H
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-700">Batal/Tutup</span>
                  <Badge variant="outline" className="font-mono">
                    Esc
                  </Badge>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-purple-200">
                <p className="text-sm font-semibold text-purple-800 mb-2">
                  📋 Navigasi Dropdown:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-gray-700">Navigasi Atas/Bawah</span>
                    <Badge variant="outline" className="font-mono">
                      ↑ ↓
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-gray-700">Pilih Item</span>
                    <Badge variant="outline" className="font-mono">
                      Enter
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                    <span className="text-gray-700">Ketik untuk Cari</span>
                    <Badge variant="outline" className="font-mono">
                      A-Z
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-purple-200">
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  <strong>Tips:</strong> Setelah <strong>Alt + D</strong>,
                  gunakan <strong>↑↓</strong> untuk navigasi dan{" "}
                  <strong>Enter</strong> untuk memilih
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      {renderConnectionStatus()}

      {/* Timestamp Info & Realtime Status */}
      <div className="grid grid-cols-1 gap-2 mt-2">
        <Card className="border-none shadow-none m-0 p-0">
          <CardContent className="">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">
                  Waktu Input
                </span>
              </div>
              <div className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
                {formData.createdAt
                  ? format(new Date(formData.createdAt), "dd/MM/yy HH:mm", {
                      locale: localeId,
                    })
                  : "-"}
              </div>
              <div className="flex items-center gap-2">
                {wsConnected ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-orange-600" />
                )}
                <div>
                  <span className="text-xs font-medium dark:text-gray-200">
                    {wsConnected ? "Timbangan" : "Offline"}
                  </span>
                  {wsConnected && currentWeight && !manualEditMode && (
                    <span
                      className={`ml-2 font-mono text-sm font-bold dark:text-gray-200 ${
                        insertedWeight !== null
                          ? "text-green-700"
                          : "text-blue-700"
                      }`}
                    >
                      {formatWeight(currentWeight)} ton
                    </span>
                  )}
                </div>
              </div>

              {manualEditMode ? (
                <Badge className="bg-yellow-600 text-xs">Manual</Badge>
              ) : insertedWeight !== null ? (
                <Badge className="bg-green-600 text-xs">Inserted</Badge>
              ) : wsConnected ? (
                <Badge className="bg-blue-600 animate-pulse text-xs">
                  Live
                </Badge>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcutHelp(!showShortcutHelp)}
                className="gap-1 dark:text-gray-200 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Keyboard Shortcuts (Alt + H)"
              >
                <Keyboard className="w-4 h-4" />
                <span className="text-xs hidden sm:inline ">Alt+H</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Input - Hull No & Net Weight */}
      <Card className="shadow-none border-none dark:bg-gray-800 dark:text-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-4 h-4" />
            Input Data Ritase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hull Number Selection */}
          <div>
            <Label
              htmlFor="hull_no_select"
              className="flex items-center gap-2 mb-2"
            >
              <Search className="w-4 h-4" />
              Nomor Lambung / Nomor DT *
              <Badge variant="outline" className="text-xs font-mono">
                Alt+D
              </Badge>
            </Label>

            <div id="hull-no-select-wrapper">
              <SearchableSelect
                id="hull_no_select"
                items={hullNoOptions}
                value={formData.hull_no}
                onChange={(value) => updateField("hull_no", value)}
                placeholder="Input nomor lambung..."
                emptyText="Nomor lambung tidak ditemukan"
                disabled={isLoading || hullNoOptions.length === 0}
                error={!!errors.hull_no}
                allowClear={true}
              />
            </div>

            {errors.hull_no && (
              <p className="text-sm text-red-500 mt-1">{errors.hull_no}</p>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Pilih dari daftar atau ketik untuk mencari. Gunakan{" "}
              <strong>↑↓</strong> untuk navigasi, <strong>Enter</strong> untuk
              memilih.
            </p>
          </div>

          {/* Net Weight Input */}
          <div>
            <Label
              htmlFor="gross_weight"
              className="flex items-center gap-2 mb-2"
            >
              <Weight className="w-4 h-4" />
              Gross Weight (ton) *
              <span className="text-xs text-gray-500 font-normal">
                (Berat Kotor)
              </span>
            </Label>

            <div className="flex items-center gap-2">
              {/* Weight Input */}
              <div className="relative flex-1">
                <Input
                  id="gross_weight"
                  type="text"
                  inputMode="decimal"
                  value={displayWeight}
                  onChange={(e) => handleManualWeightChange(e.target.value)}
                  onBlur={() => validateField("gross_weight")}
                  className={`${errors.gross_weight ? "border-red-500" : ""} ${
                    manualEditMode
                      ? "bg-yellow-50 border-yellow-400 font-bold dark:text-gray-800"
                      : insertedWeight !== null
                        ? "bg-green-50 border-green-400 font-bold"
                        : wsConnected
                          ? "bg-blue-50 border-blue-300"
                          : ""
                  }`}
                  placeholder="0.00"
                  required
                  disabled={isLoading}
                  readOnly={!canEditWeight}
                />

                {/* Status Icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {manualEditMode ? (
                    <Edit2 className="w-4 h-4 text-yellow-600" />
                  ) : insertedWeight !== null ? (
                    <Download className="w-4 h-4 text-green-600" />
                  ) : wsConnected ? (
                    <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              {!wsConnected && (
                <Button
                  type="button"
                  onClick={handleToggleManualEdit}
                  className={`gap-1 shrink-0 cursor-pointer ${
                    manualEditMode
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                  size="default"
                  title="Toggle Manual Mode (Alt + M)"
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
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  size="default"
                  title="Insert Weight (Alt + I) - Tunggu berat stabil"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {insertedWeight !== null ? "Re-Insert" : "Insert"}
                  </span>
                </Button>
              )}
            </div>

            {errors.gross_weight && (
              <p className="text-sm text-red-500 mt-1">{errors.gross_weight}</p>
            )}

            {/* Status Info */}
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500">
                Maksimal 999.99 ton (3 digit)
              </p>

              {manualEditMode && (
                <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  <Edit2 className="w-3 h-3" />
                  <span>
                    Mode manual aktif - ketik berat secara manual. Tekan{" "}
                    <strong>Alt+M</strong> untuk kembali ke mode realtime.
                  </span>
                </div>
              )}
              {!manualEditMode && insertedWeight !== null && insertedTime && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <Download className="w-3 h-3" />
                  <span>
                    🔒 Locked: <strong>{insertedWeight.toFixed(2)} ton</strong>{" "}
                    pada {format(insertedTime, "HH:mm:ss")} - Tekan{" "}
                    <strong>Alt+I</strong> untuk update
                  </span>
                </div>
              )}
              {!manualEditMode &&
                insertedWeight === null &&
                wsConnected &&
                !waitingForFirstData &&
                !isWeightStable && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded animate-pulse">
                    <Radio className="w-3 h-3" />
                    <span>
                      ⏳ Menunggu berat stabil... ({stableWeightCount}/10
                      pembacaan)
                    </span>
                  </div>
                )}
              {!manualEditMode &&
                insertedWeight === null &&
                wsConnected &&
                !waitingForFirstData &&
                isWeightStable && (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      ✅ Berat stabil - Tekan <strong>Alt+I</strong> untuk
                      insert atau tunggu auto-lock
                    </span>
                  </div>
                )}
              {!manualEditMode &&
                insertedWeight === null &&
                wsConnected &&
                isWeightStale && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    <AlertCircle className="w-3 h-3" />
                    <span>
                      ⚠️ Data stale - tidak ada update terbaru. Tekan{" "}
                      <strong>Alt+M</strong> untuk mode manual.
                    </span>
                  </div>
                )}
              {!manualEditMode && insertedWeight === null && !wsConnected && (
                <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  <WifiOff className="w-3 h-3" />
                  <span>
                    Tidak terhubung - tekan <strong>Alt+M</strong> untuk input
                    manual
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Summary */}
      {formSummary.fleetInfo && formSummary.isAutoFilled && (
        <Card className="border-green-200 bg-green-50 m-0 p-0">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Fleet:</span>
              <Badge className="bg-green-600 text-xs">
                {formSummary.hull_no}
              </Badge>
            </div>

            <div className="bg-neutral-50 rounded-lg p-3 border border-green-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="text-gray-500">Excavator</div>
                  <div className="font-semibold text-gray-900">
                    {formSummary.fleetInfo.excavator}
                  </div>
                  {formSummary.fleetInfo.operator && (
                    <>
                      <div className="text-gray-500 mt-2">Operator</div>
                      <div className="font-medium text-blue-600">
                        {formSummary.fleetInfo.operator}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-gray-500">Loading</div>
                  <div className="font-semibold text-blue-600">
                    {formSummary.fleetInfo.loadingLocation}
                  </div>
                  <div className="text-gray-500 mt-2">Dumping</div>
                  <div className="font-semibold text-red-600">
                    {formSummary.fleetInfo.dumpingLocation}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-gray-500">Inspector</div>
                  <div className="font-medium">
                    {formSummary.fleetInfo.inspector}
                  </div>
                  <div className="text-gray-500 mt-2">Checker</div>
                  <div className="font-medium">
                    {formSummary.fleetInfo.checker}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!formSummary.isAutoFilled && formData.hull_no && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-1">
              ⚠️ Nomor lambung tidak ditemukan di fleet yang dipilih
            </p>
            <p className="text-sm">
              Pastikan Anda sudah memilih fleet yang benar di Fleet Management
              dan nomor lambung <strong>{formData.hull_no}</strong> terdaftar
              dalam fleet tersebut.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-1">
              Mohon perbaiki kesalahan berikut:
            </p>
            <ul className="text-sm space-y-1 mt-2">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>• {error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <Alert>
          <Loader2 className="w-4 h-4 animate-spin" />
          <AlertDescription>Memuat data fleet...</AlertDescription>
        </Alert>
      )}

      {/* Form Actions */}
      <div>
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm();
                setInsertedWeight(null);
                setInsertedTime(null);
                setDisplayWeight("");
                setManualEditMode(false);
                setIsWeightStable(false);
                setStableWeightCount(0);
                setWaitingForFirstData(true);
                prevWeightRef.current = null;
                stableWeightValueRef.current = null;
                stableWeightStartTimeRef.current = null;
                if (stableWeightTimerRef.current) {
                  clearTimeout(stableWeightTimerRef.current);
                  stableWeightTimerRef.current = null;
                }
              }}
              disabled={isSubmitting || isLoading}
              className="flex items-center gap-2 cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Reset Form (Alt + R)"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
              <Badge variant="outline" className="text-xs font-mono ml-1">
                Alt+R
              </Badge>
            </Button>

            <div className="flex items-center gap-2">
              {onSubmit && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSubmit({ cancelled: true })}
                  disabled={isSubmitting}
                  title="Batal (Esc)"
                  className="cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Batal
                  <Badge variant="outline" className="text-xs font-mono ml-1">
                    Esc
                  </Badge>
                </Button>
              )}

              <Button
                type="button"
                onClick={handleFormSubmit}
                disabled={
                  !isValid ||
                  isSubmitting ||
                  isLoading ||
                  !formSummary.isAutoFilled ||
                  (!manualEditMode && wsConnected && insertedWeight === null)
                }
                className="flex items-center gap-2 min-w-30 cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Simpan Data (Alt + S)"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan
                    <Badge
                      variant="secondary"
                      className="text-xs font-mono ml-1"
                    >
                      Alt+S
                    </Badge>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-2">
            {!formSummary.isAutoFilled && formData.hull_no && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span>
                  Nomor lambung belum ditemukan - cek fleet yang dipilih
                </span>
              </div>
            )}

            {!isValid && Object.keys(errors).length > 0 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span>{Object.keys(errors).length} field perlu diperbaiki</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RitaseForm;
