import {
  FileText,
  FileSpreadsheet,
  Truck,
  Package,
  BarChart3,
  File,
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
  },
];

export const getLaporanConfig = (type) => {
  return LAPORAN_CONFIG.find((config) => config.type === type);
};

export const getLaporanTypes = () => {
  return LAPORAN_CONFIG.map((config) => config.type);
};
