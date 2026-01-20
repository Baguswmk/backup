import React from "react";
import { Loader2 } from "lucide-react";

const LoadingOverlay = ({ isVisible, message = "Memproses..." }) => {
  if (!isVisible) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3 shadow-xl">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="font-medium dark:text-gray-200">{message}</span>
      </div>
    </div>
  );
};

export default LoadingOverlay;