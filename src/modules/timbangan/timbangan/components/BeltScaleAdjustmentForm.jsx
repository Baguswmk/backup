import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Calendar as CalendarIcon,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Loader2,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Edit3,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { beltScaleServices } from "@/modules/timbangan/timbangan/services/beltscaleServices";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { formatWeight } from "@/shared/utils/number";
import { showToast } from "@/shared/utils/toast";

const BypassAdjustmentForm = ({ onSubmit, isSubmitting = false }) => {
  const { user } = useAuthStore();
  const { masters } = useFleet(user ? { user } : null);

  // Form State
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    shift: "",
    dumping_point: "",
  });

  // Preview State
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewRitases, setPreviewRitases] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [beltscaleWeight, setBeltscaleWeight] = useState("");
  const [adjustmentPreview, setAdjustmentPreview] = useState(null);

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [finalAdjustmentData, setFinalAdjustmentData] = useState(null);

  // Validation
  const [errors, setErrors] = useState({});

  // Options
  const shiftOptions = useMemo(() => {
    return (masters.shifts || []).map((s) => ({
      value: s.name,
      label: s.name,
      hint: s.hours,
    }));
  }, [masters.shifts]);

  const dumpingLocationOptions = useMemo(() => {
    return (masters.dumpingLocations || []).map((loc) => ({
      value: loc.name,
      label: loc.name,
      hint: loc.type,
    }));
  }, [masters.dumpingLocations]);

  // Group ritases by setting_fleet (excavator)
  const groupedFleets = useMemo(() => {
    if (!previewRitases || previewRitases.length === 0) return [];

    const groups = {};
    previewRitases.forEach((ritase) => {
      const key = `${ritase.excavator}_${ritase.dumping_location}`;
      if (!groups[key]) {
        groups[key] = {
          excavator: ritase.excavator,
          dumping_location: ritase.dumping_location,
          ritases: [],
          total_original: 0,
          dump_trucks: new Set(),
        };
      }
      groups[key].ritases.push(ritase);
      groups[key].total_original += ritase.net_weight_original;
      groups[key].dump_trucks.add(ritase.hull_no);
    });

    return Object.values(groups).map((group) => ({
      ...group,
      dump_trucks: Array.from(group.dump_trucks),
    }));
  }, [previewRitases]);

  // Update field
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = "Tanggal wajib diisi";
    if (!formData.shift) newErrors.shift = "Shift wajib dipilih";
    if (!formData.dumping_point) newErrors.dumping_point = "Dumping point wajib dipilih";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Load preview
  const handleLoadPreview = async () => {
    if (!validateForm()) {
      showToast.error("Mohon lengkapi form terlebih dahulu");
      return;
    }

    setIsLoadingPreview(true);

    try {
      const result = await beltScaleServices.fetchRitasesForAdjustment({
        date: formData.date,
        shift: formData.shift,
        dumping_point: formData.dumping_point,
      });

      if (!result.success) {
        throw new Error(result.error || "Gagal memuat data ritase");
      }

      if (result.data.length === 0) {
        showToast.warning("Tidak ada data ritase untuk filter yang dipilih");
        setPreviewRitases([]);
        setShowPreview(false);
        return;
      }

      setPreviewRitases(result.data);
      setShowPreview(true);
      showToast.success(`Preview loaded: ${result.data.length} ritase`);
    } catch (error) {
      showToast.error(error.message || "Gagal memuat preview");
      console.error("Preview error:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle adjust fleet
  const handleAdjustFleet = (fleet) => {
    setSelectedFleet(fleet);
    setBeltscaleWeight("");
    setAdjustmentPreview(null);
    setShowAdjustModal(true);
  };

  // Calculate adjustment when beltscale weight changes
  const calculateAdjustmentPreview = (weight) => {
    if (!selectedFleet || !weight || parseFloat(weight) <= 0) {
      setAdjustmentPreview(null);
      return;
    }

    const adjustment = beltScaleServices.calculateAdjustment(
      selectedFleet.ritases,
      parseFloat(weight)
    );

    if (adjustment.success) {
      setAdjustmentPreview(adjustment.data);
    }
  };

  // Handle beltscale weight change
  const handleBeltscaleWeightChange = (value) => {
    setBeltscaleWeight(value);
    calculateAdjustmentPreview(value);
  };

  // Handle save from adjust modal
  const handleSaveAdjustment = () => {
    if (!beltscaleWeight || parseFloat(beltscaleWeight) <= 0) {
      showToast.error("Net weight BeltScale harus lebih dari 0");
      return;
    }

    if (!adjustmentPreview) {
      showToast.error("Gagal menghitung adjustment");
      return;
    }

    // Prepare final data
    setFinalAdjustmentData({
      ...formData,
      net_weight_bypass: parseFloat(beltscaleWeight),
      ritases: adjustmentPreview.ritases,
      summary: adjustmentPreview.summary,
      fleet: selectedFleet,
    });

    // Close adjust modal and show confirmation
    setShowAdjustModal(false);
    setShowConfirmModal(true);
  };

  // Handle final submit
  const handleFinalSubmit = async () => {
    if (!finalAdjustmentData) return;

    try {
      const result = await beltScaleServices.submitBypassAdjustment({
        date: finalAdjustmentData.date,
        shift: finalAdjustmentData.shift,
        dumping_point: finalAdjustmentData.dumping_point,
        net_weight_bypass: finalAdjustmentData.net_weight_bypass,
        ritases: finalAdjustmentData.ritases,
        created_by_user: user?.id || null,
      });

      if (result.success) {
        showToast.success(result.message || "Adjustment berhasil disimpan");

        // Reset all states
        handleReset();
        setShowConfirmModal(false);

        if (onSubmit) {
          onSubmit(result);
        }
      }
    } catch (error) {
      showToast.error(error.message || "Gagal menyimpan adjustment");
    }
  };

  // Reset
  const handleReset = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      shift: "",
      dumping_point: "",
    });
    setPreviewRitases([]);
    setShowPreview(false);
    setSelectedFleet(null);
    setBeltscaleWeight("");
    setAdjustmentPreview(null);
    setFinalAdjustmentData(null);
    setErrors({});
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Input Form */}
      <Card className="border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Filter Data BeltScale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <Label htmlFor="date" className="mb-2">
                Tanggal *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left font-normal bg-gray-200 cursor-pointer"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date
                      ? format(new Date(formData.date), "dd MMMM yyyy", {
                          locale: localeId,
                        })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date ? new Date(formData.date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        updateField("date", format(date, "yyyy-MM-dd"));
                      }
                    }}
                    locale={localeId}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-sm text-red-500 mt-1">{errors.date}</p>
              )}
            </div>

            {/* Shift */}
            <div>
              <Label className="mb-2">Shift *</Label>
              <div className="bg-gray-200 rounded">
                <SearchableSelect
                  items={shiftOptions}
                  value={formData.shift}
                  onChange={(value) => updateField("shift", value)}
                  placeholder="Pilih shift..."
                  error={!!errors.shift}
                />
              </div>
              {errors.shift && (
                <p className="text-sm text-red-500 mt-1">{errors.shift}</p>
              )}
            </div>

            {/* Dumping Point */}
            <div>
              <Label className="mb-2">Dumping Point *</Label>
              <div className="bg-gray-200 rounded">
                <SearchableSelect
                  items={dumpingLocationOptions}
                  value={formData.dumping_point}
                  onChange={(value) => updateField("dumping_point", value)}
                  placeholder="Pilih dumping point..."
                  error={!!errors.dumping_point}
                />
              </div>
              {errors.dumping_point && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.dumping_point}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isLoadingPreview}
              className="cursor-pointer hover:bg-gray-200"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <Button
              type="button"
              onClick={handleLoadPreview}
              disabled={isLoadingPreview}
              className="cursor-pointer hover:bg-gray-200"
            >
              {isLoadingPreview ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Load Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section - Grouped by Fleet */}
      {showPreview && groupedFleets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Data Setting Fleet & Dump Truck
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Excavator
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Dumping Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      Dump Trucks
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">
                      Jumlah Ritase
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">
                      Total Net Weight (ton)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedFleets.map((fleet, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-semibold">
                          {fleet.excavator}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{fleet.dumping_location}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {fleet.dump_trucks.map((truck, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {truck}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-blue-600">
                          {fleet.ritases.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {formatWeight(fleet.total_original)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleAdjustFleet(fleet)}
                          className="cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Info */}
      {!showPreview && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Cara Penggunaan:</p>
            <ol className="text-sm space-y-1 ml-4 list-decimal">
              <li>Pilih tanggal, shift, dan dumping point</li>
              <li>Klik "Load Preview" untuk melihat data setting fleet</li>
              <li>Pilih fleet yang ingin di-adjust dengan klik tombol "Adjust"</li>
              <li>Input net weight BeltScale pada popup</li>
              <li>Review dan konfirmasi adjustment</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {/* Modal: Input Net Weight BeltScale */}
      {showAdjustModal && selectedFleet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-auto">
            <CardHeader className="sticky top-0 bg-white z-10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Input Net Weight BeltScale
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdjustModal(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Fleet Info */}
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Excavator:</span>
                      <Badge variant="outline">{selectedFleet.excavator}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Dumping Point:</span>
                      <span>{selectedFleet.dumping_location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Jumlah Ritase:</span>
                      <span className="font-bold text-blue-600">
                        {selectedFleet.ritases.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Total Original:</span>
                      <span className="font-bold">
                        {formatWeight(selectedFleet.total_original)} ton
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Input Net Weight */}
              <div>
                <Label htmlFor="beltscale_weight" className="mb-2">
                  Net Weight BeltScale (ton) *
                </Label>
                <Input
                  id="beltscale_weight"
                  type="text"
                  inputMode="decimal"
                  value={beltscaleWeight}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                      handleBeltscaleWeightChange(value);
                    }
                  }}
                  placeholder="0.00"
                  className="text-lg font-semibold"
                />
              </div>

              {/* Preview Adjustment Summary */}
              {adjustmentPreview && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span>Adjustment Factor:</span>
                        <Badge variant="outline" className="font-mono">
                          {adjustmentPreview.summary.adjustment_factor}x
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Total After Adjust:</span>
                        <span className="font-bold text-green-600">
                          {formatWeight(adjustmentPreview.summary.total_adjusted)}{" "}
                          ton
                        </span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span>Difference:</span>
                        <span
                          className={`font-bold ${
                            adjustmentPreview.summary.difference >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {adjustmentPreview.summary.difference >= 0 ? "+" : ""}
                          {formatWeight(adjustmentPreview.summary.difference)} ton
                        </span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Detail Ritase */}
              {adjustmentPreview && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Detail Ritase:</h4>
                  <div className="max-h-60 overflow-y-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs">
                            Hull No
                          </th>
                          <th className="px-3 py-2 text-center text-xs">
                            Original
                          </th>
                          <th className="px-3 py-2 text-center text-xs">
                            Adjusted
                          </th>
                          <th className="px-3 py-2 text-center text-xs">
                            Diff
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustmentPreview.ritases.map((ritase) => (
                          <tr key={ritase.id} className="border-b">
                            <td className="px-3 py-2 font-mono font-semibold text-blue-600">
                              {ritase.hull_no}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {formatWeight(ritase.net_weight_original)}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-green-600">
                              {formatWeight(ritase.net_weight_adjusted)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`${
                                  ritase.difference >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {ritase.difference >= 0 ? "+" : ""}
                                {formatWeight(ritase.difference)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAdjustModal(false)}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSaveAdjustment}
                  disabled={
                    !beltscaleWeight ||
                    parseFloat(beltscaleWeight) <= 0 ||
                    !adjustmentPreview
                  }
                  className="cursor-pointer bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lanjut ke Konfirmasi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Confirmation */}
      {showConfirmModal && finalAdjustmentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="border-b bg-yellow-50">
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="w-5 h-5" />
                Konfirmasi Adjustment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertDescription>
                  <p className="font-medium text-yellow-900 mb-2">
                    Pastikan data berikut sudah benar:
                  </p>
                </AlertDescription>
              </Alert>

              {/* Summary Info */}
              <div className="space-y-3 text-sm border rounded p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Tanggal:</span>
                    <span>
                      {format(
                        new Date(finalAdjustmentData.date),
                        "dd MMMM yyyy",
                        { locale: localeId }
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Shift:</span>
                    <Badge>{finalAdjustmentData.shift}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Dumping Point:</span>
                    <span>{finalAdjustmentData.dumping_point}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Excavator:</span>
                    <Badge variant="outline">
                      {finalAdjustmentData.fleet.excavator}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">
                        Jumlah Ritase
                      </div>
                      <div className="text-xl font-bold text-blue-600">
                        {finalAdjustmentData.summary.count}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">
                        Total Original
                      </div>
                      <div className="text-lg font-bold text-gray-700">
                        {formatWeight(finalAdjustmentData.summary.total_original)}{" "}
                        ton
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">
                        Net Weight BeltScale
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatWeight(finalAdjustmentData.net_weight_bypass)} ton
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Adjustment Factor:</span>
                    <Badge variant="outline" className="text-base font-mono">
                      {finalAdjustmentData.summary.adjustment_factor}x
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium">Difference:</span>
                    <span
                      className={`text-lg font-bold ${
                        finalAdjustmentData.summary.difference >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {finalAdjustmentData.summary.difference >= 0 ? "+" : ""}
                      {formatWeight(finalAdjustmentData.summary.difference)} ton
                    </span>
                  </div>
                </div>
              </div>

              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <p className="font-medium">
                    Adjustment ini akan mengubah net weight dan gross weight untuk{" "}
                    {finalAdjustmentData.summary.count} ritase. Proses ini tidak
                    dapat dibatalkan.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="cursor-pointer bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Ya, Submit Adjustment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BypassAdjustmentForm;