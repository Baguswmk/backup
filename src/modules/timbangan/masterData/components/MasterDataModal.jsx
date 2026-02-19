import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { X, Loader2, Save, Tag, Scale } from "lucide-react";
import SearchableSelect from "@/shared/components/SearchableSelect";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";

const MasterDataModal = ({
  isOpen,
  onClose,
  category,
  editData,
  onSave,
  isSaving,
  companies,
  workUnits,
  locations,
  users,
  MASTER_CATEGORIES,
}) => {
  const [formData, setFormData] = useState(editData || {});
  const [errors, setErrors] = useState({});
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

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

  const companyOptions = useMemo(
    () =>
      companies?.map((c) => ({
        value: String(c.id),
        label: c.name,
      })) || [],
    [companies],
  );

  const workUnitOptions = useMemo(
    () =>
      workUnits?.map((wu) => ({
        value: String(wu.id),
        label: wu.subsatker || wu.satker,
        hint: wu.subsatker || wu.satker,
      })) || [],
    [workUnits],
  );

  const userOptions = useMemo(
    () =>
      users?.map((u) => ({
        value: u.id,
        label: u.username,
        hint: u.name,
      })) || [],
    [users],
  );

  const locationOptions = useMemo(
    () =>
      locations?.map((loc) => ({
        value: loc.id,
        label: loc.name,
        hint: loc.type,
      })) || [],
    [locations],
  );

  const typeOptions = useMemo(() => {
    if (category === "units") {
      return [{ value: "DUMP_TRUCK", label: "Dump Truck" }];
    } else if (category === "alatLoader") {
      return [
        { value: "EXCAVATOR", label: "Excavator" },
        { value: "DOZER", label: "Dozer" },
        { value: "GRADER", label: "Grader" },
      ];
    } else if (category === "locations") {
      return [
        { value: "LOADING", label: "Loading" },
        { value: "DUMPING", label: "Dumping" },
      ];
    }
    return [];
  }, [category]);

  useEffect(() => {
    if (editData) {
      setFormData({
        ...editData,
        companyId: editData.companyId ?? editData.id_company ?? "",
        workUnitId: editData.workUnitId ?? editData.id_work_unit ?? "",
      });

      setSelectedLocations(
        (editData.locationIds || []).map((id) => String(id)),
      );
      setSelectedUsers((editData.userIds || []).map((id) => String(id)));
    } else {
      setFormData({});
      setSelectedLocations([]);
      setSelectedUsers([]);
    }
    setErrors({});
  }, [editData, isOpen]);

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });
  };

  const handleLocationChange = (values) => {
    setSelectedLocations(values);
  };

  const handleUserChange = (values) => {
    setSelectedUsers(values);
  };

  const validateForm = () => {
    const newErrors = {};
    switch (category) {
      case "companies":
        if (!formData.name?.trim()) newErrors.name = "Required";
        break;
      case "units":
      case "alatLoader":
        if (!formData.hull_no?.trim()) newErrors.hull_no = "Required";
        if (!formData.type) newErrors.type = "Required";
        if (
          formData.bypass_tonnage &&
          isNaN(parseFloat(formData.bypass_tonnage))
        ) {
          newErrors.bypass_tonnage = "Harus berupa angka";
        }
        if (
          formData.bypass_tonnage &&
          parseFloat(formData.bypass_tonnage) < 0
        ) {
          newErrors.bypass_tonnage = "Tidak boleh negatif";
        }
        break;
      case "operators":
        if (!formData.name?.trim()) newErrors.name = "Required";
        break;
      case "locations":
        if (!formData.name?.trim()) newErrors.name = "Required";
        if (!formData.type) newErrors.type = "Required";
        break;
      case "work-units":
        if (!formData.satker?.trim()) newErrors.satker = "Required";
        if (!formData.subsatker?.trim()) newErrors.subsatker = "Required";
        break;
      case "coal-types":
        if (!formData.name?.trim()) newErrors.name = "Required";
        break;
      case "weigh-bridge":
        if (!formData.name?.trim()) newErrors.name = "Required";
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const dataToSave = { ...formData };
    if (category === "work-units") {
      dataToSave.locationIds = selectedLocations.map((id) => Number(id));
    }
    if (category === "weigh-bridge") {
      dataToSave.userIds = selectedUsers.map((id) => Number(id));
    }
    onSave(dataToSave);
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && !isSaving) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const renderFormFields = () => {
    switch (category) {
      case "companies":
        return (
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              className={
                errors.name
                  ? "border-red-500"
                  : " border-none bg-gray-200 dark:bg-gray-700"
              }
              placeholder="Enter company name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>
        );

      case "units":
      case "alatLoader":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="hull_no">Hull Number *</Label>
              <Input
                id="hull_no"
                value={formData.hull_no || ""}
                onChange={(e) => updateField("hull_no", e.target.value)}
                className={
                  errors.hull_no
                    ? "border-red-500"
                    : " border-none bg-gray-200 dark:bg-gray-700"
                }
                placeholder="Enter hull number"
              />
              {errors.hull_no && (
                <p className="text-sm text-red-500">{errors.hull_no}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <SearchableSelect
                items={typeOptions}
                value={formData.type || ""}
                onChange={(value) => updateField("type", value)}
                placeholder="Select type"
                error={!!errors.type}
                disabled={isSaving}
              />
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="spph" className="flex items-center gap-2">
                SPPH
              </Label>
              <Input
                id="spph"
                value={formData.spph || ""}
                onChange={(e) => updateField("spph", e.target.value)}
                className="border-none bg-gray-200 dark:bg-gray-700"
                placeholder="Enter SPPH "
              />
            </div>

            {/* RFID Field - Optional */}
            <div className="space-y-2">
              <Label htmlFor="rfid" className="flex items-center gap-2">
                RFID (Opsional)
              </Label>
              <Input
                id="rfid"
                value={formData.rfid || ""}
                onChange={(e) => updateField("rfid", e.target.value)}
                className="border-none bg-gray-200 dark:bg-gray-700"
                placeholder="Enter RFID code"
              />
              <p className="text-xs text-gray-500">
                Kode RFID untuk identifikasi unit
              </p>
            </div>

            {/* Bypass Tonnage Field - Optional, only for units (DUMP_TRUCK) */}
            {category === "units" && (
              <div className="space-y-2">
                <Label
                  htmlFor="bypass_tonnage"
                  className="flex items-center gap-2"
                >
                  Bypass Tonnage (Opsional)
                </Label>
                <Input
                  id="bypass_tonnage"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.bypass_tonnage || ""}
                  onChange={(e) =>
                    updateField("bypass_tonnage", e.target.value)
                  }
                  className={
                    errors.bypass_tonnage
                      ? "border-red-500"
                      : "border-none bg-gray-200 dark:bg-gray-700"
                  }
                  placeholder="0.00"
                />
                {errors.bypass_tonnage && (
                  <p className="text-sm text-red-500">
                    {errors.bypass_tonnage}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Tonase bypass untuk unit ini (dalam ton)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <SearchableSelect
                items={companyOptions}
                value={formData.companyId?.toString() || ""}
                onChange={(value) => updateField("companyId", value)}
                placeholder="Select company"
                disabled={isSaving}
                allowClear={true}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workUnit">Work Unit</Label>
              <SearchableSelect
                items={workUnitOptions}
                value={formData.workUnitId?.toString() || ""}
                onChange={(value) => updateField("workUnitId", value)}
                placeholder="Select work unit"
                disabled={isSaving}
                allowClear={true}
              />
            </div>
          </>
        );

      case "operators":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Operator Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className={
                  errors.name
                    ? "border-red-500"
                    : " border-none bg-gray-200 dark:bg-gray-700"
                }
                placeholder="Enter operator name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <SearchableSelect
                items={companyOptions}
                value={formData.companyId?.toString() || ""}
                onChange={(value) => updateField("companyId", value)}
                placeholder="Select company"
                disabled={isSaving}
                allowClear={true}
              />
            </div>
          </>
        );

      case "locations":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className={
                  errors.name
                    ? "border-red-500"
                    : " border-none bg-gray-200 dark:bg-gray-700"
                }
                placeholder="Enter location name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <SearchableSelect
                items={typeOptions}
                value={formData.type || ""}
                onChange={(value) => updateField("type", value)}
                placeholder="Select type"
                error={!!errors.type}
                disabled={isSaving}
              />
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type}</p>
              )}
            </div>
          </>
        );

      case "work-units":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="satker">Satker *</Label>
              <Input
                id="satker"
                value={formData.satker || ""}
                onChange={(e) => updateField("satker", e.target.value)}
                className={
                  errors.satker
                    ? "border-red-500"
                    : " border-none bg-gray-200 dark:bg-gray-700"
                }
                placeholder="Enter satker"
              />
              {errors.satker && (
                <p className="text-sm text-red-500">{errors.satker}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subsatker">Subsatker *</Label>
              <Input
                id="subsatker"
                value={formData.subsatker || ""}
                onChange={(e) => updateField("subsatker", e.target.value)}
                className={
                  errors.subsatker
                    ? "border-red-500"
                    : " border-none bg-gray-200 dark:bg-gray-700"
                }
                placeholder="Enter subsatker"
              />
              {errors.subsatker && (
                <p className="text-sm text-red-500">{errors.subsatker}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Locations</Label>
              <MultiSearchableSelect
                items={locationOptions}
                values={selectedLocations}
                onChange={handleLocationChange}
                placeholder="Select locations"
                emptyText="No locations available"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500">
                Select multiple locations for this work unit
              </p>
            </div>
          </>
        );

      case "coal-types":
        return (
          <div className="space-y-2">
            <Label htmlFor="name">Coal Type Name *</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              className={
                errors.name
                  ? "border-red-500"
                  : " border-none bg-gray-200 dark:bg-gray-700"
              }
              placeholder="Enter coal type name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>
        );

      case "weigh-bridge":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Bridge Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => updateField("name", e.target.value)}
                className={
                  errors.name
                    ? "border-red-500 "
                    : " border-none bg-gray-200 dark:bg-gray-700"
                }
                placeholder="Enter bridge name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="users">Users / Operators</Label>
              <MultiSearchableSelect
                items={userOptions}
                values={selectedUsers}
                onChange={handleUserChange}
                placeholder="Select users"
                emptyText="No users available"
                disabled={isSaving}
              />
              <p className="text-xs text-gray-500">
                Select users who can operate this weigh bridge
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="detail-modal fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      onKeyDown={handleKeyDown}
    >
      <Card
        className="w-full sm:max-w-md md:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto bg-neutral-50   dark:bg-gray-900 border-none"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="sticky top-0 bg-neutral-50 dark:bg-gray-900 z-10 flex flex-row items-center justify-between pb-3 ">
          <CardTitle className="text-lg">
            {editData ? "Edit" : "Add"}{" "}
            {MASTER_CATEGORIES.find((c) => c.id === category)?.label}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700"
            disabled={isSaving}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {renderFormFields()}
            <div className="flex gap-2 pt-4 ">
              <Button
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-1 cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 "
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isSaving}
                className="flex-1 cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700  "
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterDataModal;
