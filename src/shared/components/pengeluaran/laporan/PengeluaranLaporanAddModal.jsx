import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/Button";
import { parsePengeluaranExcel } from "@/shared/utils/excelKaParser";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import SearchableSelect from "@/shared/components/SearchableSelect";
import pengeluaranKAService from "@/modules/timbangan/pengeluaran-ka/services/pengeluaranKAService";

// ---------------------------------------------------------------------------
// Default loading locations (fallback when master data is not yet loaded)
// ---------------------------------------------------------------------------
const DEFAULT_LOADING_LOCATIONS = [
  "TAL - SP Elevasi 56",
  "TAL - SP 1",
  "TAL - SP 2",
  "Banko Barat - SP 3",
  "Banko Barat - SP 4",
  "Banko Barat - SP 5",
].map((name) => ({ value: name, label: name }));

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const FileUpIcon = () => (
  <svg className="w-8 h-8 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// ---------------------------------------------------------------------------
// Default state factories
// ---------------------------------------------------------------------------
const defaultHeader = () => ({
  id_rangkaian:       "",
  origin:             "",
  destination:        "",
  shift:              "1",
  seq_no:             "",
  operator:           "",
  start_loading_time: "",
  end_loading_time:   "",
  capasity:           45,
  coal_type:          "",
});

const newWagon = (defaultCoalType = "") => ({
  _id:            Date.now() + Math.random(),
  carriage_number: "",
  coal_type:       defaultCoalType,
  load_weight:     "",
});

// ---------------------------------------------------------------------------
// ManualForm sub-component
// ---------------------------------------------------------------------------
const ManualForm = ({ loadingLocations, dumpingLocations, isLoadingLocations, isSubmitting, onSubmit, onClose }) => {
  const [header,      setHeader]      = useState(defaultHeader());
  const [wagons,      setWagons]      = useState([newWagon()]);
  const [formError,   setFormError]   = useState("");

  const setHeaderField = (key, val) =>
    setHeader((prev) => ({ ...prev, [key]: val }));

  const addWagon = () =>
    setWagons((prev) => [...prev, newWagon(header.coal_type)]);

  const removeWagon = (id) =>
    setWagons((prev) => prev.filter((w) => w._id !== id));

  const updateWagon = (id, key, val) =>
    setWagons((prev) =>
      prev.map((w) => (w._id === id ? { ...w, [key]: val } : w))
    );

  const validate = () => {
    if (!header.id_rangkaian.trim()) return "ID Rangkaian (BBR) wajib diisi.";
    if (!header.origin)              return "Loading Location wajib dipilih.";
    if (!header.destination)         return "Tujuan wajib dipilih.";
    if (!header.operator.trim())     return "Operator wajib diisi.";
    if (!header.start_loading_time)  return "Mulai muat wajib diisi.";
    if (!header.end_loading_time)    return "Selesai muat wajib diisi.";
    if (new Date(header.end_loading_time) <= new Date(header.start_loading_time))
      return "Selesai muat harus setelah mulai muat.";
    if (wagons.length === 0)         return "Minimal 1 gerbong harus ditambahkan.";
    for (let i = 0; i < wagons.length; i++) {
      if (!wagons[i].carriage_number.trim())
        return `Nomor gerbong pada baris ${i + 1} wajib diisi.`;
      if (wagons[i].load_weight === "" || isNaN(Number(wagons[i].load_weight)) || Number(wagons[i].load_weight) <= 0)
        return `Tonase pada baris ${i + 1} harus berupa angka positif.`;
    }
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError("");

    const payload = wagons.map((wagon) => ({
      id_rangkaian:       header.id_rangkaian.trim(),
      carriage_number:    wagon.carriage_number.trim(),
      origin:             header.origin,
      destination:        header.destination,
      shift:              `Shift ${header.shift}`,
      seq_no:             Number(header.seq_no) || 0,
      operator:           header.operator.trim(),
      start_loading_time: new Date(header.start_loading_time).toISOString(),
      end_loading_time:   new Date(header.end_loading_time).toISOString(),
      capasity:           Number(header.capasity) || 45,
      coal_type:          wagon.coal_type.trim() || header.coal_type.trim(),
      load_weight:        Number(wagon.load_weight),
    }));

    onSubmit(payload);
  };

  const inputCls =
    "w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";
  const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header Global ── */}
      <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/40 backdrop-blur-sm shadow-inner transition-all">
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
          Informasi Rangkaian
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* ID Rangkaian */}
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>ID Rangkaian (BBR) <span className="text-red-500">*</span></label>
            <input
              className={inputCls}
              placeholder="cth. 01156/TMB/03/2026"
              value={header.id_rangkaian}
              onChange={(e) => setHeaderField("id_rangkaian", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Seq No */}
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>No. Urut (Seq)</label>
            <input
              type="number"
              className={inputCls}
              placeholder="cth. 6"
              value={header.seq_no}
              onChange={(e) => setHeaderField("seq_no", e.target.value)}
              disabled={isSubmitting}
              min={0}
            />
          </div>

          {/* Origin (Loading Location) */}
          <div className="col-span-2">
            <label className={labelCls}>Loading Location (Asal) <span className="text-red-500">*</span></label>
            <SearchableSelect
              id="manual-origin"
              items={DEFAULT_LOADING_LOCATIONS}
              value={header.origin}
              onChange={(v) => setHeaderField("origin", v)}
              placeholder="-- Pilih Loading Location --"
              disabled={isSubmitting}
              allowClear
            />
          </div>

          {/* Destination */}
          <div className="col-span-2">
            <label className={labelCls}>Tujuan <span className="text-red-500">*</span></label>
            <SearchableSelect
              id="manual-destination"
              items={(dumpingLocations.length > 0 ? dumpingLocations : []).map((loc) => ({ value: loc.name, label: loc.name }))}
              value={header.destination}
              onChange={(v) => setHeaderField("destination", v)}
              placeholder="-- Pilih Tujuan --"
              disabled={isLoadingLocations || isSubmitting}
              allowClear
            />
          </div>

          {/* Shift */}
          <div>
            <label className={labelCls}>Shift <span className="text-red-500">*</span></label>
            <select
              className={inputCls}
              value={header.shift}
              onChange={(e) => setHeaderField("shift", e.target.value)}
              disabled={isSubmitting}
            >
              <option value="1">Shift 1</option>
              <option value="2">Shift 2</option>
              <option value="3">Shift 3</option>
            </select>
          </div>

          {/* Operator */}
          <div>
            <label className={labelCls}>Operator <span className="text-red-500">*</span></label>
            <input
              className={inputCls}
              placeholder="Nama operator"
              value={header.operator}
              onChange={(e) => setHeaderField("operator", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Start */}
          <div>
            <label className={labelCls}>Mulai Muat <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              className={inputCls}
              value={header.start_loading_time}
              onChange={(e) => setHeaderField("start_loading_time", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* End */}
          <div>
            <label className={labelCls}>Selesai Muat <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              className={inputCls}
              value={header.end_loading_time}
              onChange={(e) => setHeaderField("end_loading_time", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Kapasitas */}
          <div>
            <label className={labelCls}>Kapasitas (ton)</label>
            <input
              type="number"
              className={inputCls}
              value={header.capasity}
              onChange={(e) => setHeaderField("capasity", e.target.value)}
              disabled={isSubmitting}
              min={0}
              step={0.001}
            />
          </div>

          {/* Jenis BB (default for all wagons) */}
          <div>
            <label className={labelCls}>Jenis BB (default gerbong)</label>
            <input
              className={inputCls}
              placeholder="cth. BTB 47"
              value={header.coal_type}
              onChange={(e) => setHeaderField("coal_type", e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* ── Wagon Table ── */}
      <div className="border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900/50 transition-all">
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Daftar Gerbong ({wagons.length})
          </span>
          <Button
            type="button"
            onClick={addWagon}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm shadow-blue-500/20 transition-all h-8"
          >
            <PlusIcon /> Tambah Gerbong
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2.5 text-center w-10">#</th>
                <th className="px-4 py-2.5 min-w-[150px]">Nomor Gerbong <span className="text-red-500/80">*</span></th>
                <th className="px-4 py-2.5 min-w-[120px]">Jenis BB</th>
                <th className="px-4 py-2.5 min-w-[110px] text-right">Tonase (ton) <span className="text-red-500/80">*</span></th>
                <th className="px-4 py-2.5 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {wagons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                    Belum ada gerbong. Klik &quot;Tambah Gerbong&quot; untuk memulai.
                  </td>
                </tr>
              ) : (
                wagons.map((wagon, idx) => (
                  <tr key={wagon._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-1.5 text-center text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-1.5">
                      <input
                        className={inputCls}
                        placeholder="cth. 5419258"
                        value={wagon.carriage_number}
                        onChange={(e) => updateWagon(wagon._id, "carriage_number", e.target.value)}
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        className={inputCls}
                        placeholder={header.coal_type || "cth. BTB 47"}
                        value={wagon.coal_type}
                        onChange={(e) => updateWagon(wagon._id, "coal_type", e.target.value)}
                        disabled={isSubmitting}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        className={`${inputCls} text-right`}
                        placeholder="0.000"
                        value={wagon.load_weight}
                        onChange={(e) => updateWagon(wagon._id, "load_weight", e.target.value)}
                        disabled={isSubmitting}
                        min={0}
                        step={0.001}
                      />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <Button
                        type="Button"
                        onClick={() => removeWagon(wagon._id)}
                        disabled={isSubmitting || wagons.length <= 1}
                        className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Hapus baris"
                      >
                        <TrashIcon />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {wagons.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-slate-800/30 text-xs font-medium text-gray-600 dark:text-gray-300">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right">Total Tonase:</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-green-700 dark:text-green-400">
                    {wagons.reduce((sum, w) => sum + (Number(w.load_weight) || 0), 0).toFixed(3)} ton
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Error */}
      {formError && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm border border-red-200 dark:border-red-800">
          {formError}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
        <Button variant="default" onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 min-w-[110px] justify-center"
          onClick={handleSubmit}
          disabled={isSubmitting || wagons.length === 0}
        >
          {isSubmitting ? (
            <><Spinner /> Menyimpan...</>
          ) : (
            "Simpan Data"
          )}
        </Button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Modal
// ---------------------------------------------------------------------------

export const PengeluaranLaporanAddModal = ({
  isOpen,
  onClose,
  onSubmitManual,
  onSubmitExcel,
  isSubmitting = false,
  duplicateError = null,
  setDuplicateError,
  onSubmitOverride,
}) => {
  const [activeTab,        setActiveTab]        = useState("excel");
  const [importing,        setImporting]        = useState(false);
  const [selectedFile,     setSelectedFile]     = useState(null);
  const [parsedData,       setParsedData]       = useState([]);
  const [errorMsg,         setErrorMsg]         = useState("");
  const [loadingLocation,  setLoadingLocation]  = useState("");

  // ── duplicate-override state ──
  const [overridePhase,   setOverridePhase]   = useState("confirm"); // "confirm" | "form"
  const [overrideNote,    setOverrideNote]    = useState("");
  const [evidenceFile,    setEvidenceFile]    = useState(null);   // File object
  const [evidenceId,      setEvidenceId]      = useState(null);   // number from /upload
  const [isUploadingBA,   setIsUploadingBA]   = useState(false);
  const [uploadError,     setUploadError]     = useState("");
  
  const fileInputRef = useRef(null);

  const { locations, isLoading: isLoadingLocations } = useMasterData("locations");

  const loadingLocations = (locations || []).filter((loc) => loc.type === "LOADING");
  const dumpingLocations = (locations || []).filter((loc) => loc.type === "DUMPING");

  const resetExcelState = () => {
    setSelectedFile(null);
    setParsedData([]);
    setErrorMsg("");
    setLoadingLocation("");
    // reset override
    setOverridePhase("confirm");
    setOverrideNote("");
    setEvidenceFile(null);
    setEvidenceId(null);
    setIsUploadingBA(false);
    setUploadError("");
    if (setDuplicateError) setDuplicateError(null);
  };

  const handleClose = () => {
    resetExcelState();
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setErrorMsg("Harap unggah file Excel (.xlsx atau .xls).");
      return;
    }

    setSelectedFile(file);
    setErrorMsg("");
    setImporting(true);

    try {
      const result = await parsePengeluaranExcel(file);
      if (result.success) {
        setParsedData(result.data);
      } else {
        setErrorMsg(result.error || "Gagal memproses file Excel.");
        setSelectedFile(null);
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat memproses file.");
      setSelectedFile(null);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleSubmitUpload = () => {
    if (parsedData.length === 0) {
      setErrorMsg("Tidak ada data valid yang bisa diunggah.");
      return;
    }
    if (!loadingLocation) {
      setErrorMsg("Harap pilih Loading Location terlebih dahulu.");
      return;
    }

    const finalPayload = parsedData.map((item) => ({
      ...item,
      loading_location: loadingLocation,
    }));

    if (onSubmitExcel) {
      onSubmitExcel(finalPayload);
    }
  };

  // ── upload Berita Acara on file pick ──
  const baFileInputRef = useRef(null);

  const handleBAFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setEvidenceFile(file);
    setEvidenceId(null);
    setIsUploadingBA(true);
    try {
      const result = await pengeluaranKAService.uploadEvidence(file);
      setEvidenceId(result.id);
    } catch (err) {
      setUploadError(err.message || "Gagal mengupload dokumen.");
      setEvidenceFile(null);
    } finally {
      setIsUploadingBA(false);
      if (baFileInputRef.current) baFileInputRef.current.value = null;
    }
  }, []);

  const handleOverrideSubmit = () => {
    if (!overrideNote.trim()) {
      setUploadError("Catatan / Berita Acara wajib diisi.");
      return;
    }
    if (!evidenceId) {
      setUploadError("Dokumen Berita Acara wajib diupload.");
      return;
    }
    if (onSubmitOverride && duplicateError?.payload) {
      setUploadError("");
      onSubmitOverride(duplicateError.payload, overrideNote.trim(), evidenceId).then(() => {
        handleClose();
      });
    }
  };

  if (duplicateError) {
    const isFormPhase = overridePhase === "form";
    const canSubmit   = overrideNote.trim() && evidenceId && !isUploadingBA && !isSubmitting;

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-900/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {isFormPhase ? "Upload Berita Acara" : "Data Duplikat Terdeteksi"}
            </DialogTitle>
          </DialogHeader>

          {/* ── Phase 1: Konfirmasi ── */}
          {!isFormPhase && (
            <div className="flex flex-col gap-5 py-2">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Data ini sudah ada di Aplikasi.{" "}
                <strong>Apakah anda ingin merubah Keseluruhan data?</strong>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md px-3 py-2">
                ⚠️ Proses ini akan <strong>menghapus</strong> seluruh data yang ada dan menggantinya dengan data baru. Anda wajib menyertakan dokumen Berita Acara sebagai bukti perubahan.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800 dark:text-neutral-50">
                <Button
                  variant="default"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Tidak, Kembali
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white px-5"
                  onClick={() => setOverridePhase("form")}
                >
                  Ya, Ganti Data
                </Button>
              </div>
            </div>
          )}

          {/* ── Phase 2: Form Note + Upload ── */}
          {isFormPhase && (
            <div className="flex flex-col gap-4 py-2">

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Catatan / Keterangan <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px] resize-none"
                  placeholder="Alasan perubahan / penimpaan data..."
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Upload BA */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Dokumen Berita Acara <span className="text-red-500">*</span>
                  <span className="ml-1 font-normal text-gray-400">(PDF / JPG / PNG, maks 10MB)</span>
                </label>

                {!evidenceFile ? (
                  <div
                    className="border-2 border-dashed border-orange-300 dark:border-orange-800 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors cursor-pointer"
                    onClick={() => baFileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={baFileInputRef}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleBAFileChange}
                    />
                    <svg className="w-8 h-8 text-orange-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Klik untuk pilih dokumen</p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG, WebP</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-4 py-3">
                    <svg className="w-8 h-8 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{evidenceFile.name}</p>
                      {isUploadingBA ? (
                        <p className="text-xs text-orange-500 animate-pulse mt-0.5">Mengupload dokumen...</p>
                      ) : evidenceId ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 font-medium">✓ Berhasil diupload (ID: {evidenceId})</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setEvidenceFile(null); setEvidenceId(null); setUploadError(""); }}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="Hapus file"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Error */}
              {uploadError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-md text-xs border border-red-200 dark:border-red-800">
                  {uploadError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800 dark:text-neutral-50">
                <Button
                  variant="default"
                  onClick={() => { setOverridePhase("confirm"); setUploadError(""); }}
                  disabled={isSubmitting || isUploadingBA}
                >
                  Kembali
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 justify-center min-w-[130px]"
                  onClick={handleOverrideSubmit}
                  disabled={!canSubmit}
                >
                  {isSubmitting ? (
                    <><Spinner /> Memproses...</>
                  ) : (
                    "Timpa Data"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 dark:text-neutral-50 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Tambah Laporan Pengeluaran
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 flex-1 flex flex-col">
          {/* <TabsList className="grid w-full grid-cols-2 rounded-lg bg-gray-100 dark:bg-slate-800 p-1 mb-6">
            <TabsTrigger
              value="excel"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm text-sm dark:text-gray-300 dark:data-[state=active]:text-blue-400"
            >
              Upload Excel (.xlsx)
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm text-sm dark:text-gray-300 dark:data-[state=active]:text-blue-400"
            >
              Input Manual
            </TabsTrigger>
          </TabsList> */}

          {/* ── Excel Tab ── */}
          <TabsContent value="excel" className="flex flex-col flex-1 h-full mt-0 border-none p-0 outline-none">
            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mb-4 border border-red-200 dark:border-red-800">
                {errorMsg}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Loading Location <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                id="loading-location"
                items={DEFAULT_LOADING_LOCATIONS}
                value={loadingLocation}
                onChange={setLoadingLocation}
                placeholder="-- Pilih Loading Location --"
                allowClear
              />
            </div>

            {!selectedFile ? (
              <div
                className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
                <FileUpIcon />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-2">
                  Klik atau seret file Excel ke sini
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Mendukung .xlsx, .xls — maksimal 5MB
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800/30 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedFile.name}</h3>
                    {importing ? (
                      <p className="text-xs text-blue-500 animate-pulse mt-0.5">Memproses data...</p>
                    ) : (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 font-medium">
                        ✓ Berhasil memuat {parsedData.length} baris data gerbong
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={resetExcelState}
                    className="p-2 bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
                    title="Hapus file"
                  >
                    <TrashIcon />
                  </Button>
                </div>

                {!importing && parsedData.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[280px] flex flex-col">
                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-slate-700">
                      Preview Data (5 baris pertama dari {parsedData.length})
                    </div>
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-gray-500 border-b dark:border-slate-700">
                          <tr>
                            <th className="px-3 py-2 font-medium">BBR</th>
                            <th className="px-3 py-2 font-medium">Shift</th>
                            <th className="px-3 py-2 font-medium">Gerbong</th>
                            <th className="px-3 py-2 font-medium">Jenis BB</th>
                            <th className="px-3 py-2 font-medium text-right">Tonase</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {parsedData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{row.bbr}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">Shift {row.shift}</td>
                              <td className="px-3 py-2 font-mono">{row.nomor_gerbong}</td>
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row.jenis_bb}</td>
                              <td className="px-3 py-2 text-right font-mono font-medium">{row.tonase}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 5 && (
                      <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 dark:bg-slate-800/30 border-t border-gray-200 dark:border-slate-700">
                        ... dan {parsedData.length - 5} baris lainnya
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-slate-800">
              <Button variant="default" onClick={handleClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 min-w-[130px] justify-center"
                onClick={handleSubmitUpload}
                disabled={!selectedFile || parsedData.length === 0 || importing || isSubmitting}
              >
                {isSubmitting ? (
                  <><Spinner /> Menyimpan...</>
                ) : (
                  "Upload & Simpan"
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ── Manual Tab ── */}
          <TabsContent value="manual" className="flex flex-col flex-1 h-full mt-0 border-none p-0 outline-none">
            <ManualForm
              loadingLocations={DEFAULT_LOADING_LOCATIONS.map((item) => ({ name: item.value }))}
              dumpingLocations={dumpingLocations}
              isLoadingLocations={isLoadingLocations}
              isSubmitting={isSubmitting}
              onSubmit={(payload) => {
                if (onSubmitManual) onSubmitManual(payload);
              }}
              onClose={handleClose}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
