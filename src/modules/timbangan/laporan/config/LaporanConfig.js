import { useState, useCallback } from 'react';
import laporanService from '@/modules/timbangan/laporan/services/laporanService';
import { showToast } from '@/shared/utils/toast';
import { withErrorHandling, createValidationError } from '@/shared/utils/errorHandler';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
/**
 * Validate laporan download parameters
 */
const validateLaporanParams = (params) => {
  const { startDate, endDate, format, type } = params;

  if (!startDate || !endDate) {
    throw createValidationError('Tanggal harus dipilih');
  }

  if (!format) {
    throw createValidationError('Format laporan harus dipilih');
  }

  if (!type) {
    throw createValidationError('Tipe laporan tidak valid');
  }

  return true;
};

/**
 * Custom Hook untuk Laporan Management
 * Handle download laporan PDF atau Excel dengan dynamic type
 */
export const useLaporan = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState(null); // 'produksi' | 'qc' | 'penjualan' | etc
  const [downloadFormat, setDownloadFormat] = useState(null); // 'pdf' | 'excel' | 'csv'

  /**
   * Generic Download Laporan
   * @param {string} type - Tipe laporan (produksi, qc, penjualan, dll)
   * @param {Object} params - { startDate, endDate, shift, format }
   */
  const downloadLaporan = useCallback(async (type, params) => {
    const { startDate, endDate, shift, format } = params;

    // ✅ Validate params
    try {
      validateLaporanParams({ startDate, endDate, format, type });
    } catch (validationError) {
      showToast.error(validationError.message);
      return { success: false, error: validationError.message };
    }

    setIsDownloading(true);
    setDownloadType(type);
    setDownloadFormat(format);

    const loadingToast = showToast.loading(
      `Mengunduh laporan ${type} (${format.toUpperCase()})...`
    );

    // ✅ REFACTORED - Use withErrorHandling
    return await withErrorHandling(
      async () => {
        let result;

        // Dynamic service call berdasarkan type
        switch (type) {
          case 'spph':
            result = await laporanService.downloadLaporanSPPH({
              startDate,
              endDate,
              shift: shift || 'All',
              format,
            });
            break;

          case 'dump-truck':
            result = await laporanService.downloadLaporanDumpTruck({
              startDate,
              endDate,
              shift: shift || 'All',
              format,
            });
            break;

          // ==================== TEMPLATE UNTUK LAPORAN BARU ====================
          // Tambahkan case baru disini
          /*
          case 'tipe-laporan-baru':
            result = await laporanService.downloadLaporanNamaLaporan({
              startDate,
              endDate,
              shift: shift || 'All',
              format,
            });
            break;
          */

          default:
            throw new Error(`Tipe laporan '${type}' tidak dikenali`);
        }

        showToast.safeDismiss(loadingToast);
        return result;
      },
      {
        operation: `download laporan ${type}`,
        showSuccessToast: true,
        successMessage: `Laporan berhasil diunduh`,
        onError: () => {
          showToast.safeDismiss(loadingToast);
        }
      }
    ).finally(() => {
      setIsDownloading(false);
      setDownloadType(null);
      setDownloadFormat(null);
    });
  }, []);



  /**
   * Shortcut: Download Laporan SPPH
   */
  const downloadLaporanSPPH = useCallback(async (params) => {
    return downloadLaporan('spph', params);
  }, [downloadLaporan]);

  /**
   * Shortcut: Download Laporan Dump Truck
   */
  const downloadLaporanDumpTruck = useCallback(async (params) => {
    return downloadLaporan('dump-truck', params);
  }, [downloadLaporan]);

  /**
   * Check if specific type is downloading
   */
  const isTypeDownloading = useCallback((type) => {
    return isDownloading && downloadType === type;
  }, [isDownloading, downloadType]);

  /**
   * Check if specific format is downloading for a type
   */
  const isFormatDownloading = useCallback((type, format) => {
    return isDownloading && downloadType === type && downloadFormat === format;
  }, [isDownloading, downloadType, downloadFormat]);

  return {
    isDownloading,
    downloadType,
    downloadFormat,
    downloadLaporan, // Generic method untuk semua tipe
    downloadLaporanSPPH, // Shortcut
    downloadLaporanDumpTruck, // Shortcut
    isTypeDownloading,
    isFormatDownloading,
  };
};

  
export const LAPORAN_CONFIG = [
  {
    id: 'tonase-spph',
    type: 'spph', // digunakan untuk mapping ke service method
    title: 'Laporan Tonase SPPH',
    description: 'Download laporan tonase SPPH berdasarkan tanggal dan shift',
    icon: FileText,
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    downloadFormats: [
      { 
        value: 'pdf', 
        label: 'PDF', 
        icon: FileText, 
        color: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' 
      },
      { 
        value: 'excel', 
        label: 'Excel', 
        icon: FileSpreadsheet, 
        color: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800' 
      },
    ],
  },
  {
    id: 'tonase-dump-truck',
    type: 'dump-truck', // digunakan untuk mapping ke service method
    title: 'Laporan Tonase Dump Truck',
    description: 'Download laporan tonase Dump Truck berdasarkan tanggal dan shift',
    icon: Download,
    iconBgColor: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    downloadFormats: [
      { 
        value: 'pdf', 
        label: 'PDF', 
        icon: FileText, 
        color: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' 
      },
      { 
        value: 'excel', 
        label: 'Excel', 
        icon: FileSpreadsheet, 
        color: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800' 
      },
    ],
  },
  
  // ==================== TEMPLATE UNTUK LAPORAN BARU ====================
  // Copy paste template ini dan sesuaikan dengan kebutuhan
  /*
  {
    id: 'nama-laporan',           // ID unik untuk laporan
    type: 'tipe-laporan',         // Digunakan untuk mapping ke service method
    title: 'Judul Laporan',
    description: 'Deskripsi laporan',
    icon: FileText,               // Icon dari lucide-react
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    downloadFormats: [
      { 
        value: 'pdf', 
        label: 'PDF', 
        icon: FileText, 
        color: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' 
      },
      { 
        value: 'excel', 
        label: 'Excel', 
        icon: FileSpreadsheet, 
        color: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800' 
      },
      // Optional: tambahkan format lain seperti CSV
      // { 
      //   value: 'csv', 
      //   label: 'CSV', 
      //   icon: FileText, 
      //   color: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800' 
      // },
    ],
  },
  */
];

/**
 * Get laporan config by ID
 */
export const getLaporanById = (id) => {
  return LAPORAN_CONFIG.find(laporan => laporan.id === id);
};

/**
 * Get laporan config by type
 */
export const getLaporanByType = (type) => {
  return LAPORAN_CONFIG.find(laporan => laporan.type === type);
};
