import { useState, useCallback } from 'react';
import laporanService from '@/modules/timbangan/laporan/services/laporanService';
import { showToast } from '@/shared/utils/toast';


export const useLaporan = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState(null);


  const downloadLaporan = useCallback(async (type, params) => {
    const { date, shift, format } = params;

    // Validasi
    if (!date) {
      showToast.error('Tanggal harus dipilih');
      return;
    }

    if (!shift) {
      showToast.error('Shift harus dipilih');
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
            date,
            shift,
            format,
          });
          break;

        case 'dump-truck':
          result = await laporanService.downloadLaporanDumpTruck({
            date,
            shift,
            format,
          });
          break;

        // ==================== TEMPLATE UNTUK LAPORAN BARU ====================
        /*
        case 'tipe-laporan-baru':
          result = await laporanService.downloadLaporanCustom({
            date,
            shift,
            format,
          });
          break;
        */

        default:
          // ✅ Fallback ke generic service
          result = await laporanService.downloadLaporan({
            date,
            shift,
            format,
          });
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