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
import { Loader2, Plus, Trash2 } from "lucide-react";
import SearchableSelect from "@/shared/components/SearchableSelect";

const emptyRow = {
  loading_location: "",
  dumping_location: "",
  effective_date: "",
  expiry_date: "",
  total_fleet: "",
  total_tonase: "",
  pic_work_unit: "",
};

export default function TambahRencanaModal({
  isOpen,
  onClose,
  onSubmit, 
  isLoading,
  masters,
}) {
  const [formList, setFormList] = useState([{ ...emptyRow }]);
  const [documentFile, setDocumentFile] = useState(null);
  const [progress, setProgress] = useState(0);

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

  useEffect(() => {
    if (isOpen) {
      setFormList([{ ...emptyRow }]);
      setDocumentFile(null);
      setProgress(0);
    }
  }, [isOpen]);

  const handleRowChange = (index, field, value) => {
    const newList = [...formList];
    newList[index][field] = value;
    setFormList(newList);
  };

  const handleTonaseChange = (index, e) => {
    let val = e.target.value.replace(/[^0-9,]/g, ""); // allow only numbers and comma
    if (val === "") {
      handleRowChange(index, "total_tonase", "");
      return;
    }
    const parts = val.split(",");
    let integerPart = parts[0].replace(/\./g, ""); // remove existing dots
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    let finalVal = integerPart;
    if (parts.length > 1) {
      finalVal += "," + parts[1]; // keep only one comma and its decimal digits
    }
    handleRowChange(index, "total_tonase", finalVal);
  };

  const addRow = () => {
    setFormList([...formList, { ...emptyRow }]);
  };

  const removeRow = (index) => {
    if (formList.length > 1) {
      const newList = formList.filter((_, i) => i !== index);
      setFormList(newList);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payloadArray = formList.map(row => {
      const tonaseFloat = parseFloat(String(row.total_tonase).replace(/\./g, "").replace(/,/g, ".")) || 0;
      return {
        ...row,
        total_fleet: parseInt(row.total_fleet, 10),
        total_tonase: tonaseFloat,
      };
    });
    
    onSubmit(payloadArray, documentFile, setProgress);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-7xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-gray-900 dark:text-neutral-50 flex items-center justify-between">
            <span>Tambah Rencana & Realisasi Secara Massal</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-auto px-1 py-4">
              <div className="mb-6 space-y-2 max-w-sm">
              <Label className="text-gray-700 dark:text-gray-300">
                Dokumen Lampiran 
              </Label>
              <Input
                type="file"
                required
                onChange={(e) => setDocumentFile(e.target.files[0] || null)}
                className="bg-white dark:bg-gray-800 dark:text-neutral-50 border-gray-200 dark:border-gray-700 file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md cursor-pointer pt-0 pb-0"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
              />
            </div>
            <div className="w-full overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium">No</th>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium min-w-[200px]">Lokasi Loading</th>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium min-w-[200px]">Lokasi Dumping</th>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium min-w-[150px]">Tanggal Efektif</th>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium min-w-[150px]">Tanggal Kedaluwarsa</th>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium min-w-[120px]">Jumlah Fleet</th>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium min-w-[150px]">Total Tonase</th>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium min-w-[200px]">PIC</th>
                    <th className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 font-medium w-[60px] text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {formList.map((row, index) => (
                    <tr key={index} className="bg-white dark:bg-gray-900 group">
                      <td className="px-3 py-2 text-center text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2">
                        <SearchableSelect
                          items={loadLocItems}
                          value={row.loading_location}
                          onChange={(val) => handleRowChange(index, "loading_location", val)}
                          placeholder="Loading..."
                          id={`loading_${index}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <SearchableSelect
                          items={dumpLocItems}
                          value={row.dumping_location}
                          onChange={(val) => handleRowChange(index, "dumping_location", val)}
                          placeholder="Dumping..."
                          id={`dumping_${index}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          value={row.effective_date}
                          onChange={(e) => handleRowChange(index, "effective_date", e.target.value)}
                          required
                          className="h-9 w-full bg-white dark:bg-gray-800 text-sm dark:text-neutral-50 px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          value={row.expiry_date}
                          onChange={(e) => handleRowChange(index, "expiry_date", e.target.value)}
                          className="h-9 w-full bg-white dark:bg-gray-800 text-sm dark:text-neutral-50 px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={row.total_fleet}
                          onChange={(e) => handleRowChange(index, "total_fleet", e.target.value)}
                          required
                          className="h-9 w-full bg-white dark:bg-gray-800 text-sm dark:text-neutral-50 px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="text"
                          value={row.total_tonase}
                          onChange={(e) => handleTonaseChange(index, e)}
                          placeholder="Contoh: 15.5"
                          required
                          className="h-9 w-full bg-white dark:bg-gray-800 text-sm dark:text-neutral-50 px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <SearchableSelect
                          items={workUnitItems}
                          value={row.pic_work_unit}
                          onChange={(val) => handleRowChange(index, "pic_work_unit", val)}
                          placeholder="Pilih PIC..."
                          id={`pic_${index}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(index)}
                          disabled={formList.length === 1}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 w-8 h-8 rounded-full disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex justify-start">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                className="gap-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-600/50 dark:text-blue-400 dark:hover:bg-blue-900/30"
              >
                <Plus className="w-4 h-4" />
                Tambah Baris Form
              </Button>
            </div>

          
          </div>

          <DialogFooter className="shrink-0 pt-4 border-t border-gray-100 dark:border-gray-700 mt-2">
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
              disabled={isLoading || formList.length === 0}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {progress > 0 && documentFile ? `Mengunggah... ${progress}%` : "Menyimpan..."}
                </>
              ) : (
                `Simpan ${formList.length} Rencana`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
