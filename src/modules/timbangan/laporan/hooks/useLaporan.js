import { useState, useCallback } from "react";
import laporanService from "@/modules/timbangan/laporan/services/laporanService";
import { showToast } from "@/shared/utils/toast";

/**
 * ✅ UPDATED - Support date range & filters
 */
export const useLaporan = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadType, setDownloadType] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState(null);

  const downloadLaporan = useCallback(async (type, params) => {
    const { startDate, endDate, shift, format, spph, unit_dump_truck } = params;

    if (!startDate) {
      showToast.error("Tanggal mulai harus dipilih");
      return;
    }

    if (!endDate) {
      showToast.error("Tanggal akhir harus dipilih");
      return;
    }

    if (!shift) {
      showToast.error("Shift harus dipilih");
      return;
    }

    if (!format) {
      showToast.error("Format laporan harus dipilih");
      return;
    }

    if (!type) {
      showToast.error("Tipe laporan tidak valid");
      return;
    }

    setIsDownloading(true);
    setDownloadType(type);
    setDownloadFormat(format);

    const loadingToast = showToast.loading(
      `Mengunduh laporan ${type} (${format.toUpperCase()})...`,
    );

    try {
      let result;

      switch (type) {
        case "spph":
          result = await laporanService.downloadLaporanSPPH({
            startDate,
            endDate,
            shift,
            format,
            spph,
            unit_dump_truck,
          });
          break;

        case "dump-truck":
          result = await laporanService.downloadLaporanDumpTruck({
            startDate,
            endDate,
            shift,
            format,
            spph,
            unit_dump_truck,
          });
          break;

        default:
          result = await laporanService.downloadLaporan({
            startDate,
            endDate,
            shift,
            format,
            spph,
            unit_dump_truck,
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
  const downloadLaporanSPPH = useCallback(
    async (params) => {
      return downloadLaporan("spph", params);
    },
    [downloadLaporan],
  );

  /**
   * Shortcut: Download Laporan Dump Truck
   */
  const downloadLaporanDumpTruck = useCallback(
    async (params) => {
      return downloadLaporan("dump-truck", params);
    },
    [downloadLaporan],
  );

  /**
   * Check if specific type is downloading
   */
  const isTypeDownloading = useCallback(
    (type) => {
      return isDownloading && downloadType === type;
    },
    [isDownloading, downloadType],
  );

  /**
   * Check if specific format is downloading for a type
   */
  const isFormatDownloading = useCallback(
    (type, format) => {
      return (
        isDownloading && downloadType === type && downloadFormat === format
      );
    },
    [isDownloading, downloadType, downloadFormat],
  );

  return {
    isDownloading,
    downloadType,
    downloadFormat,
    downloadLaporan,
    downloadLaporanSPPH,
    downloadLaporanDumpTruck,
    isTypeDownloading,
    isFormatDownloading,
  };
};
