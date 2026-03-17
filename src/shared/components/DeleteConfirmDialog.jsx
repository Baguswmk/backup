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
 * DeleteConfirmDialog - Enhanced version with split group delete support
 *
 * @param {boolean} isOpen - Controls dialog visibility
 * @param {function} onClose - Callback when dialog is closed
 * @param {function} onConfirm - Callback when action is confirmed
 * @param {object|array} target - Target fleet(s): single object or array of fleets
 * @param {number} assignedCount - Total number of assigned dumptrucks
 * @param {boolean} isProcessing - Whether the action is being processed
 * @param {string} actionType - Type of action: "delete" | "split" | "delete-split-group"
 * @param {object} customConfig - Optional custom configuration
 */
const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  target,
  assignedCount = 0,
  isProcessing = false,
  actionType = "delete",
  customConfig = {},
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [showFleetDetails, setShowFleetDetails] = useState(false);

  // Detect if target is multiple fleets
  const isMultipleFleets = Array.isArray(target);
  const fleetsToProcess = isMultipleFleets ? target : target ? [target] : [];
  const fleetCount = fleetsToProcess.length;

  // Configuration based on action type
  const defaultConfigs = {
    delete: {
      title: "Hapus Konfigurasi",
      icon: Trash2,
      iconBgColor: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      progressColor: "bg-red-600 dark:bg-red-700",
      warningMessage:
        "Penghapusan ini bersifat permanen dan tidak dapat dibatalkan.",
      assignedWarningText: "Konfigurasi ini memiliki",
      confirmButtonText: "Hapus",
      confirmButtonColor:
        "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
      step1Question:
        "Langkah 1: Apakah Anda yakin akan menghapus konfigurasi ini?",
      step1YesText: "Ya, Hapus",
      step1NoText: "Tidak",
      step1CancelMessage:
        'Penghapusan dibatalkan. Klik tombol "Batal" untuk menutup dialog.',
      reasonsTitle: "Langkah 3: Pilih alasan penghapusan (minimal 1):",
      processingText: "Menghapus...",
      reasonOptions: [
        {
          id: "reason-request-head",
          label:
            "Penghapusan dilakukan atas permintaan dan persetujuan Sub Section Head terkait",
        },
        {
          id: "reason-misconfiguration",
          label:
            "Penghapusan dilakukan karena terdapat kesalahan pengaturan (misconfiguration) pada setting fleet",
        },
        {
          id: "reason-change-request",
          label:
            "Penghapusan dilakukan sebagai bagian dari permintaan perubahan atau pembaruan setting fleet",
        },
        {
          id: "reason-evaluation",
          label:
            "Penghapusan dilakukan berdasarkan hasil evaluasi internal terhadap kebutuhan operasional",
        },
      ],
    },
    split: {
      title: "Split Konfigurasi Fleet",
      icon: Scissors,
      iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      progressColor: "bg-blue-600 dark:bg-blue-700",
      warningMessage:
        "Fleet akan dipisah menjadi konfigurasi baru. Pastikan data yang Anda masukkan sudah benar.",
      assignedWarningText: "Konfigurasi ini akan memisahkan",
      confirmButtonText: "Split",
      confirmButtonColor:
        "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
      step1Question:
        "Langkah 1: Apakah Anda yakin akan melakukan split pada konfigurasi fleet ini?",
      step1YesText: "Ya, Split",
      step1NoText: "Tidak",
      step1CancelMessage:
        'Split dibatalkan. Klik tombol "Batal" untuk menutup dialog.',
      reasonsTitle: "Langkah 3: Pilih alasan split (minimal 1):",
      processingText: "Memproses Split...",
      reasonOptions: [
        {
          id: "reason-request-head-split",
          label:
            "Split dilakukan atas permintaan dan persetujuan Sub Section Head terkait",
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
          label:
            "Split dilakukan sebagai bagian dari restrukturisasi setting fleet",
        },
      ],
    },
    "delete-split-group": {
      title: "Hapus Grup Fleet Split",
      icon: Trash2,
      iconBgColor: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      progressColor: "bg-orange-600 dark:bg-orange-700",
      warningMessage:
        "Anda akan menghapus SEMUA konfigurasi fleet dalam grup split ini. Penghapusan bersifat permanen dan tidak dapat dibatalkan.",
      assignedWarningText: "Total dumptruck dari seluruh grup:",
      confirmButtonText: "Hapus Semua Fleet",
      confirmButtonColor:
        "bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800",
      step1Question:
        "Langkah 1: Apakah Anda yakin akan menghapus SEMUA fleet dalam grup split ini?",
      step1YesText: "Ya, Hapus Semua",
      step1NoText: "Tidak",
      step1CancelMessage:
        'Penghapusan grup dibatalkan. Klik tombol "Batal" untuk menutup dialog.',
      reasonsTitle: "Langkah 3: Pilih alasan penghapusan grup (minimal 1):",
      processingText: "Menghapus grup fleet...",
      reasonOptions: [
        {
          id: "reason-request-head-group",
          label:
            "Penghapusan grup dilakukan atas permintaan dan persetujuan Sub Section Head terkait",
        },
        {
          id: "reason-reconfig-group",
          label:
            "Penghapusan grup dilakukan untuk rekonfigurasi ulang setting fleet",
        },
        {
          id: "reason-consolidate-group",
          label: "Penghapusan grup dilakukan untuk konsolidasi fleet",
        },
        {
          id: "reason-operational-change",
          label:
            "Penghapusan grup dilakukan karena perubahan kebutuhan operasional",
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
        (id) => config.reasonOptions.find((r) => r.id === id)?.label,
      ),
      fleetsToProcess, // Pass the fleets for processing
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

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReasonToggle = (reasonId) => {
    setSelectedReasons((prev) => {
      if (prev.includes(reasonId)) {
        return prev.filter((id) => id !== reasonId);
      }
      return [...prev, reasonId];
    });
  };

  const canProceedStep1 = confirmAction === "yes";
  const canProceedStep2 = selectedDay === getCurrentDay();
  const canProceedStep3 = selectedReasons.length > 0;

  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 detail-modal"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.iconBgColor}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div>
              <h2
                id="dialog-title"
                className="text-xl font-bold text-gray-900 dark:text-white"
              >
                {config.title}
              </h2>
              {isMultipleFleets && actionType === "delete-split-group" && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {fleetCount} fleet akan dihapus
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isProcessing}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all duration-200 ${
                      currentStep >= step
                        ? `${config.progressColor} text-white`
                        : "bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {step}
                  </div>
                  <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                    {step === 1
                      ? "Konfirmasi"
                      : step === 2
                        ? "Verifikasi"
                        : "Alasan"}
                  </span>
                </div>
                {step < 3 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-all duration-200 ${
                      currentStep > step
                        ? config.progressColor
                        : "bg-gray-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="space-y-4">
            {/* Warning Message & Fleet Info */}
            {currentStep === 1 && (
              <div className="space-y-3">
                <div className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 rounded-md border p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {config.warningMessage}
                    </p>
                  </div>
                </div>

                {/* Fleet Details */}
                {target && (
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Detail Fleet
                      </h3>
                      {fleetCount > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFleetDetails(!showFleetDetails)}
                          className="text-xs h-6 px-2 dark:text-neutral-50"
                        >
                          {showFleetDetails ? "Sembunyikan" : "Lihat Detail"}
                        </Button>
                      )}
                    </div>

                    {isMultipleFleets && actionType === "delete-split-group" ? (
                      // Multiple Fleets Info
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Grup Fleet Split ({fleetCount} fleet)
                            </p>

                            {showFleetDetails && (
                              <div className="mt-2 space-y-2">
                                {fleetsToProcess.map((fleet, idx) => (
                                  <div
                                    key={fleet.id}
                                    className="bg-white dark:bg-slate-900/50 rounded p-3 border border-gray-200 dark:border-slate-700"
                                  >
                                    <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
                                      <div className="flex items-center gap-2 font-semibold text-sm">
                                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                          Fleet #{idx + 1}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Pickaxe className="w-3 h-3 text-gray-500" />
                                        <span className="font-medium">
                                          Excavator:
                                        </span>
                                        <span>{fleet.excavator}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Navigation className="w-3 h-3 text-gray-500" />
                                        <span className="font-medium">
                                          Loading:
                                        </span>
                                        <span>{fleet.loadingLocation}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-gray-500" />
                                        <span className="font-medium">
                                          Dumping:
                                        </span>
                                        <span>{fleet.dumpingLocation}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Truck className="w-3 h-3 text-gray-500" />
                                        <span className="font-medium">
                                          Dumptruck:
                                        </span>
                                        <span className="font-semibold">
                                          {fleet.dumptruckCount ||
                                            fleet.units?.length ||
                                            0}{" "}
                                          unit
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!showFleetDetails && (
                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                Klik "Lihat Detail" untuk melihat rincian setiap
                                fleet
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Single Fleet Info
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Pickaxe className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Excavator:
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {fleetsToProcess[0]?.excavator || "-"}
                          </span>

                          <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Loading:
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {fleetsToProcess[0]?.loadingLocation || "-"}
                          </span>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Dumping:
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {fleetsToProcess[0]?.dumpingLocation || "-"}
                          </span>

                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Dumptruck:
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {fleetsToProcess[0]?.dumptruckCount ||
                              fleetsToProcess[0]?.units?.length ||
                              0}{" "}
                            unit
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Assigned Count Warning */}
                {assignedCount > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 rounded-md border p-3">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        {config.assignedWarningText}{" "}
                        <span className="font-semibold">
                          {assignedCount} dumptruck
                        </span>
                        {isMultipleFleets && " dari seluruh grup"} yang terikat.
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
    </div>
  );
};

export default DeleteConfirmDialog;
