import React from 'react';
import LaporanCard from '@/modules/timbangan/laporan/components/LaporanCard';
import { useLaporan } from '@/modules/timbangan/laporan/hooks/useLaporan';
import { LAPORAN_CONFIG } from '@/modules/timbangan/laporan/config/LaporanConfig';

/**
 * ✅ UPDATED - Disesuaikan dengan backend params: date, shift, format
 */
const LaporanManagement = () => {
  const { downloadLaporan, isFormatDownloading } = useLaporan();

  /**
   * ✅ Handle download dengan params yang sesuai backend
   */
  const handleDownload = async (type, format, params) => {
    await downloadLaporan(type, {
      date: params.date,
      shift: params.shift,
      format,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Laporan Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Download laporan dalam format PDF, Excel, atau CSV
        </p>
      </div>

      {/* Cards Container - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {LAPORAN_CONFIG.map((laporan) => (
          <LaporanCard
            key={laporan.id}
            title={laporan.title}
            description={laporan.description}
            icon={laporan.icon}
            iconBgColor={laporan.iconBgColor}
            iconColor={laporan.iconColor}
            downloadFormats={laporan.downloadFormats}
            onDownload={(format, params) => 
              handleDownload(laporan.type, format, params)
            }
            isDownloading={(format) => 
              isFormatDownloading(laporan.type, format)
            }
          />
        ))}
      </div>

      {/* Info Box - Empty State */}
      {LAPORAN_CONFIG.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400">
            Tidak ada laporan yang tersedia
          </p>
        </div>
      )}
    </div>
  );
};

export default LaporanManagement;