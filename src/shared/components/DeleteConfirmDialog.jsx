import React, { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { AlertTriangle, Loader2, X, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  target,
  assignedCount = 0,
  isProcessing = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedReasons, setSelectedReasons] = useState([]);

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  const getCurrentDay = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = new Date();
    return days[today.getDay()];
  };

  const reasonOptions = [
    {
      id: 'reason-request-head',
      label: 'Penghapusan dilakukan atas permintaan dan persetujuan Sub Section Head terkait',
    },
    {
      id: 'reason-misconfiguration',
      label: 'Penghapusan dilakukan karena terdapat kesalahan pengaturan (misconfiguration) pada setting fleet',
    },
    {
      id: 'reason-change-request',
      label: 'Penghapusan dilakukan sebagai bagian dari permintaan perubahan atau pembaruan setting fleet',
    },
    {
      id: 'reason-evaluation',
      label: 'Penghapusan dilakukan berdasarkan hasil evaluasi internal terhadap kebutuhan operasional',
    },
  ];

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
      setConfirmDelete(null);
      setSelectedDay('');
      setSelectedReasons([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  const handleConfirm = () => {
    if (isProcessing) return;
    onConfirm();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const handleReasonToggle = (reasonId) => {
    setSelectedReasons(prev => 
      prev.includes(reasonId)
        ? prev.filter(id => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const canProceedStep1 = confirmDelete === 'yes';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm transition-all duration-200"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-lg transition-all duration-200 bg-neutral-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pb-2 px-6 pt-4 flex flex-row items-center justify-between transition-colors duration-200 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 transition-colors duration-200 text-gray-900 dark:text-white">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-lg font-semibold">Hapus Konfigurasi Fleet</span>
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
                      ? 'bg-red-600 text-white dark:bg-red-700'
                      : currentStep > step
                      ? 'bg-green-600 text-white dark:bg-green-700'
                      : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-400'
                  }`}
                >
                  {currentStep > step ? <CheckCircle2 className="w-4 h-4" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-8 h-0.5 transition-all duration-200 ${
                      currentStep > step
                        ? 'bg-green-600 dark:bg-green-700'
                        : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Fleet Information */}
          {target && (
            <div className="rounded-md border p-3 transition-all duration-200 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <div className="text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Excavator</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {target.excavator || target.fleet?.excavator || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dumptruck Terikat</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {assignedCount >= 0 ? assignedCount : target.units?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Lokasi Dumping</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {target.dumpingLocation || "-"}
                    
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Lokasi Loading</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {target.loadingLocation || "-"}
                    
                  </span>
                </div>
              </div>

              {(assignedCount > 0 || target.units?.length > 0) && (
                <div className="mt-3 transition-colors duration-200 border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Konfigurasi ini memiliki {assignedCount || target.units?.length || 0} dumptruck yang terikat.
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
                  Langkah 1: Apakah Anda yakin akan menghapus konfigurasi fleet ini?
                </p>
                <div className="flex gap-3">
                  <Button
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 border ${
                      confirmDelete === 'yes'
                        ? 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800 border-transparent'
                        : 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600'
                    }`}
                    onClick={() => setConfirmDelete('yes')}
                  >
                    Ya, Hapus
                  </Button>
                  <Button
                    className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 border ${
                      confirmDelete === 'no'
                        ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 border-transparent'
                        : 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600'
                    }`}
                    onClick={() => setConfirmDelete('no')}
                  >
                    Tidak
                  </Button>
                </div>
              </div>

              {confirmDelete === 'no' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 rounded-md border p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Penghapusan dibatalkan. Klik tombol "Batal" untuk menutup dialog.
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
                            ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 border-transparent'
                            : 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800 border-transparent'
                          : 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600'
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

          {/* Step 3: Alasan Penghapusan */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Langkah 3: Pilih alasan penghapusan (minimal 1):
                </p>
                <div className="space-y-3">
                  {reasonOptions.map((reason) => (
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
                    Pilih minimal satu alasan penghapusan untuk melanjutkan.
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
                className="w-full sm:flex-1 px-4 py-2 rounded-md font-medium bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2 border-0"
                onClick={handleConfirm}
                disabled={isProcessing || !canProceedStep3}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  "Hapus"
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