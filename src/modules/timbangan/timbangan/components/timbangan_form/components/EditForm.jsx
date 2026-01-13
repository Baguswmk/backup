import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Calendar } from "@/shared/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import SearchableSelect from "@/shared/components/SearchableSelect";
import {
  Weight,
  Truck,
  MapPin,
  Calendar as CalendarIcon,
  AlertCircle,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

const EditForm = ({
  editingItem,
  formData,
  errors,
  formOptions,
  updateField,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Original Data Info */}
      <Card className="border-blue-200 bg-blue-50 mt-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-blue-800">
            <CalendarIcon className="w-4 h-4" />
            Data Original
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Dibuat:</span>
                <span className="font-medium ml-2">
                  {editingItem?.createdAt
                    ? format(
                        new Date(editingItem.createdAt),
                        "dd MMM yyyy | HH:mm:ss",
                        { locale: localeId }
                      )
                    : "-"}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Original Date:</span>
                <span className="font-medium ml-2">
                  {editingItem?.date || "-"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Weight Data */}
        <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Weight className="w-4 h-4" />
              Weight Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="gross_weight_edit" className="pb-2">
                  Gross Weight (ton) *
                </Label>
                <Input
                  id="gross_weight_edit"
                  type="text"
                  inputMode="decimal"
                  value={formData.gross_weight}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      updateField("gross_weight", value);
                      return;
                    }
                    const regex = /^\d*\.?\d{0,2}$/;
                    if (!regex.test(value)) return;
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 999.99) return;
                    updateField("gross_weight", value);
                  }}
                  className={errors.gross_weight ? "border-red-500" : ""}
                  placeholder="0.00"
                />
                {errors.gross_weight && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.gross_weight}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Maksimal 999.99 ton
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unit Information */}
        <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="w-4 h-4" />
              Unit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="pb-2">Unit Dump Truck *</Label>
                <SearchableSelect
                  items={formOptions.dumptruckOptions}
                  value={formData.unit_dump_truck}
                  onChange={(value) => updateField("unit_dump_truck", value)}
                  placeholder="Pilih dump truck..."
                  error={!!errors.unit_dump_truck}
                />
                {errors.unit_dump_truck && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.unit_dump_truck}
                  </p>
                )}
              </div>

              <div>
                <Label className="pb-2">Unit Excavator *</Label>
                <SearchableSelect
                  items={formOptions.excavatorOptions}
                  value={formData.unit_exca}
                  onChange={(value) => updateField("unit_exca", value)}
                  placeholder="Pilih excavator..."
                  error={!!errors.unit_exca}
                />
                {errors.unit_exca && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.unit_exca}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" />
              Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="pb-2">Loading Location *</Label>
                <SearchableSelect
                  items={formOptions.loadingLocationOptions}
                  value={formData.loading_location}
                  onChange={(value) => updateField("loading_location", value)}
                  placeholder="Pilih loading location..."
                  error={!!errors.loading_location}
                />
                {errors.loading_location && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.loading_location}
                  </p>
                )}
              </div>

              <div>
                <Label className="pb-2">Dumping Location *</Label>
                <SearchableSelect
                  items={formOptions.dumpingLocationOptions}
                  value={formData.dumping_location}
                  onChange={(value) => updateField("dumping_location", value)}
                  placeholder="Pilih dumping location..."
                  error={!!errors.dumping_location}
                />
                {errors.dumping_location && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.dumping_location}
                  </p>
                )}
              </div>

              <div>
                <Label className="pb-2">PIC Work Unit *</Label>
                <SearchableSelect
                  items={formOptions.workUnitOptions}
                  value={formData.pic_work_unit}
                  onChange={(value) => updateField("pic_work_unit", value)}
                  placeholder="Pilih work unit..."
                  error={!!errors.pic_work_unit}
                />
                {errors.pic_work_unit && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.pic_work_unit}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="w-4 h-4" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="pb-2" htmlFor="date">
                  Date *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      disabled={isSubmitting}
                      className="w-full cursor-pointer hover:bg-gray-200 justify-start text-left font-normal dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date
                        ? format(new Date(formData.date), "dd MMMM yyyy", {
                            locale: localeId,
                          })
                        : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-white border-none dark:bg-gray-800 dark:border-gray-700"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={
                        formData.date ? new Date(formData.date) : undefined
                      }
                      onSelect={(date) => {
                        if (!date) return;
                        updateField("date", format(date, "yyyy-MM-dd"));
                      }}
                      locale={localeId}
                      disabled={isSubmitting}
                      initialFocus
                      className="dark:text-gray-200"
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && (
                  <p className="text-sm text-red-500 mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <Label className="pb-2">Shift *</Label>
                <SearchableSelect
                  items={formOptions.shiftOptions}
                  value={formData.shift}
                  onChange={(value) => updateField("shift", value)}
                  placeholder="Pilih shift..."
                  error={!!errors.shift}
                />
                {errors.shift && (
                  <p className="text-sm text-red-500 mt-1">{errors.shift}</p>
                )}
              </div>

              <div>
                <Label className="pb-2" htmlFor="distance">
                  Distance (m) *
                </Label>
                <Input
                  id="distance"
                  type="number"
                  value={formData.distance}
                  onChange={(e) => updateField("distance", e.target.value)}
                  className={errors.distance ? "border-red-500" : ""}
                />
                {errors.distance && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.distance}
                  </p>
                )}
              </div>

              <div>
                <Label className="pb-2">Coal Type *</Label>
                <SearchableSelect
                  items={formOptions.coalTypeOptions}
                  value={formData.coal_type}
                  onChange={(value) => updateField("coal_type", value)}
                  placeholder="Pilih coal type..."
                  error={!!errors.coal_type}
                />
                {errors.coal_type && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.coal_type}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-1">
                Mohon perbaiki {Object.keys(errors).length} kesalahan berikut:
              </p>
              <ul className="text-sm space-y-1 mt-2">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Form Actions */}
        <Card className="border-none dark:bg-gray-800 dark:text-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-30 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default EditForm;