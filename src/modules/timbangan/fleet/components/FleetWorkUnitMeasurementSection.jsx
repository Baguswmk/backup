import React from "react";
import { Label } from "@/shared/components/ui/label";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { InfoCard } from "@/shared/components/InfoCard";
import { MEASUREMENT_TYPE_OPTIONS } from "@/modules/timbangan/fleet/constant/fleetConstants";

const FleetWorkUnitMeasurementSection = ({
  workUnitItems,
  fleetData,
  setFleetData,
  errors,
  isSaving,
}) => {
  return (
    <InfoCard
      title="Work Unit & Measurement Type"
      variant="default"
      className="border-none"
    >
      <div className="md:col-span-1 space-y-2">
        <Label className="dark:text-gray-300">Work Unit *</Label>
        <SearchableSelect
          items={workUnitItems}
          value={fleetData.workUnit}
          onChange={(val) =>
            setFleetData((p) => ({ ...p, workUnit: val || "" }))
          }
          placeholder="Pilih work unit"
          emptyText="Work unit tidak ditemukan"
          error={!!errors.workUnit}
          disabled={isSaving}
        />
        {errors.workUnit && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.workUnit}
          </p>
        )}
      </div>

      <div className="md:col-span-1 space-y-2">
        <Label className="dark:text-gray-300">Measurement Type *</Label>
        <SearchableSelect
          items={MEASUREMENT_TYPE_OPTIONS}
          value={fleetData.measurementType}
          onChange={(val) => {
            setFleetData((p) => ({ ...p, measurementType: val || "" }));
          }}
          placeholder="Pilih measurement type"
          emptyText="Measurement type tidak ditemukan"
          error={!!errors.measurementType}
          disabled={isSaving}
        />
        {errors.measurementType && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.measurementType}
          </p>
        )}
      </div>
    </InfoCard>
  );
};

export default FleetWorkUnitMeasurementSection;