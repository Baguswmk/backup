import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Scale,
  Loader2,
  Save,
  Clock,
  Radio,
  WifiOff,
  AlertTriangle,
  Info,
  Wifi,
  Lock,
} from "lucide-react";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import { showToast } from "@/shared/utils/toast";
import { format } from "date-fns";
import { formatWeight } from "@/shared/utils/number";
import ModalHeader from "@/shared/components/ModalHeader";

const TARE_WEIGHT_EXPIRY_DAYS = 7;
const WEIGHT_STABLE_DURATION = 2000; // 2 seconds
const WEIGHT_TOLERANCE = 0.01; // 10kg tolerance

const getTareWeightStatus = (tareWeight, updatedAt) => {
  if (!tareWeight || !updatedAt) {
    return {
      status: "missing",
      severity: "error",
      message: "Belum ada data tare weight",
      daysRemaining: 0,
    };
  }

  const now = new Date();
  const updated = new Date(updatedAt);
  const daysDiff = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  const daysRemaining = TARE_WEIGHT_EXPIRY_DAYS - daysDiff;

  if (daysDiff >= TARE_WEIGHT_EXPIRY_DAYS) {
    return {
      status: "expired",
      severity: "error",
      message: `Kadaluarsa ${daysDiff} hari`,
      daysRemaining: 0,
    };
  } else if (daysRemaining <= 2) {
    return {
      status: "warning",
      severity: "warning",
      message: `${daysRemaining} hari lagi`,
      daysRemaining,
    };
  } else {
    return {
      status: "valid",
      severity: "success",
      message: `${daysRemaining} hari lagi`,
      daysRemaining,
    };
  }
};

const TareWeightModal = ({
  isOpen,
  onClose,
  unit = null,
  units = null,
  onSave,
  isSaving,
}) => {
  const { isConnected, currentWeight, isSupported, connect } =
    useWebSerialScale();
  const isSelectionMode = units !== null && units.length > 0;
  const isSingleUnitMode = unit !== null;

  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [lockedWeight, setLockedWeight] = useState(null);
  const [lockedTime, setLockedTime] = useState(null);
  const [error, setError] = useState("");
  const [stabilityProgress, setStabilityProgress] = useState(0);

  // Refs for stability tracking
  const stabilityTimerRef = useRef(null);
  const lastWeightRef = useRef(null);
  const stableStartTimeRef = useRef(null);

  const currentUnit = useMemo(() => {
    if (isSingleUnitMode) return unit;
    if (isSelectionMode && selectedUnitId) {
      return units.find((u) => String(u.id) === String(selectedUnitId));
    }
    return null;
  }, [isSingleUnitMode, isSelectionMode, unit, units, selectedUnitId]);

  const unitOptions = useMemo(() => {
    if (!isSelectionMode) return [];
    return units.map((u) => ({
      value: u.id,
      label: u.hull_no,
      hint: u.company || "-",
    }));
  }, [units, isSelectionMode]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUnitId(null);
      setLockedWeight(null);
      setLockedTime(null);
      setError("");
      setStabilityProgress(0);
      lastWeightRef.current = null;
      stableStartTimeRef.current = null;
      if (stabilityTimerRef.current) {
        clearInterval(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
    }
  }, [isOpen]);

  // Handle body overflow
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

  // Auto-lock mechanism when weight is stable for 2 seconds
  useEffect(() => {
    if (!isOpen || !isConnected || lockedWeight !== null) {
      // Clear timer if modal closes, disconnects, or weight is already locked
      if (stabilityTimerRef.current) {
        clearInterval(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
      stableStartTimeRef.current = null;
      setStabilityProgress(0);
      return;
    }

    if (currentWeight === null || currentWeight === undefined) {
      return;
    }

    const weight = parseFloat(currentWeight);
    if (isNaN(weight) || weight <= 0) {
      return;
    }

    // Check if weight is stable (within tolerance)
    const lastWeight = lastWeightRef.current;
    const isStable = lastWeight !== null && Math.abs(weight - lastWeight) <= WEIGHT_TOLERANCE * 1000; // Convert to kg

    if (isStable) {
      // Weight is stable
      if (stableStartTimeRef.current === null) {
        // Start tracking stability
        stableStartTimeRef.current = Date.now();
        
        // Start progress timer
        stabilityTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - stableStartTimeRef.current;
          const progress = Math.min((elapsed / WEIGHT_STABLE_DURATION) * 100, 100);
          setStabilityProgress(progress);

          if (elapsed >= WEIGHT_STABLE_DURATION) {
            // Lock the weight
            const now = new Date();
            setLockedWeight(weight);
            setLockedTime(now);
            setStabilityProgress(100);
            clearInterval(stabilityTimerRef.current);
            stabilityTimerRef.current = null;
            showToast.success("🔒 Berat terkunci otomatis");
          }
        }, 100);
      }
    } else {
      // Weight changed, reset stability tracking
      if (stabilityTimerRef.current) {
        clearInterval(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
      stableStartTimeRef.current = null;
      setStabilityProgress(0);
    }

    lastWeightRef.current = weight;

    return () => {
      if (stabilityTimerRef.current) {
        clearInterval(stabilityTimerRef.current);
      }
    };
  }, [currentWeight, isConnected, isOpen, lockedWeight]);

  const handleSave = async () => {
    if (isSelectionMode && !selectedUnitId) {
      setError("Unit dump truck harus dipilih");
      showToast.error("❌ Pilih unit terlebih dahulu");
      return;
    }

    if (!isConnected) {
      setError("Timbangan belum terhubung");
      showToast.error("❌ Hubungkan timbangan terlebih dahulu");
      return;
    }

    if (lockedWeight === null) {
      setError("Tunggu hingga berat stabil dan terkunci otomatis (2 detik)");
      showToast.error("⌛ Tunggu hingga berat stabil dan terkunci");
      return;
    }

    const weight = lockedWeight / 1000; // Convert kg to ton

    if (isNaN(weight) || weight <= 0) {
      setError("Berat tidak valid. Harus lebih dari 0 ton");
      return;
    }

    if (weight > 70) {
      setError("Berat terlalu besar untuk tare weight (max 70 ton)");
      return;
    }

    const unitId = isSelectionMode ? selectedUnitId : currentUnit?.id;

    await onSave({
      unitId,
      tareWeight: weight,
      weighedAt: new Date().toISOString(),
      method: "auto-locked",
    });
  };

  const handleUnlock = () => {
    setLockedWeight(null);
    setLockedTime(null);
    setStabilityProgress(0);
    lastWeightRef.current = null;
    stableStartTimeRef.current = null;
    if (stabilityTimerRef.current) {
      clearInterval(stabilityTimerRef.current);
      stabilityTimerRef.current = null;
    }
    showToast.info("🔓 Berat dibuka, tunggu stabilisasi ulang");
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentStatus = currentUnit?.tare_weight
    ? getTareWeightStatus(
        currentUnit.tare_weight,
        currentUnit.updatedAt || currentUnit.update_at,
      )
    : null;

  const canSave =
    (isSelectionMode ? selectedUnitId : true) &&
    isConnected &&
    lockedWeight !== null;

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-50 dark:bg-gray-800 border-none">
        <ModalHeader
          title={
            isSelectionMode
              ? "Timbang Kosong (Tare Weight)"
              : `Penimbangan Tare Weight - ${currentUnit?.hull_no}`
          }
          icon={Scale}
          onClose={handleClose}
          disabled={isSaving}
        />

        <CardContent className="space-y-4">
          {/* Unit Selection (only in selection mode) */}
          {isSelectionMode && (
            <div className="space-y-2">
              <Label htmlFor="unit" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Pilih Unit Dump Truck *
              </Label>
              <SearchableSelect
                items={unitOptions}
                value={selectedUnitId}
                onChange={(value) => {
                  setSelectedUnitId(value);
                  setError("");
                }}
                placeholder="Pilih unit dump truck"
                emptyText="Unit tidak ditemukan"
                disabled={isSaving}
                error={!!error && !selectedUnitId}
                allowClear={true}
              />
              {error && !selectedUnitId && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Current Unit Info */}
          {currentUnit && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                <div className="space-y-1">
                  <div>
                    <span className="font-semibold">Hull No:</span>{" "}
                    {currentUnit.hull_no}
                  </div>
                  <div>
                    <span className="font-semibold">Company:</span>{" "}
                    {currentUnit.company || "-"}
                  </div>
                  {currentUnit.tare_weight && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        Berat Kosong Sebelumnya:
                      </span>
                      <span>{currentUnit.tare_weight.toFixed(2)} ton</span>
                      {currentStatus && (
                        <Badge
                          variant={
                            currentStatus.severity === "error"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs text-blue-800"
                        >
                          {currentStatus.message}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Expired Warning */}
          {currentStatus &&
            currentUnit?.tare_weight &&
            currentStatus.severity === "error" && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between text-red-700">
                    <div>
                      <p className="font-medium">
                        Status: {currentStatus.message}
                      </p>
                      <p className="text-xs mt-1">
                        Berat Kosong:{" "}
                        <strong>{currentUnit.tare_weight} ton</strong>
                        {(currentUnit.updatedAt || currentUnit.update_at) && (
                          <>
                            {" "}
                            | Update:{" "}
                            {new Date(
                              currentUnit.updatedAt || currentUnit.update_at,
                            ).toLocaleDateString("id-ID")}
                          </>
                        )}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-red-700">
                      Perlu Timbang Ulang
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

          {/* Connection & Weight Display */}
          <div
            className={`rounded-lg p-4 border-2 ${
              isConnected
                ? lockedWeight !== null
                  ? "bg-green-50 border-green-300"
                  : "bg-blue-50 border-blue-300"
                : "bg-orange-50 border-orange-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  lockedWeight !== null ? (
                    <>
                      <Lock className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Berat Terkunci
                      </span>
                    </>
                  ) : (
                    <>
                      <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
                      <span className="text-sm font-medium text-blue-800">
                        Membaca Timbangan...
                      </span>
                    </>
                  )
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      Timbangan Offline
                    </span>
                  </>
                )}
              </div>

              {/* Status Badge */}
              {lockedWeight !== null ? (
                <Badge variant="default" className="bg-green-600">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              ) : isConnected ? (
                <Badge variant="default" className="bg-blue-600 animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              ) : null}
            </div>

            {/* Connect Button - Show when not connected */}
            {!isConnected && isSupported && (
              <Button
                onClick={connect}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                variant="default"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Hubungkan Timbangan
              </Button>
            )}

            {/* Live Weight Display */}
            {isConnected && currentWeight !== null && (
              <div
                className={`bg-white rounded-lg p-4 border-2 ${
                  lockedWeight !== null
                    ? "border-green-300"
                    : "border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 font-medium">
                    {lockedWeight !== null ? "🔒 Locked Weight:" : "⚡ Live Weight:"}
                  </span>
                  <div className="flex items-center gap-2">
                    {lockedWeight === null ? (
                      <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
                    ) : (
                      <Lock className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                </div>

                {/* Weight Display */}
                <div className="flex items-baseline justify-center gap-2 mb-3">
                  <span
                    className={`text-4xl font-bold font-mono ${
                      lockedWeight !== null
                        ? "text-green-900"
                        : "text-blue-900"
                    }`}
                  >
                    {formatWeight(
                      (lockedWeight !== null ? lockedWeight : currentWeight) / 1000
                    )}
                  </span>
                  <span
                    className={`text-2xl font-medium ${
                      lockedWeight !== null
                        ? "text-green-600"
                        : "text-blue-600"
                    }`}
                  >
                    ton
                  </span>
                </div>

                {/* Stability Progress Bar */}
                {lockedWeight === null && stabilityProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-600 font-medium">
                        ⏱️ Menunggu stabilisasi...
                      </span>
                      <span className="text-xs text-blue-600 font-mono font-bold">
                        {Math.round(stabilityProgress)}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-100 ease-linear"
                        style={{ width: `${stabilityProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Lock Status */}
                {lockedWeight === null ? (
                  <p className="text-xs text-blue-600 mt-2 text-center">
                    ⚡ Berat akan terkunci otomatis setelah stabil 2 detik
                  </p>
                ) : (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-green-600">
                      🔒 Terkunci pada {lockedTime && format(lockedTime, "HH:mm:ss")}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleUnlock}
                      className="h-7 text-xs"
                    >
                      🔓 Buka Kunci
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* No Connection Warning */}
            {!isConnected && (
              <Alert className="mt-3 border-orange-300 bg-orange-50">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-xs text-orange-800">
                  ⚠️ Hubungkan timbangan untuk penimbangan otomatis
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="flex-1 cursor-pointer dark:bg-slate-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Berat Kosong
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 cursor-pointer dark:hover:bg-slate-700"
            >
              Batal
            </Button>
          </div>

          {/* Info */}
          <Alert>
            <Clock className="w-4 h-4" />
            <AlertDescription className="text-xs">
              <p className="font-medium mb-1">ℹ️ Cara Kerja Otomatis:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Hubungkan timbangan terlebih dahulu</li>
                <li>Sistem akan membaca berat secara otomatis</li>
                <li>Berat akan terkunci setelah stabil 2 detik</li>
                <li>Pastikan unit kosong saat ditimbang</li>
                <li>Tare weight kadaluarsa setelah 7 hari</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default TareWeightModal;