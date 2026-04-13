import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import SearchableSelect from "@/shared/components/SearchableSelect";
import  useAuthStore  from "@/modules/auth/store/authStore";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

export const RakorTargetFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  isLoading,
  mode = "rakor",
}) => {
  const isSpphMode = mode === "spph";
  const user = useAuthStore((state) => state.user);
  const { masters } = useFleet(user ? { user } : null, null);

  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    spph: "",
    company: "",
    pic_work_unit: "",
    loading_location: "",
    dumping_location: "",
    target_ton: "",
    total_fleet: "",
  });

  const [file, setFile] = useState(null);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        year: editingItem.year,
        month: editingItem.month,
        spph: editingItem.spph || "",
        company: editingItem.company || "",
        pic_work_unit: editingItem.pic_work_unit || "",
        loading_location: editingItem.loading_location || "",
        dumping_location: editingItem.dumping_location || "",
        target_ton: editingItem.target_ton || "",
        total_fleet: editingItem.total_fleet || "",
      });
      setFile(null); // Reset file
    } else {
      setFormData({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        spph: "",
        company: "",
        pic_work_unit: "",
        loading_location: "",
        dumping_location: "",
        target_ton: "",
        total_fleet: "",
      });
      setFile(null);
    }
  }, [editingItem, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const submitAction = (e) => {
    e.preventDefault();

    if (!file && !editingItem) {
      alert("Dokumen Rakor wajib diupload!");
      return;
    }

    const payload = {
      ...formData,
      year: parseInt(formData.year),
      month: parseInt(formData.month),
      target_ton: parseFloat(formData.target_ton),
      total_fleet: formData.total_fleet ? parseInt(formData.total_fleet) : undefined,
      // Rakor mode: SPPH tidak diperlukan, kirim null
      // SPPH mode: Company tidak diperlukan, kirim null
      spph: isSpphMode ? (formData.spph || null) : null,
      company: !isSpphMode ? (formData.company || null) : null,
    };

    onSubmit(payload, file);
  };

  const companyOptions =
    masters?.companies?.map((c) => ({
      value: c.name,
      label: c.name,
    })) || [];

  const locationLoadingOptions =
    masters?.loadingLocations?.map((l) => ({
      value: l.name,
      label: l.name,
    })) || [];

  const locationDumpingOptions =
    masters?.dumpingLocations?.map((l) => ({
      value: l.name,
      label: l.name,
    })) || [];

  const workUnitOptions =
    masters?.workUnits
      ?.filter((w) => w.subsatker)
      ?.map((w) => ({
        value: w.subsatker,
        label: w.subsatker,
      })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="dark:text-white pb-2">
            {editingItem ? "Edit Target Rakor" : "Tambah Target Rakor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submitAction} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="dark:text-white pb-2">Tahun</Label>
              <Input
                name="year"
                type="number"
                value={formData.year}
                onChange={handleChange}
                required
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-white pb-2">Bulan</Label>
              <select
                name="month"
                value={formData.month}
                onChange={handleChange}
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="dark:text-white pb-2">Nomor SPPH</Label>
              {isSpphMode ? (
                <Input
                  name="spph"
                  value={formData.spph}
                  onChange={handleChange}
                  required
                  placeholder="Ex: SPPH-001/2026"
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              ) : (
                // Rakor mode: SPPH tidak diisi, set null oleh submitAction
                <div className="flex items-center h-10 px-3 rounded-md border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-sm">
                  Otomatis (tidak ada SPPH)
                </div>
              )}
            </div>
            <div>
              <Label className="dark:text-white pb-2">Mitra / Company</Label>
              {!isSpphMode ? (
                <SearchableSelect
                  items={companyOptions}
                  value={formData.company}
                  onChange={(v) => handleSelectChange("company", v)}
                  placeholder="Pilih Mitra..."
                />
              ) : (
                // SPPH mode: Company tidak diisi
                <div className="flex items-center h-10 px-3 rounded-md border border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-sm">
                  Otomatis (tidak ada Company)
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="dark:text-white pb-2">Unit Kerja (PIC)</Label>
              <SearchableSelect
                items={workUnitOptions}
                value={formData.pic_work_unit}
                onChange={(v) => handleSelectChange("pic_work_unit", v)}
                placeholder="Pilih Unit Kerja..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="dark:text-white pb-2">Lokasi Loading</Label>
              <SearchableSelect
                items={locationLoadingOptions}
                value={formData.loading_location}
                onChange={(v) => handleSelectChange("loading_location", v)}
                placeholder="Pilih Loading..."
              />
            </div>
            <div>
              <Label className="dark:text-white pb-2">Lokasi Dumping</Label>
              <SearchableSelect
                items={locationDumpingOptions}
                value={formData.dumping_location}
                onChange={(v) => handleSelectChange("dumping_location", v)}
                placeholder="Pilih Dumping..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="dark:text-white pb-2">Target Realisasi (Ton)</Label>
              <Input
                name="target_ton"
                type="number"
                step="0.01"
                value={formData.target_ton}
                onChange={handleChange}
                required
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <Label className="dark:text-white pb-2">Total Fleet (Opsional)</Label>
              <Input
                name="total_fleet"
                type="number"
                value={formData.total_fleet}
                onChange={handleChange}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <Label className="dark:text-white pb-2">Upload Dokumen Rakor (PDF)</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 cursor-pointer"
              required={!editingItem}
            />
            {editingItem && editingItem.rakor_document && (
              <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                Dokumen tersimpan: {editingItem.rakor_document.name}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="dark:text-white dark:border-gray-700 dark:hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 dark:text-white"
            >
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
