import React, { useMemo, useEffect, useCallback, useRef, useState } from "react";
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
  Zap,
} from "lucide-react";
import { useTimbanganHooks } from "../hooks/useTimbanganHooks";
import useAuthStore from "@/modules/auth/store/authStore";
import { useWebSerialScale } from "@/shared/hooks/useWebSerialScale";
import { useRFIDWebSerial } from "@/shared/hooks/useRFIDWebSerial";
import { Badge } from "@/shared/components/ui/badge";
import PrintBukti from "@/modules/timbangan/timbangan/components/PrintBukti";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

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
    handleBypassSubmit,
    lastSubmittedData,
    clearLastSubmittedData,
  } = useTimbanganHooks();

  const scale = useWebSerialScale();
  const rfid = useRFIDWebSerial();

  // State untuk active tab
  const [activeTab, setActiveTab] = useState("timbangan");

  // Refs for focusing inputs
  const hullNoInputRef = useRef(null);
  const grossWeightInputRef = useRef(null);
  const netWeightInputRef = useRef(null);
  const printButtonRef = useRef(null);
  const bypassHullNoInputRef = useRef(null);

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
      scale.lockedWeight &&
      activeTab === "timbangan"
    ) {
      const scaleWeightInTons = parseFloat(scale.lockedWeight) / 1000;

      if (
        !isNaN(scaleWeightInTons) &&
        scaleWeightInTons <= WEIGHT_LIMITS.GROSS.MAX
      ) {
        setFormData((prev) => ({
          ...prev,
          gross_weight: scaleWeightInTons.toFixed(2),
        }));
      } else {
        console.warn("⚠️ Scale weight exceeds limit:", scaleWeightInTons);
      }
    }
  }, [
    scale.lockedWeight,
    scale.currentWeight,
    scale.isStable,
    scale.isConnected,
    isOperator,
    activeTab,
  ]);

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


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only handle shortcuts when not in an input field
      const isInInput =
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable;

      if (activeTab === "timbangan") {
        // Alt + D -> Focus Hull No
        if (e.altKey && e.key.toLowerCase() === "d") {
          e.preventDefault();
          hullNoInputRef.current?.focus();
        }

        // Alt + T -> Focus Gross Weight (Operator only)
        if (isOperator && e.altKey && e.key.toLowerCase() === "t") {
          e.preventDefault();
          grossWeightInputRef.current?.focus();
        }

        // Alt + N -> Focus Net Weight (Checkpoint only)
        if (!isOperator && e.altKey && e.key.toLowerCase() === "n") {
          e.preventDefault();
          netWeightInputRef.current?.focus();
        }

        // Alt + S or Ctrl + Enter -> Submit
        if (
          (e.altKey && e.key.toLowerCase() === "s") ||
          (e.ctrlKey && e.key === "Enter")
        ) {
          e.preventDefault();
          handleSubmit();
        }
      } else if (activeTab === "bypass") {
        // Alt + D -> Focus Hull No in Bypass
        if (e.altKey && e.key.toLowerCase() === "d") {
          e.preventDefault();
          bypassHullNoInputRef.current?.focus();
        }

        // Alt + S or Ctrl + Enter -> Submit Bypass
        if (
          (e.altKey && e.key.toLowerCase() === "s") ||
          (e.ctrlKey && e.key === "Enter")
        ) {
          e.preventDefault();
          handleBypassSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOperator, activeTab, handleSubmit, handleBypassSubmit]);

  return (
    <Card className="shadow-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-colors">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <CardHeader className="border-b border-gray-200 dark:border-gray-800 ">
          {/* Row 1: Title-as-Tabs + Hardware Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Left: Title merged with Tabs */}
            <TabsList className="h-auto bg-transparent p-0 gap-0 shrink-0">
              <TabsTrigger
                value="timbangan"
                className="flex items-center gap-2 px-0 pr-5 text-xl font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-600 dark:data-[state=inactive]:hover:text-gray-400 transition-colors rounded-none border-b-2  data-[state=inactive]:border-transparent pb-1 cursor-pointer"
              >
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Timbangan
              </TabsTrigger>
              <TabsTrigger
                value="bypass"
                className="flex items-center gap-2 px-0 pl-5 text-xl font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 data-[state=inactive]:text-gray-400 dark:data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-600 dark:data-[state=inactive]:hover:text-gray-400 transition-colors rounded-none border-b-2  data-[state=inactive]:border-transparent pb-1 cursor-pointer"
              >
                <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                Bypass
              </TabsTrigger>
            </TabsList>

            {/* Right: Hardware Controls */}
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

              {/* RFID Connection - DISABLED (Display only) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {}} // ❌ Disabled - no action
                disabled={true}
                className="text-xs flex items-center gap-1.5 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
                title="RFID sementara dinonaktifkan - Fokus ke Integrator"
              >
                <Radio className="w-3 h-3" />
                RFID (Disabled)
              </Button>
            </div>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="mt-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
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
        </CardHeader>

        <CardContent>

          {/* Tab Timbangan - Form Lengkap */}
          <TabsContent value="timbangan">
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
                        ref={hullNoInputRef}
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
                <div className={`space-y-2 ${isOperator ? "order-1" : "order-2"}`}>
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
                <div className="space-y-2 order-2">
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
                <div className={`space-y-2 ${isOperator ? "order-3" : "order-1"}`}>
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
          </TabsContent>

          {/* Tab Bypass - Hanya Pilih DT */}
          <TabsContent value="bypass">
            <form onSubmit={(e) => { e.preventDefault(); handleBypassSubmit(); }} className="space-y-4">
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
                      ref={bypassHullNoInputRef}
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
              </div>

              {/* Preview Info Bypass */}
              {formData.hull_no && formData.bypass_tonnage && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Preview Bypass
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">Hull No:</span>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                        {formData.hull_no}
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">Company:</span>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                        {formData.company || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">Bypass Tonnage:</span>
                      <p className="font-bold text-lg text-blue-900 dark:text-blue-100">
                        {formData.bypass_tonnage} ton
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">SPPH:</span>
                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                        {formData.spph || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 
                text-white font-medium
                shadow-sm hover:shadow-md
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !formData.hull_no || !formData.bypass_tonnage}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      <p className="hidden md:inline">Simpan Bypass</p>
                      <span className="md:ml-2 text-xs opacity-75">
                        (Alt+S / Ctrl+Enter)
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </CardContent>

        {/* Operator name automatically retrieved from localStorage ("operator_sib_name") */}
        {lastSubmittedData && (
          <div style={{ display: "none" }}>
            <PrintBukti
              ref={printButtonRef}
              data={lastSubmittedData}
              autoPrint={false} 
            />
          </div>
        )}
      </Tabs>
    </Card>
  );
};