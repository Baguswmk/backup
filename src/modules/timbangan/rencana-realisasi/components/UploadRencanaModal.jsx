import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Loader2,
  UploadCloud,
  FileSpreadsheet,
  X,
  CheckCircle2,
  TableIcon,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function UploadRencanaModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) {
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setExcelFile(null);
      setExcelPreview([]);
      setIsDragging(false);
      setProgress(0);
    }
  }, [isOpen]);

   useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const processFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) return;
    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        setExcelPreview(data.slice(0, 5));
      } catch (err) {
        console.error("Gagal membaca file:", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const handleRemove = () => {
    setExcelFile(null);
    setExcelPreview([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!excelFile || isLoading) return;
    onSubmit(excelFile, setProgress);
  };

  const columns = excelPreview.length > 0 ? Object.keys(excelPreview[0]) : [];

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal Card */}
      <div className="relative w-full max-w-[680px] max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1117] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.07] bg-gray-50/80 dark:bg-white/[0.03] rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Upload Data Rencana
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Format: .xlsx · .xls · .csv
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Drop Zone */}
            {!excelFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
                }}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={[
                  "flex flex-col items-center justify-center gap-3 py-12 px-6 rounded-xl",
                  "border-2 border-dashed cursor-pointer select-none transition-all duration-200 group",
                  isDragging
                    ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500"
                    : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:border-emerald-500/60 dark:hover:bg-emerald-500/5",
                ].join(" ")}
              >
                <div className={[
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200",
                  "shadow-sm border border-gray-100 dark:border-white/10",
                  isDragging
                    ? "bg-emerald-100 dark:bg-emerald-500/20"
                    : "bg-white dark:bg-white/5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/15",
                ].join(" ")}>
                  <UploadCloud className={[
                    "w-6 h-6 transition-colors duration-200",
                    isDragging
                      ? "text-emerald-500"
                      : "text-gray-400 group-hover:text-emerald-500 dark:text-gray-500 dark:group-hover:text-emerald-400",
                  ].join(" ")} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Seret & lepas file di sini
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    atau klik untuk memilih file
                  </p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => processFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              /* File terpilih */
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 truncate">
                    {excelFile.name}
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 mt-0.5">
                    {(excelFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-500 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Preview Table */}
            {excelPreview.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Preview
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-0"
                  >
                    {excelPreview.length} baris · {columns.length} kolom
                  </Badge>
                </div>

                {/* Wrapper scroll — overflow-auto + max-h di sini saja */}
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-auto max-h-[200px] scrollbar-thin">
                  <table className="border-collapse whitespace-nowrap w-max min-w-full">
                    <thead>
                      <tr className="sticky top-0 z-[2] bg-gray-50 dark:bg-[#1a1d27]">
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-2.5 text-left text-[11px] font-semibold border-b text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {excelPreview.map((row, i) => (
                        <tr
                          key={i}
                          className={
                            i % 2 === 0
                              ? "bg-white dark:bg-transparent"
                              : "bg-gray-50/70 dark:bg-white/[0.02]"
                          }
                        >
                          {columns.map((col, j) => (
                            <td
                              key={j}
                              className="px-4 py-2 text-xs border-b text-gray-700 dark:text-gray-300 border-gray-100 dark:border-white/[0.05]"
                            >
                              {String(row[col] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 dark:border-white/[0.07] bg-gray-50/80 dark:bg-white/[0.02] rounded-b-2xl shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200 px-4"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !excelFile}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white px-5 shadow-sm disabled:opacity-40 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  {progress > 0 ? `Mengunggah... ${progress}%` : "Mengunggah..."}
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-3.5 w-3.5" />
                  Upload Data
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}