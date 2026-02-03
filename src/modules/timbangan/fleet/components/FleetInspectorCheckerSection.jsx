import React from "react";
import { Label } from "@/shared/components/ui/label";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";
import { InfoCard } from "@/shared/components/InfoCard";

const FleetInspectorCheckerSection = ({
  inspectorItems,
  checkerItems,
  inspectorIds,
  checkerIds,
  handleInspectorChange,
  handleCheckerChange,
  errors,
  isSaving,
}) => {
  return (
    <InfoCard
      title="Inspector & Checker"
      variant="primary"
      className="border-none"
    >
      <div className="space-y-2">
        <Label className="dark:text-gray-300">Inspector *</Label>
        <MultiSearchableSelect
          items={inspectorItems}
          values={inspectorIds}
          onChange={handleInspectorChange}
          placeholder="Pilih inspector (bisa pilih banyak)"
          emptyText="Inspector tidak ditemukan"
          disabled={isSaving}
          error={!!errors.inspector}
        />
        {errors.inspector && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.inspector}
          </p>
        )}
        {inspectorIds.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {inspectorIds.length} inspector dipilih
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="dark:text-gray-300">Checker *</Label>
        <MultiSearchableSelect
          items={checkerItems}
          values={checkerIds}
          onChange={handleCheckerChange}
          placeholder="Pilih checker (bisa pilih banyak)"
          emptyText="Checker tidak ditemukan"
          error={!!errors.checker}
          disabled={isSaving}
        />
        {errors.checker && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.checker}
          </p>
        )}
        {checkerIds.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {checkerIds.length} checker dipilih
          </p>
        )}
      </div>
    </InfoCard>
  );
};

export default FleetInspectorCheckerSection;

