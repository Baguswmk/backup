import React, { useState, useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  AlertTriangle,
  Loader2,
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Scissors,
  Trash2,
  Info,
  Truck,
  MapPin,
  Pickaxe,
  Navigation,
} from "lucide-react";

/**
 * DeleteConfirmDialog - Enhanced version with split support and fleet details
 * 
 * @param {boolean} isOpen - Controls dialog visibility
 * @param {function} onClose - Callback when dialog is closed
 * @param {function} onConfirm - Callback when action is confirmed
 * @param {object} target - Target fleet configuration object
 * @param {number} assignedCount - Number of assigned dumptrucks
 * @param {boolean} isProcessing - Whether the action is being processed
 * @param {string} actionType - Type of action: "delete" | "split"
 * @param {object} customConfig - Optional custom configuration
 */
const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  target,
  assignedCount = 0,
  isProcessing = false,
  actionType = "delete", // "delete" or "split"
  customConfig = {},
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [showFleetDetails, setShowFleetDetails] = useState(false);

  // Configuration based on action type
  const defaultConfigs = {
    delete: {
      title: "Hapus Konfigurasi Fleet",
      icon: Trash2,
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      progressColor: "bg-red-600 dark:bg-red-700",
      warningMessage: "Penghapusan ini bersifat permanen dan tidak dapat dibatalkan.",
      assignedWarningText: "Konfigurasi ini memiliki",
      confirmButtonText: "Hapus",
      confirmButtonColor: "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
      step1Question: "Langkah 1: Apakah Anda yakin akan menghapus konfigurasi fleet ini?",
      step1YesText: "Ya, Hapus",
      step1NoText: "Tidak",
      step1CancelMessage: "Penghapusan dibatalkan. Klik tombol \"Batal\" untuk menutup dialog.",
      reasonsTitle: "Langkah 3: Pilih alasan penghapusan (minimal 1):",
      processingText: "Menghapus...",
      reasonOptions: [
        {
          id: "reason-request-head",
          label: "Penghapusan dilakukan atas permintaan dan persetujuan Sub Section Head terkait",
        },
        {
          id: "reason-misconfiguration",
          label: "Penghapusan dilakukan karena terdapat kesalahan pengaturan (misconfiguration) pada setting fleet",
        },
        {
          id: "reason-change-request",
          label: "Penghapusan dilakukan sebagai bagian dari permintaan perubahan atau pembaruan setting fleet",
        },
        {
          id: "reason-evaluation",
          label: "Penghapusan dilakukan berdasarkan hasil evaluasi internal terhadap kebutuhan operasional",
        },
      ],
    },
    split: {
      title: "Split Konfigurasi Fleet",
      icon: Scissors,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      progressColor: "bg-blue-600 dark:bg-blue-700",
      warningMessage: "Fleet akan dipisah menjadi konfigurasi baru. Pastikan data yang Anda masukkan sudah benar.",
      assignedWarningText: "Konfigurasi ini akan memisahkan",
      confirmButtonText: "Split",
      confirmButtonColor: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
      step1Question: "Langkah 1: Apakah Anda yakin akan melakukan split pada konfigurasi fleet ini?",
      step1YesText: "Ya, Split",
      step1NoText: "Tidak",
      step1CancelMessage: "Split dibatalkan. Klik tombol \"Batal\" untuk menutup dialog.",
      reasonsTitle: "Langkah 3: Pilih alasan split (minimal 1):",
      processingText: "Memproses Split...",
      reasonOptions: [
        {
          id: "reason-request-head-split",
          label: "Split dilakukan atas permintaan dan persetujuan Sub Section Head terkait",
        },
        {
          id: "reason-operational-split",
          label: "Split dilakukan untuk kebutuhan operasional yang berbeda",
        },
        {
          id: "reason-optimization-split",
          label: "Split dilakukan untuk optimalisasi pengaturan fleet",
        },
        {
          id: "reason-restructure-split",
          label: "Split dilakukan sebagai bagian dari restrukturisasi setting fleet",
        },
      ],
    },
  };

  // Merge custom config with default config
  const config = {
    ...defaultConfigs[actionType],
    ...customConfig,
  };

  const daysOfWeek = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];

  const getCurrentDay = () => {
    const days = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const today = new Date();
    return days[today.getDay()];
  };

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
    if (!isOpen) {
      setCurrentStep(1);
      setConfirmAction(null);
      setSelectedDay("");
      setSelectedReasons([]);
      setShowFleetDetails(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  const handleConfirm = () => {
    if (isProcessing) return;
    onConfirm({
      confirmAction,
      selectedDay,
      selectedReasons,
      reasonLabels: selectedReasons.map(
        (id) => config.reasonOptions.find((r) => r.id === id)?.label
      ),
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  const handleReasonToggle = (reasonId) => {
    setSelectedReasons((prev) =>
      prev.includes(reasonId)
        ? prev.filter((id) => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const canProceedStep1 = confirmAction === "yes";
  const canProceedStep2 = selectedDay === getCurrentDay();
  const canProceedStep3 = selectedReasons.length > 0;

  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedStep2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const IconComponent = config.icon;

  // Render Fleet Details Summary
  const renderFleetDetails = () => {
    if (!target) return null;

    return (
      <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4" />
              Detail Konfigurasi Fleet
            </h4>
            <button
              onClick={() => setShowFleetDetails(!showFleetDetails)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showFleetDetails ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>
        </div>

        {/* Content */}
        {showFleetDetails && (
          <div className="p-4 space-y-3">
            {/* Work Unit */}
            {target.workUnit && (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Truck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Satuan Kerja</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white break-words">
                    {target.workUnit}
                  </p>
                </div>
              </div>
            )}

            {/* Excavator */}
            {target.excavator && (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Pickaxe className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Excavator</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white break-words">
                    {target.excavator}
                  </p>
                  {target.excavatorCompany && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mitra: {target.excavatorCompany}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Loading Location */}
            {target.loadingLocation && (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Loading Point</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white break-words">
                    {target.loadingLocation}
                  </p>
                </div>
              </div>
            )}

            {/* Dumping Location */}
            {target.dumpingLocation && (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Navigation className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dumping Point</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white break-words">
                    {target.dumpingLocation}
                  </p>
                </div>
              </div>
            )}

            {/* Distance */}
            {target.distance && (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">KM</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Jarak</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {target.distance} KM
                  </p>
                </div>
              </div>
            )}

            {/* Fleet Composition */}
            {(target.tronton > 0 || target.trintin > 0) && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Komposisi Fleet</p>
                <div className="grid grid-cols-2 gap-2">
                  {target.tronton > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-md px-3 py-2 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Tronton</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {target.tronton}
                      </p>
                    </div>
                  )}
                  {target.trintin > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-md px-3 py-2 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Trintin</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {target.trintin}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Split Status */}
            {target.isSplit && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md px-3 py-2 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300 flex items-center gap-1">
                    <Scissors className="w-3 h-3" />
                    Fleet ini hasil dari split
                  </p>
                </div>
              </div>
            )}

            {/* Units List (if available) */}
            {target.units && target.units.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Dumptruck Terikat ({target.units.length})
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {target.units.map((unit, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900 rounded px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                    >
                      {unit.name || unit.code || unit}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm transition-all duration-200"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-neutral-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pb-2 px-6 pt-4 flex flex-row items-center justify-between transition-colors duration-200 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-neutral-50 dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2 transition-colors duration-200 text-gray-900 dark:text-white">
            <div className={`w-10 h-10 rounded-full ${config.iconBgColor} flex items-center justify-center shadow-sm`}>
              <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <span className="text-lg font-semibold block">
                {config.title}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {config.warningMessage}
              </span>
            </div>
          </div>
          <Button
            onClick={handleClose}
            disabled={isProcessing}
            className="h-8 w-8 flex items-center justify-center rounded-md cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200 transition-colors duration-200 border-0 bg-transparent"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4 pt-4 px-6 pb-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 pb-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                    currentStep === step
                      ? `${config.progressColor} text-white`
                      : currentStep > step
                        ? "bg-green-600 text-white dark:bg-green-700"
                        : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-400"
                  }`}
                >
                  {currentStep > step ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`w-8 h-0.5 transition-all duration-200 ${
                      currentStep > step
                        ? "bg-green-600 dark:bg-green-700"
                        : "bg-gray-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Target Information - Only on Step 1 */}
          {target && currentStep === 1 && (
            <div className="mb-4">
              <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {target.name || target.title || `${target.excavator || ''} - ${target.loadingLocation || 'Konfigurasi Fleet'}`}
                </p>
                {target.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {target.description}
                  </p>
                )}
              </div>

              {/* Fleet Details Summary - Collapsible */}
              {renderFleetDetails()}

              {/* Assigned Dumptrucks Warning */}
              {assignedCount > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 rounded-md border p-3 mt-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      {config.assignedWarningText}{" "}
                      {assignedCount || target.units?.length || 0} dumptruck
                      yang terikat.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Konfirmasi Ya/Tidak */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  {config.step1Question}
                </p>
                <div className="flex gap-3">
                  <Button
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 border ${
                      confirmAction === "yes"
                        ? `${config.confirmButtonColor} text-white border-transparent`
                        : "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                    }`}
                    onClick={() => setConfirmAction("yes")}
                  >
                    {config.step1YesText}
                  </Button>
                  <Button
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 border ${
                      confirmAction === "no"
                        ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 border-transparent"
                        : "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                    }`}
                    onClick={() => setConfirmAction("no")}
                  >
                    {config.step1NoText}
                  </Button>
                </div>
              </div>

              {confirmAction === "no" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-md border p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {config.step1CancelMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Verifikasi Hari */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Langkah 2: Hari apa hari ini?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {daysOfWeek.map((day) => (
                    <Button
                      key={day}
                      className={`px-4 py-2 rounded-md font-medium transition-all duration-200 border ${
                        selectedDay === day
                          ? day === getCurrentDay()
                            ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 border-transparent"
                            : "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800 border-transparent"
                          : "bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600"
                      }`}
                      onClick={() => setSelectedDay(day)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedDay && selectedDay !== getCurrentDay() && (
                <div className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 rounded-md border p-3">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    Jawaban tidak sesuai. Hari ini adalah {getCurrentDay()}.
                  </p>
                </div>
              )}

              {selectedDay === getCurrentDay() && (
                <div className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 rounded-md border p-3">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Jawaban benar! Klik "Lanjutkan" untuk melanjutkan.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Alasan */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  {config.reasonsTitle}
                </p>
                <div className="space-y-3">
                  {config.reasonOptions.map((reason) => (
                    <div
                      key={reason.id}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <Checkbox
                        id={reason.id}
                        checked={selectedReasons.includes(reason.id)}
                        onCheckedChange={() => handleReasonToggle(reason.id)}
                        disabled={isProcessing}
                        className="mt-0.5 cursor-pointer dark:text-gray-200"
                      />
                      <label
                        htmlFor={reason.id}
                        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none flex-1"
                      >
                        {reason.label}
                      </label>
                      {selectedReasons.includes(reason.id) && (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedReasons.length === 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-md border p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Pilih minimal satu alasan untuk melanjutkan.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {currentStep > 1 && (
              <Button
                className="w-full sm:w-auto px-4 py-2 rounded-md font-medium border border-gray-300 dark:border-slate-600 bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                onClick={handleBack}
                disabled={isProcessing}
              >
                <ChevronLeft className="w-4 h-4" />
                Kembali
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                className="w-full sm:flex-1 px-4 py-2 rounded-md font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-1 border-0"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedStep1) ||
                  (currentStep === 2 && !canProceedStep2)
                }
              >
                Lanjutkan
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                className={`w-full sm:flex-1 px-4 py-2 rounded-md font-medium ${config.confirmButtonColor} text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 border-0`}
                onClick={handleConfirm}
                disabled={isProcessing || !canProceedStep3}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {config.processingText}
                  </>
                ) : (
                  config.confirmButtonText
                )}
              </Button>
            )}

            <Button
              className="w-full sm:w-auto px-4 py-2 rounded-md font-medium bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 border-0"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Batal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;