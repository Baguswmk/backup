import React, { useEffect, useMemo } from "react";
import LaporanCard from "@/modules/timbangan/laporan/components/LaporanCard";
import { useLaporan } from "@/modules/timbangan/laporan/hooks/useLaporan";
import { LAPORAN_CONFIG } from "@/modules/timbangan/laporan/config/LaporanConfig";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";

const LaporanManagement = () => {
  const { downloadLaporan, isFormatDownloading } = useLaporan();

  const {
    data: dumpTruckData,
    isLoading: isLoadingUnits,
    loadData: loadUnits,
  } = useMasterData("units");

  useEffect(() => {
    loadUnits(false);
  }, [loadUnits]);

  const dumpTruckOptions = useMemo(() => {
    if (!Array.isArray(dumpTruckData)) return [];

    return dumpTruckData
      .filter((unit) => unit.type === "DUMP_TRUCK")
      .map((unit) => ({
        value: unit.hull_no,
        label: unit.hull_no,
        hint: unit.company || "-",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [dumpTruckData]);

  const handleDownload = async (type, format, params) => {
    await downloadLaporan(type, {
      startDate: params.startDate,
      endDate: params.endDate,
      shift: params.shift,
      format,
      spph: params.spph,
      unit_dump_truck: params.unit_dump_truck,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen bg-neutral-50 dark:bg-gray-900">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Laporan Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Download laporan dalam format PDF, Excel, atau CSV
        </p>
      </div>

      {/* Loading State */}
      {isLoadingUnits && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-400">
            ⏳ Memuat data unit dump truck...
          </p>
        </div>
      )}

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
            dumpTruckOptions={dumpTruckOptions}
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
        <div className="text-center py-12 bg-neutral-50 dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400">
            Tidak ada laporan yang tersedia
          </p>
        </div>
      )}
    </div>
  );
};

export default LaporanManagement;
