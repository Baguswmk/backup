import { offlineService } from '@/shared/services/offlineService';
import { logger } from '@/shared/services/log'; // ✅ ADDED
import { createValidationError } from '@/shared/utils/errorHandler'; // ✅ ADDED

/**
 * Laporan Service
 * Service untuk handle download laporan dalam bentuk PDF atau Excel
 * Reusable untuk berbagai jenis laporan
 */

/**
 * ✅ ADDED - Validate download parameters
 */
const validateDownloadParams = (params) => {
  const { startDate, endDate, format } = params;
  
  if (!startDate || !endDate) {
    throw createValidationError('Tanggal harus dipilih');
  }
  
  if (!format || !['pdf', 'excel', 'csv'].includes(format)) {
    throw createValidationError('Format laporan tidak valid');
  }
  
  return true;
};

/**
 * Generic Download Handler
 * Reusable function untuk download file dari API
 */
const downloadFileFromAPI = async (endpoint, params, defaultFilename) => {
  try {
    // ✅ Validate params
    validateDownloadParams(params);
    
    const { startDate, endDate, shift, format } = params;
    
    logger.info(`📥 Downloading laporan from ${endpoint}`, {
      startDate,
      endDate,
      shift,
      format
    });
    
    const response = await offlineService.get(endpoint, {
      params: {
        startDate,
        endDate,
        shift,
        format,
      },
      responseType: 'blob', // Important untuk file download
    });

    // Extract filename dari response header
    const contentDisposition = response.headers['content-disposition'];
    let filename = defaultFilename;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // ✅ IMPROVED - Better MIME type handling
    const mimeTypes = {
      pdf: 'application/pdf',
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    const mimeType = mimeTypes[format] || mimeTypes.excel;
    
    // Create blob dan trigger download
    const blob = new Blob([response.data], { type: mimeType });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    logger.info(`✅ Laporan downloaded successfully`, {
      filename,
      endpoint,
      format
    });

    return {
      success: true,
      filename,
      message: 'Laporan berhasil diunduh'
    };
  } catch (error) {
    logger.error(`❌ Error downloading from ${endpoint}`, {
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
   * Download Laporan Tonase SPPH
   */
  downloadLaporanSPPH: async (params) => {
    const { startDate, endDate, format } = params;
    const filename = `laporan-tonase-spph-${startDate}-${endDate}.${format}`;
    return downloadFileFromAPI('/laporan/tonase-spph', params, filename);
  },

  /**
   * Download Laporan Tonase Dump Truck
   */
  downloadLaporanDumpTruck: async (params) => {
    const { startDate, endDate, format } = params;
    const filename = `laporan-tonase-dump-truck-${startDate}-${endDate}.${format}`;
    return downloadFileFromAPI('/laporan/tonase-dump-truck', params, filename);
  },

  // ==================== TEMPLATE UNTUK LAPORAN BARU ====================
  // Copy paste template ini dan sesuaikan
  /*
  downloadLaporanNamaLaporan: async (params) => {
    const { startDate, endDate, format } = params;
    const filename = `laporan-nama-${startDate}-${endDate}.${format}`;
    return downloadFileFromAPI('/laporan/endpoint-api', params, filename);
  },
  */

  /**
   * Preview Laporan (Optional - jika ada endpoint preview)
   */
  previewLaporan: async (endpoint, params) => {
    try {
      const { startDate, endDate, shift } = params;
      
      logger.info(`👁️ Previewing laporan from ${endpoint}`, {
        startDate,
        endDate,
        shift
      });
      
      const response = await offlineService.get(endpoint, {
        params: {
          startDate,
          endDate,
          shift,
        },
      });

      logger.info(`✅ Laporan preview loaded`, { endpoint });
      return response.data;
    } catch (error) {
      logger.error(`❌ Error preview laporan from ${endpoint}`, {
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