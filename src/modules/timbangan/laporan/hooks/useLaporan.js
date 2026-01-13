import { useState, useCallback } from 'react';
import laporanService from '@/modules/timbangan/laporan/services/laporanService';
import { showToast } from '@/shared/utils/toast';

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

    // Validasi
    if (!startDate || !endDate) {
      showToast.error('Tanggal harus dipilih');
      return;
    }

    if (!format) {
      showToast.error('Format laporan harus dipilih');
      return;
    }

    if (!type) {
      showToast.error('Tipe laporan tidak valid');
      return;
    }

    setIsDownloading(true);
    setDownloadType(type);
    setDownloadFormat(format);

    const loadingToast = showToast.loading(
      `Mengunduh laporan ${type} (${format.toUpperCase()})...`
    );

    try {
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
      showToast.success(`Laporan berhasil diunduh: ${result.filename}`);
      
      return result;
    } catch (error) {
      showToast.safeDismiss(loadingToast);
      showToast.error(error.message || `Gagal mengunduh laporan ${type}`);
      throw error;
    } finally {
      setIsDownloading(false);
      setDownloadType(null);
      setDownloadFormat(null);
    }
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