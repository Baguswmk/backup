import { offlineService } from '@/shared/services/offlineService';
import { logger } from '@/shared/services/log';
import { createValidationError } from '@/shared/utils/errorHandler';
import { generateFile } from '@/modules/timbangan/laporan/services/fileGeneratorService';

/**
 * Laporan Service
 * ✅ UPDATED - Fetch data dari backend, generate file di frontend
 */

/**
 * Validate download parameters
 */
const validateDownloadParams = (params) => {
  const { date, shift, format } = params;
  
  if (!date) {
    throw createValidationError('Tanggal harus dipilih');
  }
  
  if (!shift) {
    throw createValidationError('Shift harus dipilih');
  }
  
  if (!format || !['pdf', 'excel', 'csv'].includes(format)) {
    throw createValidationError('Format laporan tidak valid');
  }
  
  return true;
};

/**
 * ✅ NEW - Fetch data dan generate file di frontend
 */
const fetchDataAndGenerateFile = async (endpoint, params) => {
  try {
    validateDownloadParams(params);
    
    const { date, shift, format } = params;
    
    logger.info(`📥 Fetching report data from ${endpoint}`, {
      date,
      shift,
      format
    });
    
    // ✅ 1. Fetch data JSON dari backend
    const response = await offlineService.get(endpoint, {
      params: {
        date,
        shift,
      },
    });

    const data = response.data?.data || response.data;

    if (!data || data.length === 0) {
      throw new Error('Tidak ada data untuk periode yang dipilih');
    }

    logger.info(`✅ Data fetched: ${data.length} records`);

    // ✅ 2. Generate file di frontend menggunakan fileGeneratorService
    const result = generateFile(data, format, { date, shift });

    logger.info(`✅ File generated successfully`, {
      filename: result.filename,
      format
    });

    return {
      success: true,
      filename: result.filename,
      message: 'Laporan berhasil diunduh',
      totalRecords: data.length,
    };
  } catch (error) {
    logger.error(`❌ Error generating report from ${endpoint}`, {
      error: error.message,
      params
    });
    
    throw {
      message: error.message || error.response?.data?.message || 'Gagal mengunduh laporan',
      status: error.response?.status
    };
  }
};

const laporanService = {
  /**
   * ✅ Download Laporan Generic
   * Endpoint: /v1/custom/report
   */
  downloadLaporan: async (params) => {
    return fetchDataAndGenerateFile('/v1/custom/report', params);
  },

  /**
   * Download Laporan SPPH
   */
  downloadLaporanSPPH: async (params) => {
    return fetchDataAndGenerateFile('/v1/custom/report', params);
  },

  /**
   * Download Laporan Dump Truck
   */
  downloadLaporanDumpTruck: async (params) => {
    return fetchDataAndGenerateFile('/v1/custom/report', params);
  },

  // ==================== TEMPLATE UNTUK LAPORAN BARU ====================
  /*
  downloadLaporanCustom: async (params) => {
    return fetchDataAndGenerateFile('/v1/custom/report', params);
  },
  */

  /**
   * Preview Laporan (Get data only, no file generation)
   */
  previewLaporan: async (params) => {
    try {
      const { date, shift } = params;
      
      logger.info(`👁️ Previewing laporan`, { date, shift });
      
      const response = await offlineService.get('/v1/custom/report', {
        params: {
          date,
          shift,
        },
      });

      const data = response.data?.data || response.data;

      logger.info(`✅ Laporan preview loaded: ${data?.length || 0} records`);
      return data;
    } catch (error) {
      logger.error(`❌ Error preview laporan`, {
        error: error.message
      });
      
      throw {
        message: error.response?.data?.message || 'Gagal memuat preview laporan',
        status: error.response?.status
      };
    }
  }
};

export default laporanService;