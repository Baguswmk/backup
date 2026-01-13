// DumpTruckExportImport.jsx - Export/Import Component
import React, { useState, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { Download, Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { showToast } from "@/shared/utils/toast";

const DumpTruckExportImport = ({
  dumptruckSettings = [],
  fleets = [],
  onImport,
  canUpdate = false,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * Export current dumptruck settings to JSON
   */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        totalSettings: dumptruckSettings.length,
        settings: dumptruckSettings.map((setting) => ({
          fleetId: setting.fleet?.id,
          fleetName: setting.fleet?.name,
          excavator: setting.fleet?.excavator,
          shift: setting.fleet?.shift,
          workUnit: setting.fleet?.workUnit,
          units: (setting.units || []).map((unit) => ({
            truckId: unit.id,
            hullNo: unit.hull_no,
            operatorId: unit.operatorId,
            company: unit.company,
            workUnit: unit.workUnit,
            status: unit.status,
          })),
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dumptruck-settings-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast.success(`Berhasil export ${dumptruckSettings.length} settings`);
    } catch (error) {
      console.error("Export error:", error);
      showToast.error("Gagal export data");
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle file selection for import
   */
  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setImportError("Format file harus JSON");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        const data = JSON.parse(content);
        await processImport(data);
      } catch (error) {
        console.error("Parse error:", error);
        setImportError("File JSON tidak valid");
      }
    };
    reader.readAsText(file);
  };

  /**
   * Process imported data
   */
  const processImport = async (data) => {
    setIsImporting(true);
    setImportError(null);

    try {
      // Validate import data structure
      if (!data.settings || !Array.isArray(data.settings)) {
        throw new Error("Format data import tidak valid");
      }

      // Map imported settings to fleet IDs
      const importedSettings = [];
      const errors = [];

      for (const setting of data.settings) {
        const fleet = fleets.find(
          (f) =>
            String(f.id) === String(setting.fleetId) ||
            f.name === setting.fleetName
        );

        if (!fleet) {
          errors.push(`Fleet "${setting.fleetName}" tidak ditemukan`);
          continue;
        }

        const pairDtOp = setting.units.map((unit) => ({
          truckId: String(unit.truckId),
          operatorId: String(unit.operatorId),
        }));

        importedSettings.push({
          fleetId: String(fleet.id),
          pairDtOp,
          metadata: {
            importedFrom: setting.fleetName,
            originalHullNos: setting.units.map((u) => u.hullNo),
          },
        });
      }

      if (errors.length > 0) {
        setImportError(
          `Beberapa fleet tidak ditemukan:\n${errors.join("\n")}`
        );
      }

      if (importedSettings.length === 0) {
        throw new Error("Tidak ada data valid untuk diimport");
      }

      // Call parent handler
      await onImport(importedSettings);

      showToast.success(
        `Berhasil import ${importedSettings.length} settings`
      );

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportError(error.message || "Gagal import data");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting || dumptruckSettings.length === 0}
          className="cursor-pointer disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export Settings ({dumptruckSettings.length})
            </>
          )}
        </Button>

        {canUpdate && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="cursor-pointer disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Settings
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      {importError && (
        <Alert variant="destructive" className="dark:bg-red-900/20 dark:border-red-800">
          <AlertCircle className="w-4 h-4 dark:text-red-400" />
          <AlertDescription className="dark:text-red-300">
            <pre className="text-xs whitespace-pre-wrap">{importError}</pre>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-2 dark:text-white">
              Format Export/Import
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Export: Download file JSON dengan semua settings</li>
              <li>• Import: Upload file JSON untuk restore settings</li>
              <li>• Fleet matching: Berdasarkan ID atau nama fleet</li>
              <li>• Validasi otomatis untuk fleet dan unit yang valid</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DumpTruckExportImport;   