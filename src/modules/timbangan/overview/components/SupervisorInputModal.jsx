import React, { useState, useEffect } from "react";
import { X, FileText, MapPin } from "lucide-react";

const SupervisorInputModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  locationPairs = [],
}) => {
  const [supervisor, setSupervisor] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const hasMultipleLocations = locationPairs.length > 1;

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

  const handleSubmit = () => {
    if (supervisor.trim()) {
      onConfirm(supervisor.trim(), locationFilter);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && supervisor.trim()) {
      handleSubmit();
    }
  };

  const handleClose = () => {
    setSupervisor("");
    setLocationFilter("all");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Export PDF
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Filter — hanya tampil kalau >1 pasangan lokasi */}
        {hasMultipleLocations && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1 text-green-600" />
              Filter Lokasi <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto scrollbar-thin">
              {/* Semua Lokasi */}
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="locationFilter"
                  value="all"
                  checked={locationFilter === "all"}
                  onChange={() => setLocationFilter("all")}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Semua Lokasi
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Gabungkan semua ritase (
                    {locationPairs.reduce((s, p) => s + p.count, 0)} ritase)
                  </p>
                </div>
              </label>

              {/* Per pasangan lokasi */}
              {locationPairs.map((pair, idx) => {
                const pairKey = `${pair.loading}|${pair.dumping}`;
                return (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="locationFilter"
                      value={pairKey}
                      checked={locationFilter === pairKey}
                      onChange={() => setLocationFilter(pairKey)}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                        <span className="text-blue-600 dark:text-blue-400 text-xs">
                          Loading:
                        </span>
                        <span className="truncate">{pair.loading}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                        <span className="text-green-600 dark:text-green-400 text-xs">
                          Dumping:
                        </span>
                        <span className="truncate">{pair.dumping}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {pair.count} ritase · {pair.totalTonase.toFixed(2)} ton
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Supervisor Input */}
        <div className="mb-6">
          <label
            htmlFor="supervisor"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Nama Supervisor Rehandling <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="supervisor"
            value={supervisor}
            onChange={(e) => setSupervisor(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Masukkan nama supervisor"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Nama ini akan ditampilkan pada bagian tanda tangan PDF
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            disabled={isLoading}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!supervisor.trim() || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {isLoading ? "Memproses..." : "Export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorInputModal;
