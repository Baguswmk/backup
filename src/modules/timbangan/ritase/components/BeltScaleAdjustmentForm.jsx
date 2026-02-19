import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
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
  Loader2,
  Eye,
  RotateCcw,
  CheckCircle2,
  Edit3,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { beltScaleServices } from "@/modules/timbangan/ritase/services/beltscaleServices";
import { useFleet } from "@/modules/timbangan/fleet/hooks/useFleet";
import useAuthStore from "@/modules/auth/store/authStore";
import { formatWeight } from "@/shared/utils/number";
import { showToast } from "@/shared/utils/toast";

const BeltScaleAdjustmentForm = ({ onSubmit }) => {
  const { user } = useAuthStore();
  const { masters } = useFleet(user ? { user } : null);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    shift: "",
    dumping_location: "",
  });

  const SHIFT_OPTIONS = [
    { value: "Shift 1", label: "Shift 1", hint: "22:00 - 06:00" },
    { value: "Shift 2", label: "Shift 2", hint: "06:00 - 14:00" },
    { value: "Shift 3", label: "Shift 3", hint: "14:00 - 22:00" },
  ];

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [fleetList, setFleetList] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFleetIds, setSelectedFleetIds] = useState([]);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [beltscaleWeight, setBeltscaleWeight] = useState("");
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  const [errors, setErrors] = useState({});

  const dumpingLocationOptions = useMemo(() => {
    return (masters.dumpingLocations || []).map((loc) => ({
      value: loc.name,
      label: loc.name,
      hint: loc.type,
    }));
  }, [masters.dumpingLocations]);

  const selectedFleetData = useMemo(() => {
    return fleetList.filter((fleet) => selectedFleetIds.includes(fleet.id));
  }, [fleetList, selectedFleetIds]);

  const totalTonnage = useMemo(() => {
    return selectedFleetData.reduce(
      (sum, fleet) => sum + (fleet.total_tonnage || 0),
      0,
    );
  }, [selectedFleetData]);

  const isAllSelected =
    fleetList.length > 0 && selectedFleetIds.length === fleetList.length;
  const isIndeterminate =
    selectedFleetIds.length > 0 && selectedFleetIds.length < fleetList.length;

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = "Tanggal wajib diisi";
    if (!formData.shift) newErrors.shift = "Shift wajib dipilih";
    if (!formData.dumping_location)
      newErrors.dumping_location = "Dumping location wajib dipilih";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoadPreview = async () => {
    if (!validateForm()) {
      showToast.error("Mohon lengkapi form terlebih dahulu");
      return;
    }

    setIsLoadingPreview(true);

    try {
      const result = await beltScaleServices.getFleetByBeltscale({
        date: formData.date,
        shift: formData.shift,
        dumping_location: formData.dumping_location,
        user,
      });

      if (!result.success) {
        throw new Error(result.error || "Gagal memuat data fleet");
      }

      if (result.data.length === 0) {
        showToast.warning("Tidak ada data fleet untuk filter yang dipilih");
        setFleetList([]);
        setShowPreview(false);
        setSelectedFleetIds([]);
        return;
      }

      setFleetList(
        result.data.map((fleet, index) => ({
          ...fleet,
          id: fleet.id || `temp-${index}-${Date.now()}`,
        })),
      );
      setSelectedFleetIds(
        result.data.map(
          (fleet, index) => fleet.id || `temp-${index}-${Date.now()}`,
        ),
      );
      setShowPreview(true);
      showToast.success(`Preview loaded: ${result.data.length} fleet`);
    } catch (error) {
      showToast.error(error.message || "Gagal memuat preview");
      console.error("Preview error:", error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleToggleFleet = (fleetId) => {
    setSelectedFleetIds((prev) => {
      const isCurrentlySelected = prev.includes(fleetId);
      if (isCurrentlySelected) {
        return prev.filter((id) => id !== fleetId);
      } else {
        return [...prev, fleetId];
      }
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedFleetIds.length === fleetList.length) {
      setSelectedFleetIds([]);
    } else {
      setSelectedFleetIds(fleetList.map((fleet) => fleet.id));
    }
  };

  const handleOpenAdjustModal = () => {
    if (selectedFleetIds.length === 0) {
      showToast.error("Pilih minimal 1 fleet untuk di-adjust");
      return;
    }
    setBeltscaleWeight("");
    setShowAdjustModal(true);
  };

  const handleBeltscaleWeightChange = (value) => {
    setBeltscaleWeight(value);
  };

  const handleSubmitAdjustment = async () => {
    if (!beltscaleWeight || parseFloat(beltscaleWeight) <= 0) {
      showToast.error("Beltscale weight harus lebih dari 0");
      return;
    }

    setIsSubmittingAdjustment(true);

    try {
      const result = await beltScaleServices.submitBeltscaleAdjustment({
        date: formData.date,
        shift: formData.shift,
        dumping_location: formData.dumping_location,
        beltscale: parseFloat(beltscaleWeight),
        created_by_user: user?.id || null,
      });

      if (result?.success) {
        showToast.success(
          result.message || "Beltscale adjustment berhasil disimpan",
        );

        handleReset();
        setShowAdjustModal(false);

        if (onSubmit) {
          onSubmit(result);
        }
      }
    } catch (err) {
      console.error("❌ Beltscale adjustment error:", err);

      const isQueued =
        err?.queued || err?.message?.includes("queued for offline sync");
      const isValidation =
        err?.validationError ||
        (err?.response?.status >= 400 && err?.response?.status < 500);

      if (isQueued) {
        showToast.info(
          "📤 Data disimpan di queue dan akan otomatis tersinkron saat online",
          { duration: 4000 },
        );

        setTimeout(() => {
          handleReset();
          setShowAdjustModal(false);

          if (onSubmit) {
            onSubmit({ success: true, queued: true });
          }
        }, 1000);
      } else if (isValidation) {
        showToast.error(err?.message || "Validasi gagal. Periksa input Anda.");
      } else {
        const errorMsg = err?.message || "Gagal menyimpan adjustment";
        showToast.error(errorMsg);
      }
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleReset = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      shift: "",
      dumping_location: "",
    });
    setFleetList([]);
    setShowPreview(false);
    setSelectedFleetIds([]);
    setBeltscaleWeight("");
    setErrors({});
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Input Form */}
      <Card className="border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg dark:shadow-gray-900/50 bg-neutral-50 dark:bg-gray-800">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Filter Data Beltscale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date */}
            <div>
              <Label
                htmlFor="date"
                className="mb-2 text-gray-700 dark:text-gray-300"
              >
                Tanggal *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left font-normal bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors text-gray-900 dark:text-gray-100"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-400" />
                    {formData.date
                      ? format(new Date(formData.date), "dd MMMM yyyy", {
                          locale: localeId,
                        })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-neutral-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-xl"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={
                      formData.date ? new Date(formData.date) : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        updateField("date", format(date, "yyyy-MM-dd"));
                      }
                    }}
                    locale={localeId}
                    initialFocus
                    className="dark:text-gray-100"
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                  {errors.date}
                </p>
              )}
            </div>

            {/* Shift */}
            <div>
              <Label className="mb-2 text-gray-700 dark:text-gray-300">
                Shift *
              </Label>
              <div className="bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                <SearchableSelect
                  items={SHIFT_OPTIONS}
                  value={formData.shift}
                  onChange={(value) => updateField("shift", value)}
                  placeholder="Pilih shift..."
                  error={!!errors.shift}
                />
              </div>
              {errors.shift && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                  {errors.shift}
                </p>
              )}
            </div>

            {/* Dumping Location */}
            <div>
              <Label className="mb-2 text-gray-700 dark:text-gray-300">
                Dumping Location *
              </Label>
              <div className="bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                <SearchableSelect
                  items={dumpingLocationOptions}
                  value={formData.dumping_location}
                  onChange={(value) => updateField("dumping_location", value)}
                  placeholder="Pilih dumping location..."
                  error={!!errors.dumping_location}
                />
              </div>
              {errors.dumping_location && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                  {errors.dumping_location}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={isLoadingPreview}
              className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <Button
              type="button"
              onClick={handleLoadPreview}
              disabled={isLoadingPreview}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors"
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

      {/* Preview Section - Fleet List */}
      {showPreview && fleetList.length > 0 && (
        <Card className="border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-lg dark:shadow-gray-900/50 bg-neutral-50 dark:bg-gray-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-base text-gray-900 dark:text-white">
              Data Setting Fleet ({selectedFleetIds.length} / {fleetList.length}{" "}
              dipilih)
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Native input checkbox — persis seperti TimbanganList */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleSelectAll}
                className="cursor-pointer border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
              >
                <input
                  type="checkbox"
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={() => {}}
                  tabIndex={-1}
                />
                Select All
              </Button>
              <Button
                onClick={handleOpenAdjustModal}
                disabled={selectedFleetIds.length === 0}
                className="cursor-pointer bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-700"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Adjustment ({selectedFleetIds.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={(e) =>
                          handleToggleSelectAll(e.target.checked)
                        }
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Shift
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Excavator
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Loading
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Dumping
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Coal Type
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Jarak (km)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Total Tonnage
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {fleetList.map((fleet) => {
                    const isChecked = selectedFleetIds.includes(fleet.id);
                    return (
                      <tr
                        key={fleet.id}
                        className={`transition-colors cursor-pointer ${
                          isChecked
                            ? "bg-blue-50 dark:bg-blue-950/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        }`}
                        onClick={() => handleToggleFleet(fleet.id)}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleToggleFleet(fleet.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {fleet.date
                            ? format(new Date(fleet.date), "dd MMM yyyy", {
                                locale: localeId,
                              })
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="dark:text-gray-300 dark:border-gray-600"
                          >
                            {fleet.shift || "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="font-semibold bg-blue-600 dark:bg-blue-600 text-white">
                            {fleet.unit_exca || "-"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {fleet.loading_location || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {fleet.dumping_location || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {fleet.coal_type || "-"}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-gray-100">
                          {fleet.distance || 0}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {formatWeight(fleet.total_tonnage || 0)} ton
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-900/50 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-3 text-right text-gray-900 dark:text-gray-200"
                    >
                      Total Tonnage (Selected):
                    </td>
                    <td className="px-4 py-3 text-right text-lg text-green-600 dark:text-green-400">
                      {formatWeight(totalTonnage)} ton
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Info */}
      {!showPreview && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800/50">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-gray-900 dark:text-gray-100">
            <p className="font-medium mb-2">Cara Penggunaan:</p>
            <ol className="text-sm space-y-1 ml-4 list-decimal text-gray-700 dark:text-gray-300">
              <li>Pilih tanggal, shift, dan dumping location</li>
              <li>Klik "Load Preview" untuk melihat data setting fleet</li>
              <li>
                Pilih fleet mana saja yang ingin di-adjust (default: semua fleet
                dipilih)
              </li>
              <li>Klik tombol "Adjustment" untuk input net weight Beltscale</li>
              <li>Konfirmasi dan submit adjustment</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {/* Modal: Input Net Weight Beltscale */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 bg-neutral-50 dark:bg-gray-800">
            <CardHeader className="sticky top-0 bg-neutral-50 dark:bg-gray-800 z-10 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Input Net Weight Beltscale
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdjustModal(false)}
                  className="h-8 w-8 p-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Summary Info */}
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800/50">
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-900 dark:text-blue-200">
                        Tanggal:
                      </span>
                      <span className="text-blue-800 dark:text-blue-100">
                        {format(new Date(formData.date), "dd MMM yyyy", {
                          locale: localeId,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-900 dark:text-blue-200">
                        Shift:
                      </span>
                      <Badge
                        variant="outline"
                        className="dark:border-blue-600 dark:text-blue-300"
                      >
                        {formData.shift}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-900 dark:text-blue-200">
                        Dumping:
                      </span>
                      <span className="text-blue-800 dark:text-blue-100">
                        {formData.dumping_location}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-900 dark:text-blue-200">
                        Fleet Selected:
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {selectedFleetIds.length} fleet
                      </span>
                    </div>
                    <div className="flex justify-between col-span-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <span className="font-medium text-blue-900 dark:text-blue-200">
                        Total Tonnage Original:
                      </span>
                      <span className="font-bold text-lg text-blue-800 dark:text-blue-100">
                        {formatWeight(totalTonnage)} ton
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Input Net Weight */}
              <div>
                <Label
                  htmlFor="beltscale_weight"
                  className="mb-2 text-gray-700 dark:text-gray-300"
                >
                  Net Weight Beltscale (ton) *
                </Label>
                <Input
                  id="beltscale_weight"
                  type="text"
                  inputMode="decimal"
                  value={beltscaleWeight}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d{0,3}$/.test(value)) {
                      handleBeltscaleWeightChange(value);
                    }
                  }}
                  placeholder="0.00"
                  className="text-lg font-semibold bg-neutral-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Masukkan total berat aktual dari Beltscale
                </p>
              </div>

              {/* Preview Difference */}
              {beltscaleWeight && parseFloat(beltscaleWeight) > 0 && (
                <Alert
                  className={`${
                    parseFloat(beltscaleWeight) > totalTonnage
                      ? "border-green-200 bg-green-50 dark:bg-green-950/50 dark:border-green-800/50"
                      : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/50 dark:border-yellow-800/50"
                  }`}
                >
                  <AlertDescription>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Selisih:
                      </span>
                      <span
                        className={`text-xl font-bold ${
                          parseFloat(beltscaleWeight) > totalTonnage
                            ? "text-green-600 dark:text-green-400"
                            : "text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        {parseFloat(beltscaleWeight) > totalTonnage ? "+" : ""}
                        {formatWeight(
                          parseFloat(beltscaleWeight) - totalTonnage,
                        )}{" "}
                        ton
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warning */}
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-800/50">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <p className="font-medium">Perhatian!</p>
                  <p className="text-sm mt-1">
                    Adjustment ini akan mengubah net weight dan gross weight
                    untuk semua ritase dalam {selectedFleetIds.length} fleet
                    yang dipilih. Proses ini tidak dapat dibatalkan.
                  </p>
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowAdjustModal(false)}
                  disabled={isSubmittingAdjustment}
                  className="cursor-pointer border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSubmitAdjustment}
                  disabled={
                    !beltscaleWeight ||
                    parseFloat(beltscaleWeight) <= 0 ||
                    isSubmittingAdjustment
                  }
                  className="cursor-pointer bg-green-600 hover:bg-green-700"
                >
                  {isSubmittingAdjustment ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Submit Adjustment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BeltScaleAdjustmentForm;
