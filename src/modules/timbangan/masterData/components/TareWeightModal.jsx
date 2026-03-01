import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
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
  Unlock,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  Weight,
  PencilLine,
} from "lucide-react";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import { showToast } from "@/shared/utils/toast";
import { format } from "date-fns";
import { formatWeight } from "@/shared/utils/number";
import ModalHeader from "@/shared/components/ModalHeader";
import useAuthStore from "@/modules/auth/store/authStore";

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
  const user = useAuthStore((state) => state.user);
  const isCCR = user?.role === "ccr";

  const {
    isConnected,
    currentWeight,
    isSupported,
    connect,
    lockedWeight: scaleLockedWeight,
    stabilityProgress: scaleStabilityProgress,
    isStable: scaleIsStable,
    isSimulating,
    toggleSimulation,
    setSimulatedTarget,
    stabilizeSimulation,
    manualLock,
    unlockWeight: scaleUnlockWeight,
  } = useWebSerialScale();
  const isSelectionMode = units !== null && units.length > 0;
  const isSingleUnitMode = unit !== null;

  // CCR manual input state — stores raw digits string (e.g. "1234" => "12.34" ton)
  const [manualWeightRaw, setManualWeightRaw] = useState("");
  const [manualWeightError, setManualWeightError] = useState("");

  // Format raw digit string into "XX.XX" display and numeric value
  const formatManualWeight = (raw) => {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "") || "";
    if (!digits) return { display: "", value: "" };
    const padded = digits.padStart(3, "0"); // at least "0.XX"
    const intPart = padded.slice(0, -2);
    const decPart = padded.slice(-2);
    const display = `${intPart}.${decPart}`;
    return { display, value: display };
  };

  const { display: manualWeightDisplay, value: manualWeight } =
    formatManualWeight(manualWeightRaw);

  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [lockedWeight, setLockedWeight] = useState(null);
  const [lockedTime, setLockedTime] = useState(null);
  const [error, setError] = useState("");
  const [stabilityProgress, setStabilityProgress] = useState(0);

  // Simulation panel state (dev only)
  const IS_DEV = import.meta.env.DEV;
  const [isSimPanelOpen, setIsSimPanelOpen] = useState(false);
  const [simTargetInput, setSimTargetInput] = useState("");

  // Refs for stability tracking
  const stabilityTimerRef = useRef(null);
  const lastWeightRef = useRef(null);
  const stableStartTimeRef = useRef(null);

  // Sync scaleLockedWeight (from manual/simulation lock) to local state
  useEffect(() => {
    if (scaleLockedWeight !== null && lockedWeight === null) {
      setLockedWeight(scaleLockedWeight);
      setLockedTime(new Date());
      setStabilityProgress(100);
    } else if (scaleLockedWeight === null && lockedWeight !== null) {
      // Scale was unlocked externally (e.g. toggleSimulation stop)
      setLockedWeight(null);
      setLockedTime(null);
      setStabilityProgress(0);
    }
  }, [scaleLockedWeight]);

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
      setManualWeightRaw("");
      setManualWeightError("");
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
    const isStable =
      lastWeight !== null &&
      Math.abs(weight - lastWeight) <= WEIGHT_TOLERANCE * 1000; // Convert to kg

    if (isStable) {
      // Weight is stable
      if (stableStartTimeRef.current === null) {
        // Start tracking stability
        stableStartTimeRef.current = Date.now();

        // Start progress timer
        stabilityTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - stableStartTimeRef.current;
          const progress = Math.min(
            (elapsed / WEIGHT_STABLE_DURATION) * 100,
            100,
          );
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

    // CCR: use manual input
    if (isCCR) {
      const weight = parseFloat(manualWeight);
      if (isNaN(weight) || weight <= 0) {
        setManualWeightError("Berat harus lebih dari 0 ton");
        showToast.error("❌ Masukkan berat kosong yang valid");
        return;
      }
      if (weight > 70) {
        setManualWeightError("Berat terlalu besar (max 70 ton)");
        return;
      }
      setManualWeightError("");
      const unitId = isSelectionMode ? selectedUnitId : currentUnit?.id;
      await onSave({
        unitId,
        tareWeight: weight,
        weighedAt: new Date().toISOString(),
        method: "manual-ccr",
      });
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
    // Also reset hook's internal lock state
    scaleUnlockWeight();
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

  const canSave = isCCR
    ? (isSelectionMode ? !!selectedUnitId : true) &&
      parseFloat(manualWeight) > 0
    : (isSelectionMode ? !!selectedUnitId : true) &&
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
          {/* ===== SIMULATION PANEL (DEV ONLY) ===== */}
          {IS_DEV && (
            <div className="border border-dashed border-purple-300 dark:border-purple-700 rounded-lg overflow-hidden">
              {/* Header toggle */}
              <button
                type="button"
                onClick={() => setIsSimPanelOpen((p) => !p)}
                className="w-full flex items-center justify-between px-3 py-2 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 transition-colors text-purple-700 dark:text-purple-400 text-xs font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Simulasi Timbangan
                  <span className="px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 rounded text-[10px] font-bold tracking-wide">
                    DEV
                  </span>
                  {isSimulating && (
                    <span className="px-1.5 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-[10px] font-bold animate-pulse">
                      AKTIF
                    </span>
                  )}
                </span>
                {isSimPanelOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Panel body */}
              {isSimPanelOpen && (
                <div className="p-3 space-y-3 bg-purple-50/50 dark:bg-purple-950/10">
                  {/* Live readout saat simulasi aktif */}
                  {isSimulating && (
                    <div className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <Weight className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span className="font-mono font-bold text-lg text-gray-900 dark:text-gray-100">
                        {currentWeight != null
                          ? (currentWeight / 1000).toFixed(3)
                          : "0.000"}{" "}
                        ton
                      </span>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 dark:bg-purple-400 transition-all duration-100"
                          style={{ width: `${scaleStabilityProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                        {Math.round(scaleStabilityProgress)}%
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          lockedWeight
                            ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                            : scaleIsStable
                              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                              : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                        }`}
                      >
                        {lockedWeight
                          ? "LOCKED"
                          : scaleIsStable
                            ? "STABLE"
                            : "..."}
                      </span>
                    </div>
                  )}

                  {/* Set target berat */}
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Target className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                      <input
                        type="number"
                        min="0"
                        max="99999"
                        step="100"
                        placeholder="Target berat (kg), contoh: 18000"
                        value={simTargetInput}
                        onChange={(e) => setSimTargetInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setSimulatedTarget(simTargetInput);
                          }
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-purple-300 dark:border-purple-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!simTargetInput}
                      onClick={() => setSimulatedTarget(simTargetInput)}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                    >
                      Set
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={toggleSimulation}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        isSimulating
                          ? "bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      {isSimulating ? "Stop Simulasi" : "Mulai Simulasi"}
                    </button>

                    {isSimulating && !lockedWeight && (
                      <button
                        type="button"
                        onClick={stabilizeSimulation}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Force Stabil
                      </button>
                    )}

                    {isSimulating && lockedWeight && (
                      <button
                        type="button"
                        onClick={handleUnlock}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Unlock
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-purple-500 dark:text-purple-500 leading-relaxed">
                    Alur: set target → mulai simulasi → nilai bergerak ke target
                    sambil jitter → klik "Force Stabil" untuk snap flat →
                    auto-lock setelah {2}s stabil, atau klik "🔒 Lock Manual"
                    kapan saja. Panel ini tidak muncul di production.
                  </p>
                </div>
              )}
            </div>
          )}

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

          {/* ===== CCR: MANUAL INPUT MODE ===== */}
          {isCCR && (
            <div className="rounded-lg p-4 border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 space-y-3">
              <div className="flex items-center gap-2">
                <PencilLine className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Input Manual Berat Kosong
                </span>
                <Badge className="bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-100 text-xs">
                  Manual
                </Badge>
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="manual-tare-weight"
                  className="text-xs text-amber-700 dark:text-amber-300"
                >
                  Berat Kosong (ton) *
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="manual-tare-weight"
                    type="text"
                    inputMode="numeric"
                    placeholder="0.00"
                    value={manualWeightDisplay}
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      if (onlyDigits.length <= 4) {
                        setManualWeightRaw(onlyDigits);
                        setManualWeightError("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace") {
                        e.preventDefault();
                        setManualWeightRaw((prev) => prev.slice(0, -1));
                        setManualWeightError("");
                      }
                    }}
                    disabled={isSaving}
                    className={`flex-1 px-3 py-2.5 text-xl font-mono font-bold text-center border rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 ${
                      manualWeightError
                        ? "border-red-400 focus:ring-red-400"
                        : "border-amber-300 dark:border-amber-600 focus:ring-amber-400"
                    }`}
                  />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    ton
                  </span>
                </div>
                {manualWeightError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {manualWeightError}
                  </p>
                )}
                {manualWeight &&
                  !manualWeightError &&
                  parseFloat(manualWeight) > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✅ {parseFloat(manualWeight).toFixed(2)} ton siap disimpan
                    </p>
                  )}
              </div>

              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                  Pastikan nilai berat kosong sesuai dengan hasil timbangan
                  fisik.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Connection & Weight Display — hidden for CCR */}
          {!isCCR && (
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
                  <Badge
                    variant="default"
                    className="bg-blue-600 animate-pulse"
                  >
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
                      {lockedWeight !== null
                        ? "🔒 Locked Weight:"
                        : "⚡ Live Weight:"}
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
                        (lockedWeight !== null ? lockedWeight : currentWeight) /
                          1000,
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
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-blue-600 text-center">
                        ⚡ Berat akan terkunci otomatis setelah stabil 2 detik
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const result = manualLock();
                          if (result?.success) {
                            setLockedWeight(result.weight);
                            setLockedTime(new Date());
                            setStabilityProgress(100);
                            showToast.success("🔒 Berat dikunci manual");
                          }
                        }}
                        disabled={!currentWeight || currentWeight <= 0}
                        className="w-full h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        🔒 Lock Manual
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-green-600">
                        🔒 Terkunci pada{" "}
                        {lockedTime && format(lockedTime, "HH:mm:ss")}
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
          )}

          {/* CCR: no scale section spacer */}

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
              {isCCR ? (
                <>
                  <p className="font-medium mb-1">ℹ️ Cara Kerja (Mode CCR):</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Pilih unit dump truck yang akan diinput</li>
                    <li>
                      Masukkan berat kosong dalam satuan <strong>ton</strong>
                    </li>
                    <li>Klik "Simpan Berat Kosong" untuk menyimpan</li>
                    <li>Pastikan unit kosong saat ditimbang secara fisik</li>
                    <li>Tare weight kadaluarsa setelah 7 hari</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">ℹ️ Cara Kerja Otomatis:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Hubungkan timbangan terlebih dahulu</li>
                    <li>Sistem akan membaca berat secara otomatis</li>
                    <li>Berat akan terkunci setelah stabil 2 detik</li>
                    <li>Pastikan unit kosong saat ditimbang</li>
                    <li>Tare weight kadaluarsa setelah 7 hari</li>
                  </ul>
                </>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default TareWeightModal;
