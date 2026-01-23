import React, { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Plus, Edit } from "lucide-react";
import ModalHeader from "@/shared/components/ModalHeader";

const RitaseFormModal = ({ isOpen, mode, ritase, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    ritase || {
      unit_dump_truck: "",
      driver: "",
      company: "",
      net_weight: "",
      shift: "Shift 1",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
    }
  );

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-2xl bg-neutral-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <ModalHeader
          title={mode === "create" ? "Tambah Ritase Baru" : "Edit Ritase"}
          icon={mode === "create" ? Plus : Edit}
          onClose={onClose}
        />

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Unit Dump Truck <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.unit_dump_truck}
                  onChange={(e) =>
                    handleChange("unit_dump_truck", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Contoh: DT-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Nama Driver <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.driver}
                  onChange={(e) => handleChange("driver", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Nama driver"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Mitra/Perusahaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Nama perusahaan"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Berat (Ton) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.net_weight}
                  onChange={(e) => handleChange("net_weight", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Shift <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => handleChange("shift", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
                  required
                >
                  <option value="Shift 1">Shift 1</option>
                  <option value="Shift 2">Shift 2</option>
                  <option value="Shift 3">Shift 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Waktu <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-neutral-50 dark:bg-gray-800 dark:text-gray-200"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {mode === "create" ? "Simpan" : "Update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RitaseFormModal;