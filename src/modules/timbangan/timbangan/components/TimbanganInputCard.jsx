import React, { useMemo, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Truck,
  Weight,
  Scale,
  Save,
  Loader2,
  Usb,
  Radio,
  RefreshCw,
} from "lucide-react";
import { useTimbanganHooks } from "../hooks/useTimbanganHooks";
import useAuthStore from "@/modules/auth/store/authStore";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import { useRFIDWebSerial } from "@/shared/hooks/useRFIDWebSerial";
import { Badge } from "@/shared/components/ui/badge";
import PrintTicketButton from "@/modules/timbangan/ritase/components/PrintTicketButton";

export const TimbanganInputCard = ({ fleetConfigs = [] }) => {
  const user = useAuthStore((state) => state.user);
  const isOperator = user?.role === "operator_jt";

  const {
    formData,
    setFormData,
    errors,
    setErrors,
    isSubmitting,
    handleHullNoChange,
    handleSubmit,
    lastSubmittedData,
    clearLastSubmittedData,
  } = useTimbanganHooks();

  const scale = useWebSerialScale();
  const rfid = useRFIDWebSerial();

  // Refs for focusing inputs
  const hullNoInputRef = useRef(null);
  const grossWeightInputRef = useRef(null);
  const netWeightInputRef = useRef(null);
  const printButtonRef = useRef(null);

  // ✅ Validation Regex
  const WEIGHT_LIMITS = {
    GROSS: {
      MAX: 199.99,
      REGEX: /^\d{0,3}(\.\d{0,2})?$/, // Max 3 digits before decimal, 2 after (0-199.99)
      MAX_DIGITS: 3,
      MAX_DECIMALS: 2,
    },
    TARE: {
      MAX: 99.99,
      REGEX: /^\d{0,2}(\.\d{0,2})?$/, // Max 2 digits before decimal, 2 after (0-99.99)
      MAX_DIGITS: 2,
      MAX_DECIMALS: 2,
    },
    NET: {
      MAX: 99.99,
      REGEX: /^\d{0,2}(\.\d{0,2})?$/, // Max 2 digits before decimal, 2 after (0-99.99)
      MAX_DIGITS: 2,
      MAX_DECIMALS: 2,
    },
  };

  // ✅ Validated Weight Change Handler for Gross Weight
  const handleGrossWeightChange = useCallback(
    (e) => {
      let value = e.target.value;

      // Replace comma with dot for decimal
      let formattedValue = value.replace(/,/g, ".");

      // Allow empty string
      if (formattedValue === "") {
        setFormData((prev) => ({ ...prev, gross_weight: "" }));
        setErrors((prev) => ({ ...prev, gross_weight: null }));
        return;
      }

      // Validate format and range
      const isValidFormat = WEIGHT_LIMITS.GROSS.REGEX.test(formattedValue);

      if (!isValidFormat) {
        return; // Don't update if format is invalid
      }

      const numValue = parseFloat(formattedValue);

      // Check max limit
      if (!isNaN(numValue) && numValue > WEIGHT_LIMITS.GROSS.MAX) {
        setErrors((prev) => ({
          ...prev,
          gross_weight: `Maksimal ${WEIGHT_LIMITS.GROSS.MAX} ton`,
        }));
        return;
      }

      // Valid input - update state
      setFormData((prev) => ({ ...prev, gross_weight: formattedValue }));
      setErrors((prev) => ({ ...prev, gross_weight: null }));
    },
    [setFormData, setErrors],
  );

  // ✅ Validated Weight Change Handler for Net Weight
  const handleNetWeightChange = useCallback(
    (e) => {
      let value = e.target.value;

      // Replace comma with dot for decimal
      let formattedValue = value.replace(/,/g, ".");

      // Allow empty string
      if (formattedValue === "") {
        setFormData((prev) => ({ ...prev, net_weight: "" }));
        setErrors((prev) => ({ ...prev, net_weight: null }));
        return;
      }

      // Validate format and range
      const isValidFormat = WEIGHT_LIMITS.NET.REGEX.test(formattedValue);

      if (!isValidFormat) {
        return; // Don't update if format is invalid
      }

      const numValue = parseFloat(formattedValue);

      // Check max limit
      if (!isNaN(numValue) && numValue > WEIGHT_LIMITS.NET.MAX) {
        setErrors((prev) => ({
          ...prev,
          net_weight: `Maksimal ${WEIGHT_LIMITS.NET.MAX} ton`,
        }));
        return;
      }

      // Valid input - update state
      setFormData((prev) => ({ ...prev, net_weight: formattedValue }));
      setErrors((prev) => ({ ...prev, net_weight: null }));
    },
    [setFormData, setErrors],
  );

  useEffect(() => {
    if (
      isOperator &&
      scale.isConnected &&
      scale.isStable &&
      scale.lockedWeight
    ) {
      // ✅ Validate scale weight before setting
      const scaleWeight = parseFloat(scale.lockedWeight);
      if (!isNaN(scaleWeight) && scaleWeight <= WEIGHT_LIMITS.GROSS.MAX) {
        setFormData((prev) => ({ ...prev, gross_weight: scale.lockedWeight }));
      } else {
        console.warn("⚠️ Scale weight exceeds limit:", scaleWeight);
      }
    }
  }, [
    scale.lockedWeight,
    scale.currentWeight,
    scale.isStable,
    scale.isConnected,
    isOperator,
  ]);

  // Handle RFID Data
  useEffect(() => {
    if (rfid.lastScan) {
      handleHullNoChange(rfid.lastScan);
      rfid.clearLastScan();
    }
  }, [rfid.lastScan]);

  // Auto-print ticket after successful submission
  useEffect(() => {
    if (lastSubmittedData && printButtonRef.current) {
      // Add small delay to ensure data is ready
      const timer = setTimeout(() => {
        printButtonRef.current.click();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [lastSubmittedData]);

  const hullNoOptions = useMemo(() => {
    if (!Array.isArray(fleetConfigs) || fleetConfigs.length === 0) {
      return [];
    }

    const hullNos = new Map();

    fleetConfigs.forEach((dumptruck) => {
      const hull = dumptruck.hull_no || dumptruck.hullNo || dumptruck.hull;

      if (!hull) {
        return;
      }

      const option = {
        value: hull,
        label: hull,
        hint: dumptruck.company || dumptruck.companyName || "No Company",
      };

      hullNos.set(hull, option);
    });

    const options = Array.from(hullNos.values());

    return options;
  }, [fleetConfigs]);

  // ✅ Simulation Local State
  const [targetWeight, setTargetWeight] = React.useState("0");
  const [selectedSimTruck, setSelectedSimTruck] = React.useState(null);

  // ==================== KEYBOARD SHORTCUTS ====================
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Jangan jalankan shortcuts jika sedang mengetik di input/textarea
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(
        e.target.tagName,
      );

      // Alt + D: Focus ke input DT (Hull No)
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        // Fokus ke searchable select dengan cara trigger click
        const selectButton = document.querySelector('[role="combobox"]');
        if (selectButton) {
          selectButton.click();
        }
        return;
      }

      // Alt + T: Focus ke input Tonase (Gross Weight) - untuk operator
      if (e.altKey && e.key.toLowerCase() === "t" && isOperator) {
        e.preventDefault();
        grossWeightInputRef.current?.focus();
        return;
      }

      // Alt + N: Focus ke input Net Weight - untuk non-operator
      if (e.altKey && e.key.toLowerCase() === "n" && !isOperator) {
        e.preventDefault();
        netWeightInputRef.current?.focus();
        return;
      }

      // Alt + C: Connect ke Timbangan (Scale)
      if (e.altKey && e.key.toLowerCase() === "c" && isOperator) {
        e.preventDefault();
        if (!scale.isConnected) {
          scale.connect();
        }
        return;
      }

      // Alt + R: Connect/Scan RFID
      if (e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (!rfid.isConnected) {
          rfid.connect();
        } else {
          // Jika sudah connect, langsung scan
          rfid.startScanning();
        }
        return;
      }

      // Alt + S atau Ctrl + Enter: Submit form
      if (
        (e.altKey && e.key.toLowerCase() === "s") ||
        (e.ctrlKey && e.key === "Enter")
      ) {
        e.preventDefault();

        // Cek apakah tombol submit tidak disabled
        const canSubmit =
          !isSubmitting &&
          (!isOperator || !scale.isConnected || scale.lockedWeight);

        if (canSubmit) {
          // Trigger submit
          const form = document.querySelector("form");
          if (form) {
            form.dispatchEvent(
              new Event("submit", { cancelable: true, bubbles: true }),
            );
          }
        }
        return;
      }

      // Alt + X: Disconnect Scale
      if (e.altKey && e.key.toLowerCase() === "x" && isOperator) {
        e.preventDefault();
        if (scale.isConnected) {
          scale.disconnect();
        }
        return;
      }

      // Alt + Z: Disconnect RFID
      if (e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (rfid.isConnected) {
          rfid.disconnect();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOperator, scale, rfid, isSubmitting, handleSubmit]);

  return (
    <Card className="w-full shadow-md dark:shadow-gray-900/50 border-t-4 border-t-blue-600 dark:border-t-blue-500 bg-neutral-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <CardHeader className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-gray-100">
            <Scale className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Input Timbangan
          </CardTitle>

          {/* Hardware Controls */}
          <div className="flex flex-wrap gap-2">
            {isOperator && (
              <>
                {/* Scale Connection */}
                <Button
                  variant={scale.isConnected ? "default" : "outline"}
                  size="sm"
                  onClick={scale.isConnected ? scale.disconnect : scale.connect}
                  disabled={scale.isConnecting}
                  className={`text-xs flex items-center gap-1.5 ${
                    scale.isConnected
                      ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                      : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                  title="Alt + C untuk connect, Alt + X untuk disconnect"
                >
                  {scale.isConnecting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Usb className="w-3 h-3" />
                  )}
                  {scale.isConnected
                    ? "Timbangan Terhubung"
                    : "Hubungkan Timbangan"}
                </Button>

                {/* Scale Live Weight Display */}
                {scale.isConnected && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700">
                    <Weight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100">
                      {scale.currentWeight || "0.00"} ton
                    </span>
                    <Badge
                      variant="outline"
                      className={`py-0 px-1.5 text-[10px] h-4 ${
                        scale.isStable
                          ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                          : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700 animate-pulse"
                      }`}
                    >
                      {scale.isStable ? "STABLE" : "..."}
                    </Badge>
                  </div>
                )}
              </>
            )}

            {/* RFID Connection */}
            <Button
              variant={rfid.isConnected ? "default" : "outline"}
              size="sm"
              onClick={rfid.isConnected ? rfid.disconnect : rfid.connect}
              disabled={rfid.isConnecting}
              className={`text-xs flex items-center gap-1.5 ${
                rfid.isConnected
                  ? "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white"
                  : "border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
              title="Alt + R untuk connect/scan, Alt + Z untuk disconnect"
            >
              {rfid.isConnecting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Radio className="w-3 h-3" />
              )}
              {rfid.isConnected ? "RFID Terhubung" : "Hubungkan RFID"}
            </Button>

            {/* RFID Status */}
            {rfid.isConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/30 rounded-md border border-purple-200 dark:border-purple-800">
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  {rfid.isScanning ? "🔍 Scanning..." : "✓ Ready"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-blue-700 dark:text-blue-400">
            <div>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                Alt
              </kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                D
              </kbd>
              {" - Input DT"}
            </div>
            {isOperator && (
              <div>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                  Alt
                </kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                  T
                </kbd>
                {" - Input Tonase"}
              </div>
            )}
            {!isOperator && (
              <div>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                  Alt
                </kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                  N
                </kbd>
                {" - Input Net"}
              </div>
            )}
            {isOperator && (
              <div>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                  Alt
                </kbd>
                {" + "}
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                  C
                </kbd>
                {" - Connect Scale"}
              </div>
            )}
            <div>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                Alt
              </kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                R
              </kbd>
              {" - Connect/Scan RFID"}
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                Alt
              </kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                S
              </kbd>
              {" - Submit"}
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                Ctrl
              </kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-[10px]">
                Enter
              </kbd>
              {" - Submit"}
            </div>
          </div>
        </div>

        {/* Simulation Controls - Development Only */}
        {!isOperator && process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
              🧪 Simulation Mode (Dev Only)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Scale Simulation */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">
                  Scale Simulation
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="Target weight"
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs whitespace-nowrap"
                    onClick={() =>
                      scale.simulateWeight(parseFloat(targetWeight))
                    }
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Simulate
                  </Button>
                </div>
              </div>

              {/* 2. RFID Simulation */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">
                  RFID Simulation
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      items={hullNoOptions}
                      value={selectedSimTruck}
                      onChange={setSelectedSimTruck}
                      placeholder="Select Truck..."
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs whitespace-nowrap"
                    disabled={!selectedSimTruck}
                    onClick={() => rfid.simulateScan(selectedSimTruck)}
                  >
                    Scan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* Hull No */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                <Truck className="w-4 h-4" /> Nomor Lambung
                <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">
                  (Alt + D)
                </span>
                {hullNoOptions.length > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    ({hullNoOptions.length} unit tersedia)
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    items={hullNoOptions}
                    value={formData.hull_no}
                    onChange={handleHullNoChange}
                    placeholder="Cari nomor lambung..."
                    error={!!errors.hull_no}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              {errors.hull_no && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {errors.hull_no}
                </p>
              )}
              {hullNoOptions.length === 0 && (
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                  ⚠️ Tidak ada data dumptruck. Pastikan sudah ada koneksi atau
                  data di cache.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Gross Weight */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                <Weight className="w-4 h-4" /> Berat Kotor (Ton)
                {isOperator && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">
                    (Alt + T)
                  </span>
                )}
                {isOperator && scale.isConnected && (
                  <Badge
                    variant="outline"
                    className={`ml-2 py-0 text-[10px] h-5 ${
                      scale.isStable
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                        : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                    }`}
                  >
                    {scale.isStable ? "STABLE" : "UNSTABLE"}
                  </Badge>
                )}
              </Label>
              <div className="relative">
                <Input
                  ref={grossWeightInputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formData.gross_weight}
                  onChange={handleGrossWeightChange}
                  readOnly={!isOperator}
                  className={`bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 
                    focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400
                    text-gray-900 dark:text-gray-100 
                    placeholder:text-gray-400 dark:placeholder:text-gray-500 
                    transition-colors
                    ${errors.gross_weight ? "border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400" : ""} 
                    ${!isOperator ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}`}
                  disabled={isSubmitting}
                />
                {isOperator && scale.isConnected && (
                  <div className="absolute right-3 top-2.5 text-xs text-green-600 dark:text-green-400 font-medium animate-pulse">
                    Live
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                {errors.gross_weight && (
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {errors.gross_weight}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  Max: {WEIGHT_LIMITS.GROSS.MAX} ton
                </p>
              </div>
            </div>

            {/* Tare Weight */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300 font-medium">
                Berat Kosong (Ton)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.tare_weight}
                readOnly
                className={`bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 
                  text-gray-900 dark:text-gray-100 
                  placeholder:text-gray-400 dark:placeholder:text-gray-500 
                  cursor-not-allowed
                  ${errors.tare_weight ? "border-red-500 dark:border-red-400" : ""}`}
                disabled={true}
              />
              <div className="flex items-center justify-between">
                {errors.tare_weight && (
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {errors.tare_weight}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  Max: {WEIGHT_LIMITS.TARE.MAX} ton
                </p>
              </div>
            </div>

            {/* Net Weight */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
                Berat Bersih (Ton)
                {!isOperator && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">
                    (Alt + N)
                  </span>
                )}
              </Label>
              <Input
                ref={netWeightInputRef}
                type="text"
                inputMode="decimal"
                value={formData.net_weight}
                disabled={isOperator}
                onChange={handleNetWeightChange}
                placeholder="0.00"
                className={`${
                  isOperator
                    ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    : "bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                } 
                border-gray-300 dark:border-gray-700 
                font-bold text-lg text-right 
                text-gray-900 dark:text-gray-100
                transition-colors`}
              />
              <div className="flex items-center justify-between">
                {errors.net_weight && (
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {errors.net_weight}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  Max: {WEIGHT_LIMITS.NET.MAX} ton
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                text-white font-medium
                shadow-sm hover:shadow-md
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={
                isSubmitting ||
                (isOperator && scale.isConnected && !scale.lockedWeight)
              }
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  <p className="hidden md:inline">
                    {" "}
                    {isOperator && scale.isConnected && !scale.lockedWeight
                      ? "Tunggu Stabil..."
                      : "Simpan Data"}
                  </p>
                  <span className="md:ml-2 text-xs opacity-75">
                    (Alt+S / Ctrl+Enter)
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Hidden Print Button - Will be triggered automatically */}
      {/* Operator name automatically retrieved from localStorage ("operator_sib_name") */}
      {lastSubmittedData && (
        <div style={{ display: "none" }}>
          <PrintTicketButton
            ref={printButtonRef}
            data={lastSubmittedData}
            autoPrint={false} // We control it manually via ref
          />
        </div>
      )}
    </Card>
  );
};