import { offlineService } from "@/shared/services/offlineService";
import { logger } from "@/shared/services/log";
import { createValidationError } from "@/shared/utils/errorHandler";
import { generateFile } from "@/modules/timbangan/laporan/services/fileGeneratorService";

const validateDownloadParams = (params) => {
  const { startDate, endDate, shift, format } = params;

  if (!startDate) {
    throw createValidationError("Tanggal mulai harus dipilih");
  }

  if (!endDate) {
    throw createValidationError("Tanggal akhir harus dipilih");
  }

  if (!shift) {
    throw createValidationError("Shift harus dipilih");
  }

  if (!format || !["pdf", "excel", "csv"].includes(format)) {
    throw createValidationError("Format laporan tidak valid");
  }

  return true;
};

const fetchDataAndGenerateFile = async (endpoint, params, reportType) => {
  try {
    validateDownloadParams(params);

    const { startDate, endDate, shift, format, spph,type_report, unit_dump_truck } = params;

    logger.info(`🔥 Fetching report data from ${endpoint}`, {
      startDate,
      endDate,
      shift,
      format,
      spph,
      type_report,
      unit_dump_truck,
      reportType,
    });

    const queryParams = {
      startDate,
      endDate,
      shift,
    };

    if (spph) {
      queryParams.spph = spph;
    }

    if(type_report){
      queryParams.type_report= type_report;
    }

    if (unit_dump_truck) {
      queryParams.unit_dump_truck = unit_dump_truck;
    }

    const response = await offlineService.get(endpoint, {
      params: queryParams,
    });

    const data = response.data?.data || response.data;

    if (!data || data.length === 0) {
      throw new Error("Tidak ada data untuk periode yang dipilih");
    }

    logger.info(`✅ Data fetched: ${data.length} records`);

    const result = generateFile(
      data,
      format,
      {
        startDate,
        endDate,
        shift,
        spph,
        unit_dump_truck,
      },
      reportType 
    );

    logger.info(`✅ File generated successfully`, {
      filename: result.filename,
      format,
      reportType,
    });

    return {
      success: true,
      filename: result.filename,
      message: "Laporan berhasil diunduh",
      totalRecords: data.length,
    };
  } catch (error) {
    logger.error(`❌ Error generating report from ${endpoint}`, {
      error: error.message,
      params,
    });

    throw {
      message:
        error.message ||
        error.response?.data?.message ||
        "Gagal mengunduh laporan",
      status: error.response?.status,
    };
  }
};

const laporanService = {
  downloadLaporan: async (params) => {
    return fetchDataAndGenerateFile("/v1/custom/report", params, "spph");
  },

  downloadLaporanSPPH: async (params) => {
    return fetchDataAndGenerateFile("/v1/custom/report", params, "spph");
  },

  downloadLaporanDumpTruck: async (params) => {
    return fetchDataAndGenerateFile("/v1/custom/report", params, "dump-truck");
  },

  downloadLaporanSPPHRehandling: async (params) => {
    return fetchDataAndGenerateFile("/v1/custom/report", params, "spph-rehandling");
  },

  downloadLaporanDumpTruckRehandling: async (params) => {
    return fetchDataAndGenerateFile("/v1/custom/report", params, "dump-truck-rehandling");
  },

  previewLaporan: async (params) => {
    try {
      const { startDate, endDate, shift, spph, unit_dump_truck, type } = params;

      logger.info(`👁️ Previewing laporan`, {
        startDate,
        endDate,
        shift,
        spph,
        unit_dump_truck,
        type,
      });

      const queryParams = {
        startDate,
        endDate,
        shift,
      };

      if (spph) queryParams.spph = spph;
      if (unit_dump_truck) queryParams.unit_dump_truck = unit_dump_truck;
      if (type) queryParams.type = type;

      const response = await offlineService.get("/v1/custom/report", {
        params: queryParams,
      });

      const data = response.data?.data || response.data;

      logger.info(`✅ Laporan preview loaded: ${data?.length || 0} records`);
      return data;
    } catch (error) {
      logger.error(`❌ Error preview laporan`, {
        error: error.message,
      });

      throw {
        message:
          error.response?.data?.message || "Gagal memuat preview laporan",
        status: error.response?.status,
      };
    }
  },
};

export default laporanService;