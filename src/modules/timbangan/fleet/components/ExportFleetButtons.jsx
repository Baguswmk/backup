import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { generateFleetPDF } from "../services/fleetPDFGenerator";
import { generateFleetExcel } from "../services/fleetExcelGenerator";
import { showToast } from "@/shared/utils/toast";

const ExportFleetButtons = ({ 
  fleetData = [], 
  selectedSatker,
  selectedUrutkan,
  type,
  userRole 
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const handleExportPDF = async () => {
    if (!fleetData || fleetData.length === 0) {
      alert("Tidak ada data untuk diekspor");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      await generateFleetPDF({
        fleetData,
        selectedSatker,
        selectedUrutkan,
        type,
        userRole
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast.error("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (!fleetData || fleetData.length === 0) {
      showToast.error("Tidak ada data untuk diekspor");
      return;
    }

    setIsGeneratingExcel(true);
    try {
      await generateFleetExcel({
        fleetData,
        selectedSatker,
        selectedUrutkan,
        type,
        userRole
      });
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Gagal membuat Excel. Silakan coba lagi.");
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Export to PDF Button */}
      {/* <Button
        onClick={handleExportPDF}
        disabled={isGeneratingPDF || !fleetData || fleetData.length === 0}
        variant="outline"
        className="flex-1 sm:flex-none gap-2 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400"
        title="Export ke PDF"
      >
        {isGeneratingPDF ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {isGeneratingPDF ? "Generating..." : "Export PDF"}
        </span>
        <span className="sm:hidden">PDF</span>
      </Button> */}

      {/* Export to Excel Button */}
      {/* <Button
        onClick={handleExportExcel}
        disabled={isGeneratingExcel || !fleetData || fleetData.length === 0}
        variant="outline"
        className="flex-1 sm:flex-none gap-2 border-emerald-300 dark:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
        title="Export ke Excel"
      >
        {isGeneratingExcel ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {isGeneratingExcel ? "Generating..." : "Export Excel"}
        </span>
        <span className="sm:hidden">Excel</span>
      </Button> */}
    </div>
  );
};

export default ExportFleetButtons;