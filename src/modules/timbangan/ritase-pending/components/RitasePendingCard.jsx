import React from "react";
import { Clock, AlertCircle } from "lucide-react";

export const RitasePendingCard = () => {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ritase Pending CCR
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            Daftar ritase yang <span className="font-semibold">belum memiliki ID Setting Fleet</span> dan 
            masih dalam status <span className="font-semibold text-orange-600 dark:text-orange-400">pending</span> dalam 8 jam terakhir.
          </p>
          
          <div className="mt-3 flex items-start gap-2 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-600 dark:text-gray-400">
              Ritase yang sudah <span className="font-medium">terkirim</span> atau{" "}
              <span className="font-medium">tertolak</span> akan otomatis dihapus dari daftar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};