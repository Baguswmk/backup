import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

const SupervisorInputModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [supervisor, setSupervisor] = useState('');

  const handleSubmit = () => {
    if (supervisor.trim()) {
      onConfirm(supervisor.trim());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && supervisor.trim()) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
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
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
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
            onClick={onClose}
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
            {isLoading ? 'Memproses...' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupervisorInputModal;