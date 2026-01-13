import React, { useMemo, useState, useEffect, useRef } from "react";
import { useCheckPointForm } from "@/modules/timbangan/timbangan/hooks/useCheckPoint";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Truck,
  Clock,
  AlertCircle,
  Save,
  RotateCcw,
  Loader2,
  Weight,
  Wifi,
  WifiOff,
  Radio,
  Edit2,
  Download,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatWeight } from "@/shared/utils/number";
import { timbanganServices } from "@/modules/timbangan/timbangan/services/timbanganServices";

const CheckPointForm = ({
  onSubmit,
  editingItem,
  mode = "create",
  isSubmitting = false,
  shouldAutoConnect = false,
  onAutoConnectComplete,
}) => {
  const [units, setUnits] = useState([]);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  const {
    formData,
    errors,
    isValid,
    updateField,
    resetForm,
    validateField,
    handleSubmit,
    formSummary,
  } = useCheckPointForm(editingItem, mode, { units });

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

  const [insertedWeight, setInsertedWeight] = useState(null);
  const [insertedTime, setInsertedTime] = useState(null);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [displayWeight, setDisplayWeight] = useState("");
  const [isWeightStale, setIsWeightStale] = useState(false);
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

  // Load units on mount
  useEffect(() => {
    const loadUnits = async () => {
      try {
        setIsLoadingUnits(true);
        const result = await timbanganServices.fetchUnits();
        if (result.success) {
          setUnits(result.data);
        }
      } catch (error) {
        console.error("Failed to load units:", error);
      } finally {
        setIsLoadingUnits(false);
      }
    };

    loadUnits();
  }, []);

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
      if (editingItem.net_weight) {
        setDisplayWeight(editingItem.net_weight.toString());
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
      updateFieldRef.current("net_weight", "");
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

  const handleAutoInsert = (weight) => {
    const formattedWeight = weight.toFixed(2);
    const now = new Date();
    setInsertedWeight(weight);
    setInsertedTime(now);
    setDisplayWeight(formattedWeight);
    setIsWeightStable(true);
    updateFieldRef.current("net_weight", formattedWeight);

    if (stableWeightTimerRef.current) {
      clearTimeout(stableWeightTimerRef.current);
      stableWeightTimerRef.current = null;
    }
  };

  const unitOptions = useMemo(() => {
    return units.map((unit) => ({
      value: unit.id,
      label: unit.hull_no,
      hint: `${unit.company} | Tare: ${unit.tare_weight.toFixed(2)}t`,
    }));
  }, [units]);

  useEffect(() => {
    if (isEditMode || manualEditMode || insertedWeight !== null) return;

    const timeoutId = setTimeout(() => {
      if (wsConnected && currentWeight !== null) {
        const newWeight = parseFloat(currentWeight);
        if (!isNaN(newWeight) && newWeight >= 0) {
          setDisplayWeight(newWeight.toFixed(2));
          updateFieldRef.current("net_weight", newWeight.toFixed(2));
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
    updateFieldRef.current("net_weight", formattedWeight);

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
      updateFieldRef.current("net_weight", formattedWeight);
    }
  };

  const handleManualWeightChange = (value) => {
    const canEdit = manualEditMode || isEditMode || insertedWeight !== null;

    if (canEdit) {
      if (value === "" || parseFloat(value) <= 9999.99) {
        setDisplayWeight(value);
        updateFieldRef.current("net_weight", value);

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
      return;
    }
    
    const result = await handleSubmit();
    if (result.success && onSubmit) {
      onSubmit(result);

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
  };

  const renderConnectionStatus = () => {
    if (!isSupported) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            WebSerial tidak didukung di browser ini. Gunakan Chrome atau Edge versi 89+
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
                <div className="bg-white p-2 rounded-lg shadow-sm">
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
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-orange-900">
                    ⚠️ Koneksi Timeout
                  </div>
                  <div className="text-xs text-orange-700 mt-0.5">
                    Tidak dapat terhubung ke timbangan. Klik Connect untuk mencoba lagi atau gunakan mode manual.
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
                  <div className="bg-white p-2 rounded-lg shadow-sm">
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
                <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
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
              <div className="bg-white p-2 rounded-lg shadow-sm">
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
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Konfirmasi Hapus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingItem && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Waktu:</span>
                <span className="font-medium">
                  {format(
                    new Date(editingItem.createdAt),
                    "dd MMM yyyy HH:mm:ss",
                    {
                      locale: localeId,
                    }
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Hull No:</span>
                <span className="font-bold">{editingItem.hull_no}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Net Weight:</span>
                <span className="font-bold text-green-600">
                  {editingItem.net_weight || "-"} ton
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleFormSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Hapus Data
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSubmit?.({ cancelled: true })}
              disabled={isSubmitting}
              className="flex-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const canEditWeight = manualEditMode || isEditMode || insertedWeight !== null;

  if (isEditMode) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="border-blue-200 bg-blue-50 mt-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-blue-800">
              <Clock className="w-4 h-4" />
              Data Original
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Dibuat:</span>
                  <span className="font-medium ml-2">
                    {editingItem?.createdAt
                      ? format(
                          new Date(editingItem.createdAt),
                          "dd MMM yyyy | HH:mm:ss",
                          { locale: localeId }
                        )
                      : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Hull No:</span>
                  <span className="font-medium ml-2">
                    {editingItem?.hull_no || "-"}
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
                Update Net Weight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="net_weight_edit" className="pb-2">
                  Net Weight (ton) *
                </Label>
                <Input
                  id="net_weight_edit"
                  type="text"
                  inputMode="decimal"
                  value={formData.net_weight}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (value === "") {
                      updateField("net_weight", value);
                      return;
                    }

                    const regex = /^\d*\.?\d{0,2}$/;
                    if (!regex.test(value)) {
                      return;
                    }

                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 9999.99) {
                      return;
                    }

                    updateField("net_weight", value);
                  }}
                  className={errors.net_weight ? "border-red-500" : ""}
                  placeholder="0.00"
                />
                {errors.net_weight && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.net_weight}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Maksimal 9999.99 ton
                </p>
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

  // CREATE MODE
  return (
    <div className="max-w-4xl mx-auto space-y-3">
      {/* Connection Status */}
      {renderConnectionStatus()}

      {/* Timestamp Info & Status */}
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Input Form */}
      <Card className="shadow-none border-none dark:bg-gray-800 dark:text-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-4 h-4" />
            Input Data Checkpoint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unit Selection */}
          <div>
            <Label htmlFor="unit_id" className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4" />
              Unit Dump Truck *
            </Label>

            <SearchableSelect
              id="unit_id"
              items={unitOptions}
              value={formData.unit_id}
              onChange={(value) => updateField("unit_id", value)}
              placeholder="Pilih unit dump truck..."
              emptyText="Unit tidak ditemukan"
              disabled={isLoadingUnits}
              error={!!errors.unit_id}
              allowClear={true}
            />

            {errors.unit_id && (
              <p className="text-sm text-red-500 mt-1">{errors.unit_id}</p>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Pilih unit dump truck untuk ditimbang
            </p>
          </div>

          {/* Net Weight Input */}
          <div>
            <Label
              htmlFor="net_weight"
              className="flex items-center gap-2 mb-2"
            >
              <Weight className="w-4 h-4" />
              Net Weight (ton) *
              <span className="text-xs text-gray-500 font-normal">
                (Berat Bersih)
              </span>
            </Label>

            <div className="flex items-center gap-2">
              {/* Weight Input */}
              <div className="relative flex-1">
                <Input
                  id="net_weight"
                  type="text"
                  inputMode="decimal"
                  value={displayWeight}
                  onChange={(e) => handleManualWeightChange(e.target.value)}
                  onBlur={() => validateField("net_weight")}
                  className={`${errors.net_weight ? "border-red-500" : ""} ${
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
                  disabled={isLoadingUnits}
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
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {insertedWeight !== null ? "Re-Insert" : "Insert"}
                  </span>
                </Button>
              )}
            </div>

            {errors.net_weight && (
              <p className="text-sm text-red-500 mt-1">{errors.net_weight}</p>
            )}

            {/* Status Info */}
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500">
                Maksimal 9999.99 ton (4 digit)
              </p>

              {manualEditMode && (
                <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  <Edit2 className="w-3 h-3" />
                  <span>
                    Mode manual aktif - ketik berat secara manual
                  </span>
                </div>
              )}
              {!manualEditMode && insertedWeight !== null && insertedTime && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <Download className="w-3 h-3" />
                  <span>
                    🔒 Locked: <strong>{insertedWeight.toFixed(2)} ton</strong>{" "}
                    pada {format(insertedTime, "HH:mm:ss")}
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
                      ⏳ Menunggu berat stabil... ({stableWeightCount}/10)
                    </span>
                  </div>
                )}
              {!manualEditMode &&
                insertedWeight === null &&
                wsConnected &&
                !waitingForFirstData &&
                isWeightStable && (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <AlertCircle className="w-3 h-3" />
                    <span>
                      ✅ Berat stabil - Klik Insert atau tunggu auto-lock
                    </span>
                  </div>
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

      {isLoadingUnits && (
        <Alert>
          <Loader2 className="w-4 h-4 animate-spin" />
          <AlertDescription>Memuat data unit...</AlertDescription>
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
              disabled={isSubmitting || isLoadingUnits}
              className="flex items-center gap-2 cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>

            <div className="flex items-center gap-2">
              {onSubmit && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onSubmit({ cancelled: true })}
                  disabled={isSubmitting}
                  className="cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Batal
                </Button>
              )}

              <Button
                type="button"
                onClick={handleFormSubmit}
                disabled={
                  !isValid ||
                  isSubmitting ||
                  isLoadingUnits ||
                  (!manualEditMode && wsConnected && insertedWeight === null)
                }
                className="flex items-center gap-2 min-w-30 cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckPointForm;