import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { AlertCircle, Loader2, Calendar, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useUnitLog } from "@/modules/timbangan/fleet/hooks/useUnitLog";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";

/**
 * Modal untuk menambah Unit Log (Breakdown/Service) - Support Multiple Units
 */
const CreateUnitLogModal = ({ isOpen, onClose, unit, onSuccess, mastersLoading , masters }) => {
  const { createUnitLog, isSaving } = useUnitLog();
  
  const [formData, setFormData] = useState({
    entry_date: "",
    status: "",
    units: [], 
    description: "",
  });
  
  const [errors, setErrors] = useState({});

  // Initialize units from prop if single unit is passed
  useEffect(() => {
    if (unit?.id) {
      setFormData((prev) => ({
        ...prev,
        units: [String(unit.id)],
      }));
    }
  }, [unit]);

  useEffect(() => {
    if (isOpen) {
      // Set default entry_date to now
      const now = new Date().toISOString().slice(0, 16);
      setFormData((prev) => ({
        ...prev,
        entry_date: now,
      }));
    } else {
      // Reset form when closed
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      entry_date: "",
      status: "",
      units: unit?.id ? [String(unit.id)] : [],
      description: "",
    });
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.entry_date) {
      newErrors.entry_date = "Tanggal mulai harus diisi";
    }

    if (!formData.status) {
      newErrors.status = "Status harus dipilih";
    }

    if (!formData.units || formData.units.length === 0) {
      newErrors.units = "Minimal pilih 1 unit";
    }

    if (!formData.description || formData.description.trim() === "") {
      newErrors.description = "Keterangan harus diisi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Create unit logs for each selected unit
    let successCount = 0;
    let failedCount = 0;

    for (const unitId of formData.units) {
      const logData = {
        entry_date: formData.entry_date,
        status: formData.status,
        unit: unitId,
        description: formData.description,
      };

      const result = await createUnitLog(logData);
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    // Show success message
    if (successCount > 0) {
      onSuccess?.();
      onClose();
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Transform units data for MultiSearchableSelect
  const unitOptions = masters?.dumpTruck?.map((dt) => ({
    value: dt.id,
    label: dt.hull_no || dt.name || `Unit ${dt.id}`,
    hint: dt.company || "",
  })) || [];

  // Get selected units info for display
  const selectedUnits = masters?.dumpTruck?.filter((dt) =>
    formData.units.includes(String(dt.id))
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tambah Unit Log
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Single Unit Info (when passed from parent) */}
          {unit && formData.units.length === 1 && (
            <Alert>
              <AlertDescription>
                <div className="font-semibold">{unit.hull_no}</div>
                <div className="text-sm text-gray-600">
                  {unit.company || "Unknown Company"}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Entry Date */}
          <div className="space-y-2">
            <Label htmlFor="entry_date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Tanggal Mulai *
            </Label>
            <Input
              id="entry_date"
              type="datetime-local"
              value={formData.entry_date}
              onChange={(e) => handleChange("entry_date", e.target.value)}
              className={errors.entry_date ? "border-red-500" : ""}
            />
            {errors.entry_date && (
              <p className="text-sm text-red-500">{errors.entry_date}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value)}
            >
              <SelectTrigger
                className={errors.status ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BREAKDOWN">Breakdown</SelectItem>
                <SelectItem value="SERVICE">Service / PM</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-500">{errors.status}</p>
            )}
          </div>

          {/* Units Selection (Multi-select) */}
          <div className="space-y-2">
            <Label htmlFor="units">Unit *</Label>
            <MultiSearchableSelect
              items={unitOptions}
              values={formData.units}
              onChange={(values) => handleChange("units", values)}
              placeholder="Pilih unit..."
              emptyText="Unit tidak ditemukan"
              disabled={mastersLoading || (unit && unit.id !== undefined)}
              error={!!errors.units}
            />
            {errors.units && (
              <p className="text-sm text-red-500">{errors.units}</p>
            )}
            {selectedUnits.length > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {selectedUnits.length} unit dipilih
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Keterangan *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Masukkan keterangan detail..."
              rows={4}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {formData.units.length > 1 ? (
                <>
                  <span className="font-semibold">{formData.units.length} unit</span> akan
                  otomatis diubah statusnya menjadi{" "}
                  <span className="font-semibold">
                    {formData.status || "BREAKDOWN/SERVICE"}
                  </span>
                </>
              ) : (
                <>
                  Unit akan otomatis diubah statusnya menjadi{" "}
                  <span className="font-semibold">
                    {formData.status || "BREAKDOWN/SERVICE"}
                  </span>
                </>
              )}
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Modal untuk verifikasi/complete Unit Log
 */
const VerifyUnitLogModal = ({ isOpen, onClose, unitLog, onSuccess }) => {
  const { verifyUnitLog, isSaving } = useUnitLog();
  
  const [completionDate, setCompletionDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Set default completion_date to now
      const now = new Date().toISOString().slice(0, 16);
      setCompletionDate(now);
    } else {
      // Reset form when closed
      setCompletionDate("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!completionDate) {
      setError("Tanggal selesai harus diisi");
      return;
    }

    // Validate completion date is after entry date
    const entryTime = new Date(unitLog.entry_date).getTime();
    const completionTime = new Date(completionDate).getTime();

    if (completionTime <= entryTime) {
      setError("Tanggal selesai harus setelah tanggal mulai");
      return;
    }

    const result = await verifyUnitLog(unitLog.id, completionDate);

    if (result.success) {
      onSuccess?.();
      onClose();
    }
  };

  if (!unitLog) return null;

  const entryDate = new Date(unitLog.entry_date);
  const formattedEntryDate = entryDate.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Verifikasi Unit Log
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Unit Log Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Unit
              </div>
              <div className="font-semibold">
                {unitLog.unit?.hull_no || "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Status
              </div>
              <div className="font-semibold">
                {unitLog.status === "BREAKDOWN" ? "Breakdown" : "Service / PM"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Tanggal Mulai
              </div>
              <div className="font-semibold">{formattedEntryDate}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Keterangan
              </div>
              <div className="text-sm">{unitLog.description}</div>
            </div>
          </div>

          {/* Completion Date */}
          <div className="space-y-2">
            <Label htmlFor="completion_date">Tanggal Selesai *</Label>
            <Input
              id="completion_date"
              type="datetime-local"
              value={completionDate}
              onChange={(e) => {
                setCompletionDate(e.target.value);
                setError("");
              }}
              min={unitLog.entry_date}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Unit akan otomatis diubah statusnya kembali menjadi{" "}
              <span className="font-semibold">ON DUTY</span>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? "Memverifikasi..." : "Verifikasi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { CreateUnitLogModal, VerifyUnitLogModal };