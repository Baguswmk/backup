import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Loader2 } from "lucide-react";
import SearchableSelect from "@/shared/components/SearchableSelect";

// Mock options for SearchableSelect
const mockLoadingLocations = [
  { value: "PIT A", label: "PIT A" },
  { value: "PIT B", label: "PIT B" },
  { value: "PIT C", label: "PIT C" },
];

const mockDumpingLocations = [
  { value: "ROM 1", label: "ROM 1" },
  { value: "ROM 2", label: "ROM 2" },
  { value: "ROM 3", label: "ROM 3" },
];

export default function EditRencanaModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialData,
  masters,
}) {
  const [formData, setFormData] = useState({
    loading_location: "",
    dumping_location: "",
    effective_date: "",
    total_fleet: "",
    total_tonase: "",
    pic_work_unit: "",
  });

  const loadLocItems = useMemo(
    () =>
      masters?.loadingLocations?.map((l) => ({
        value: l.name,
        label: l.name,
      })) || [],
    [masters?.loadingLocations],
  );

  const dumpLocItems = useMemo(
    () =>
      masters?.dumpingLocations?.map((l) => ({
        value: l.name,
        label: l.name,
      })) || [],
    [masters?.dumpingLocations],
  );

  const workUnitItems = useMemo(
    () =>
      masters?.workUnits?.map((l) => ({
        value: l.subsatker,
        label: l.subsatker,
      })) || [],
    [masters?.workUnits],
  );

  // Populate form with initial data when modal opens
  useEffect(() => {
    if (isOpen && initialData) {
      let tonaseStr = "";
      if (initialData.total_tonase) {
        const parts = String(initialData.total_tonase).split(".");
        let intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        tonaseStr = parts.length > 1 ? `${intPart},${parts[1]}` : intPart;
      }

      setFormData({
        loading_location: initialData.loading_location || "",
        dumping_location: initialData.dumping_location || "",
        effective_date: initialData.effective_date ? initialData.effective_date.split('T')[0] : "",
        total_fleet: initialData.total_fleet || "",
        total_tonase: tonaseStr,
        pic_work_unit: initialData.pic_work_unit || "",
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTonaseChange = (e) => {
    let val = e.target.value.replace(/[^0-9,]/g, ""); // allow only numbers and comma
    if (val === "") {
      handleChange("total_tonase", "");
      return;
    }
    const parts = val.split(",");
    let integerPart = parts[0].replace(/\./g, ""); // remove existing dots
    // format with dots for thousands
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    let finalVal = integerPart;
    if (parts.length > 1) {
      finalVal += "," + parts[1]; // keep only one comma and its decimal digits
    }
    handleChange("total_tonase", finalVal);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tonaseFloat = parseFloat(String(formData.total_tonase).replace(/\./g, "").replace(/,/g, ".")) || 0;
    onSubmit(initialData.id, {
      ...formData,
      total_fleet: parseInt(formData.total_fleet, 10),
      total_tonase: tonaseFloat,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-neutral-50">
            Edit Rencana & Realisasi
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Lokasi Loading
            </Label>
            <SearchableSelect
              items={loadLocItems}
              value={formData.loading_location}
              onChange={(val) => handleChange("loading_location", val)}
              placeholder="Pilih Lokasi Loading..."
              id="loading_location"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Lokasi Dumping
            </Label>
            <SearchableSelect
              items={dumpLocItems}
              value={formData.dumping_location}
              onChange={(val) => handleChange("dumping_location", val)}
              placeholder="Pilih Lokasi Dumping..."
              id="dumping_location"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Tanggal Efektif
            </Label>
            <Input
              type="date"
              value={formData.effective_date}
              onChange={(e) => handleChange("effective_date", e.target.value)}
              required
              className="bg-white dark:bg-gray-800 dark:text-neutral-50 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Jumlah Fleet
            </Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.total_fleet}
              onChange={(e) => handleChange("total_fleet", e.target.value)}
              placeholder="Masukkan Jumlah Fleet..."
              required
              className="bg-white dark:bg-gray-800 dark:text-neutral-50 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">
              Total Tonase
            </Label>
            <Input
              type="text"
              value={formData.total_tonase}
              onChange={handleTonaseChange}
              placeholder="Contoh: 15.5"
              required
              className="bg-white dark:bg-gray-800 dark:text-neutral-50 border-gray-200 dark:border-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">PIC</Label>
           <SearchableSelect
              items={workUnitItems}
              value={formData.pic_work_unit}
              onChange={(val) => handleChange("pic_work_unit", val)}
              placeholder="Pilih PIC..."
              id="pic_work_unit"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
