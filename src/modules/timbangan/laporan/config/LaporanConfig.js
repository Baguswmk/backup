import {
  FileText,
  FileSpreadsheet,
  Truck,
  Package,
  BarChart3,
  File,
  RefreshCw,
} from "lucide-react";

export const LAPORAN_CONFIG = [
  {
    id: "laporan-spph",
    type: "spph",
    title: "Laporan Tonase SPPH",
    description: "Laporan tonase produksi SPPH per tanggal dan shift",
    icon: Package,
    iconBgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    downloadFormats: [
      {
        value: "pdf",
        label: "PDF",
        icon: FileText,
        color:
          "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
      },
      {
        value: "excel",
        label: "Excel",
        icon: FileSpreadsheet,
        color:
          "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
      },
      {
        value: "csv",
        label: "CSV",
        icon: File,
        color:
          "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
      },
    ],
    excludeForRehandling: true,
    showSpphFilter: true,
    showDumpTruckFilter: false,
  },
  {
    id: "laporan-dump-truck",
    type: "dump-truck",
    title: "Laporan Tonase Dump Truck",
    description: "Laporan tonase pengiriman dump truck per tanggal dan shift",
    icon: Truck,
    iconBgColor: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400",
    downloadFormats: [
      {
        value: "pdf",
        label: "PDF",
        icon: FileText,
        color:
          "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
      },
      {
        value: "excel",
        label: "Excel",
        icon: FileSpreadsheet,
        color:
          "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
      },
      {
        value: "csv",
        label: "CSV",
        icon: File,
        color:
          "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
      },
    ],
    excludeForRehandling: true,
    showSpphFilter: false,
    showDumpTruckFilter: true,
  },

  {
    id: "laporan-spph-rehandling",
    type: "spph-rehandling",
    title: "Laporan Tonase SPPH Rehandling",
    description:
      "Laporan tonase produksi SPPH rehandling per tanggal dan shift",
    icon: Package,
    iconBgColor: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    downloadFormats: [
      {
        value: "pdf",
        label: "PDF",
        icon: FileText,
        color:
          "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
      },
      {
        value: "excel",
        label: "Excel",
        icon: FileSpreadsheet,
        color:
          "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
      },
      {
        value: "csv",
        label: "CSV",
        icon: File,
        color:
          "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
      },
    ],
    onlyForRehandling: true,
    rehandlingType: "Mine-Mouth Coal Transportation",
    showSpphFilter: true,
    showDumpTruckFilter: false,
  },
  {
    id: "laporan-dump-truck-rehandling",
    type: "dump-truck-rehandling",
    title: "Laporan Tonase Dump Truck Rehandling",
    description:
      "Laporan tonase pengiriman dump truck rehandling per tanggal dan shift",
    icon: RefreshCw,
    iconBgColor: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400",
    downloadFormats: [
      {
        value: "pdf",
        label: "PDF",
        icon: FileText,
        color:
          "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
      },
      {
        value: "excel",
        label: "Excel",
        icon: FileSpreadsheet,
        color:
          "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
      },
      {
        value: "csv",
        label: "CSV",
        icon: File,
        color:
          "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
      },
    ],
    onlyForRehandling: true,
    rehandlingType: "Mine-Mouth Coal Transportation",
    showSpphFilter: false,
    showDumpTruckFilter: true,
  },
];

export const getLaporanConfig = (type) => {
  return LAPORAN_CONFIG.find((config) => config.type === type);
};

export const getLaporanTypes = () => {
  return LAPORAN_CONFIG.map((config) => config.type);
};

export const getFilteredLaporanConfig = (isRehandling) => {
  return LAPORAN_CONFIG.filter((config) => {
    if (isRehandling) {
      return config.onlyForRehandling === true;
    } else {
      return !config.onlyForRehandling;
    }
  });
};