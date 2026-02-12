import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { showToast } from "@/shared/utils/toast";

const OperatorNameModal = ({ isOpen, onConfirm }) => {
  const [operatorName, setOperatorName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if operator name already exists in localStorage
    const savedName = localStorage.getItem("operator_sib_name");
    if (savedName) {
      setOperatorName(savedName);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!operatorName.trim()) {
      showToast.error("Nama operator (SIB) harus diisi");
      return;
    }

    if (operatorName.trim().length < 3) {
      showToast.error("Nama operator minimal 3 karakter");
      return;
    }

    setIsLoading(true);
    
    // Save to localStorage
    localStorage.setItem("operator_sib_name", operatorName.trim());
    
    setTimeout(() => {
      setIsLoading(false);
      showToast.success("Nama operator berhasil disimpan");
      onConfirm(operatorName.trim());
    }, 300);
  };

  const handleClear = () => {
    localStorage.removeItem("operator_sib_name");
    setOperatorName("");
    showToast.info("Nama operator dihapus");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Input Nama Operator
          </h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Masukkan nama operator sesuai SIB untuk digunakan pada pencetakan karcis
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="operatorName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Nama Operator (SIB) <span className="text-red-500">*</span>
            </label>
            <input
              id="operatorName"
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Contoh: Jamal Sunandar"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !operatorName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? "Menyimpan..." : "Simpan & Lanjutkan"}
            </button>
            
            {operatorName && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                Hapus
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default OperatorNameModal;