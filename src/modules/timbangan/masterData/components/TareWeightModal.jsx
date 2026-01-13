import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Scale,
  X,
  Loader2,
  Save,
  Clock,
  Radio,
  WifiOff,
  Download,
  AlertTriangle,
  Info,
  Edit2,
  Wifi,
} from "lucide-react";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import { showToast } from "@/shared/utils/toast";
import { format } from "date-fns";
import { formatWeight } from "@/shared/utils/number";
import ModalHeader from "@/shared/components/ModalHeader";
const TARE_WEIGHT_EXPIRY_DAYS = 7;

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

/**
 * TareWeightModal - Unified modal for tare weight input
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.unit - Single unit for direct weighing (optional)
 * @param {Array} props.units - List of units for selection mode (optional)
 * @param {Function} props.onSave - Save handler
 * @param {boolean} props.isSaving - Saving state
 *
 * Mode Selection:
 * - If `unit` is provided → Single Unit Mode (direct weighing)
 * - If `units` is provided → Selection Mode (choose unit first)
 */
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
  const [manualMode, setManualMode] = useState(false);
  const [manualWeight, setManualWeight] = useState("");
  const [displayWeight, setDisplayWeight] = useState("");
  const [insertedWeight, setInsertedWeight] = useState(null);
  const [insertedTime, setInsertedTime] = useState(null);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (!isOpen) {
      setSelectedUnitId(null);
      setManualMode(false);
      setManualWeight("");
      setDisplayWeight("");
      setInsertedWeight(null);
      setInsertedTime(null);
      setError("");
    }
  }, [isOpen]);

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
    if (!isOpen || manualMode || insertedWeight !== null) return;

    if (isConnected && currentWeight !== null && currentWeight !== undefined) {
      const weight = parseFloat(currentWeight);
      if (!isNaN(weight) && weight >= 0) {
        setDisplayWeight(weight.toFixed(2));
        setError("");
      }
    }
  }, [currentWeight, isConnected, isOpen, manualMode, insertedWeight]);

  const handleInsert = () => {
    if (!isConnected || !currentWeight) return;

    const weight = parseFloat(currentWeight);
    const formattedWeight = weight.toFixed(2);
    const now = new Date();

    setInsertedWeight(weight);
    setInsertedTime(now);
    setDisplayWeight(formattedWeight);
    setError("");
  };

  const handleManualChange = (value) => {
    setManualWeight(value);
    setDisplayWeight(value);
    setError("");

    if (insertedWeight !== null) {
      setInsertedWeight(null);
      setInsertedTime(null);
    }
  };

  const handleToggleManual = () => {
    const newMode = !manualMode;
    setManualMode(newMode);

    if (newMode) {
      setInsertedWeight(null);
      setInsertedTime(null);
    }

    if (!newMode && isConnected && currentWeight) {
      const weight = parseFloat(currentWeight);
      setDisplayWeight(weight.toFixed(2));
    }
  };

  const handleSave = async () => {
    if (isSelectionMode && !selectedUnitId) {
      setError("Unit dump truck harus dipilih");
      return;
    }

    if (!manualMode && insertedWeight === null && isConnected) {
      setError(
        "Klik tombol Insert terlebih dahulu untuk mengambil berat dari timbangan"
      );
      showToast.error("⌛ Klik Insert untuk mengambil berat terlebih dahulu");
      return;
    }

    const weightToSave = manualMode ? manualWeight : displayWeight;
    const weight = parseFloat(weightToSave);

    if (!weightToSave || isNaN(weight) || weight <= 0) {
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
      method: manualMode
        ? "manual"
        : insertedWeight !== null
        ? "inserted"
        : "live",
    });
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
        currentUnit.updatedAt || currentUnit.update_at
      )
    : null;

  const canSave =
    (isSelectionMode ? selectedUnitId : true) &&
    displayWeight &&
    parseFloat(displayWeight) > 0 &&
    (manualMode || insertedWeight !== null || !isConnected);

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 z-50  flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 border-none">
<ModalHeader
  title={isSelectionMode ? "Timbang Kosong (Tare Weight)" : `Penimbangan Tare Weight - ${currentUnit?.hull_no}`}
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
                        Tare Weight Sebelumnya:
                      </span>
                      <span>{currentUnit.tare_weight.toFixed(2)} ton</span>
                      {currentStatus && (
                        <Badge
                          variant={
                            currentStatus.severity === "error"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
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
                        Tare Weight:{" "}
                        <strong>{currentUnit.tare_weight} ton</strong>
                        {(currentUnit.updatedAt || currentUnit.update_at) && (
                          <>
                            {" "}
                            | Update:{" "}
                            {new Date(
                              currentUnit.updatedAt || currentUnit.update_at
                            ).toLocaleDateString("id-ID")}
                          </>
                        )}
                      </p>
                    </div>
                    <Badge variant="destructive">Perlu Timbang Ulang</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

          {/* Connection Status */}
          <div
            className={`rounded-lg p-4 border-2 ${
              isConnected
                ? "bg-green-50 border-green-300"
                : "bg-orange-50 border-orange-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Radio className="w-4 h-4 text-green-600 animate-pulse" />
                    <span className="text-sm font-medium text-green-800">
                      {isSelectionMode ? "Terhubung ke Timbangan" : "Terhubung"}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">
                      {isSelectionMode ? "Offline - Mode Manual" : "Offline"}
                    </span>
                  </>
                )}
              </div>

              {/* Mode Badge */}
              {manualMode ? (
                <Badge variant="default" className="bg-yellow-600">
                  <Edit2 className="w-3 h-3 mr-1" />
                  Manual
                </Badge>
              ) : insertedWeight !== null ? (
                <Badge variant="default" className="bg-green-600">
                  <Download className="w-3 h-3 mr-1" />
                  Inserted
                </Badge>
              ) : isConnected ? (
                <Badge variant="default" className="bg-blue-600 animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              ) : null}
            </div>

            {/* Connect Button - Show when not connected and supported */}
            {!isConnected && isSupported && (
              <div className="mt-3">
                <Button
                  onClick={connect}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  variant="default"
                >
                  <Wifi className="w-4 h-4 mr-2" />
                  Hubungkan ke Timbangan
                </Button>
              </div>
            )}

            {/* Live Weight Display */}
            {isConnected && currentWeight !== null && !manualMode && (
              <div
                className={`bg-white rounded-lg p-3 border ${
                  insertedWeight !== null
                    ? "border-green-200"
                    : "border-blue-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {insertedWeight !== null ? "Inserted:" : "Live:"}
                  </span>
                  <div className="flex items-center gap-2">
                    {insertedWeight === null && (
                      <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                    )}
                    {insertedWeight !== null && (
                      <Download className="w-4 h-4 text-green-600" />
                    )}
                    <span
                      className={`text-2xl font-bold font-mono ${
                        insertedWeight !== null
                          ? "text-green-900"
                          : "text-blue-900"
                      }`}
                    >
                      {formatWeight(currentWeight)}
                    </span>
                    <span
                      className={`text-lg font-medium ${
                        insertedWeight !== null
                          ? "text-green-600"
                          : "text-blue-600"
                      }`}
                    >
                      ton
                    </span>
                  </div>
                </div>
                {insertedWeight === null && (
                  <p className="text-xs text-blue-600 mt-2">
                    ⚡ Live weight - Klik Insert untuk mengambil nilai
                  </p>
                )}
                {insertedWeight !== null && insertedTime && (
                  <p className="text-xs text-green-600 mt-2">
                    📥 Diambil pada {format(insertedTime, "HH:mm:ss")} - Klik
                    Insert lagi untuk update
                  </p>
                )}
              </div>
            )}

            {/* Manual Mode Info */}
            {manualMode && (
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 mt-2">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-yellow-700" />
                  <span className="text-sm font-medium text-yellow-800">
                    Mode Manual Aktif
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Ketik berat secara manual di field bawah
                </p>
              </div>
            )}
          </div>

          {/* Weight Input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Tare Weight (Berat Kosong) *
            </Label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  value={displayWeight}
                  onChange={(e) => handleManualChange(e.target.value)}
                  className={`${
                    error && (isSelectionMode ? selectedUnitId : true)
                      ? "border-red-500"
                      : ""
                  } ${
                    manualMode
                      ? "bg-yellow-50 border-yellow-400"
                      : insertedWeight !== null
                      ? "bg-green-50 border-green-400"
                      : isConnected
                      ? "bg-blue-50 border-blue-300"
                      : ""
                  }`}
                  placeholder="0.00"
                  disabled={
                    !manualMode && insertedWeight === null && !isConnected
                  }
                  readOnly={!manualMode && insertedWeight === null}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {manualMode ? (
                    <Edit2 className="w-4 h-4 text-yellow-600" />
                  ) : insertedWeight !== null ? (
                    <Download className="w-4 h-4 text-green-600" />
                  ) : isConnected ? (
                    <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Manual Toggle - Only show when disconnected */}
              {!isConnected && (
                <Button
                  type="button"
                  onClick={handleToggleManual}
                  className={
                    manualMode ? "bg-yellow-600 hover:bg-yellow-700 cursor-pointer " :  "cursor-pointer dark:bg-slate-700 dark:hover:bg-gray-200 dark:hover:text-black"
                  }
                >
                  {manualMode ? "Auto" : "Manual"}
                </Button>
              )}

              {/* Insert Button - Only show when connected */}
              {isConnected && !manualMode && (
                <Button
                  type="button"
                  onClick={handleInsert}
                  disabled={!isConnected || !currentWeight}
                  className={
                    insertedWeight !== null
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }
                >
                  <Download className="w-4 h-4 mr-1" />
                  {insertedWeight !== null ? "Re-Insert" : "Insert"}
                </Button>
              )}
            </div>

            {error && (isSelectionMode ? selectedUnitId : true) && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            )}

            <p className="text-xs text-gray-500">
              Maksimal 70 ton untuk tare weight
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="flex-1 cursor-pointer dark:bg-slate-700"
              title={
                !canSave &&
                isConnected &&
                insertedWeight === null &&
                !manualMode
                  ? "Klik Insert terlebih dahulu "
                  : ""
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isSelectionMode ? "Simpan Timbangan Kosong" : "Simpan"}
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
              <p className="font-medium mb-1">ℹ️ Informasi:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Tare weight kadaluarsa setelah 7 hari</li>
                <li>Pastikan unit kosong saat ditimbang</li>
                <li>Gunakan "Insert" untuk mengambil berat stabil</li>
                {isSelectionMode && (
                  <li>Mode "Manual" hanya aktif saat offline</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default TareWeightModal;
