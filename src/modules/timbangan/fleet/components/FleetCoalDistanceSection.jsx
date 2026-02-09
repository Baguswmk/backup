import React from "react";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { InfoCard } from "@/shared/components/InfoCard";

const FleetCoalDistanceSection = ({
  coalTypeItems,
  fleetData,
  setFleetData,
  distanceText,
  setDistanceText,
  errors,
  isSaving,
}) => {
  return (
    <InfoCard
      title="Coal Type & Jarak"
      variant="default"
      className="border-none"
    >
      <div className="space-y-2">
        <Label className="dark:text-gray-300">Coal Type *</Label>
        <SearchableSelect
          items={coalTypeItems}
          value={fleetData.coalType}
          onChange={(val) =>
            setFleetData((p) => ({ ...p, coalType: val || "" }))
          }
          placeholder="Pilih coal type"
          emptyText="Coal type tidak ditemukan"
          error={!!errors.coalType}
          disabled={isSaving}
        />
        {errors.coalType && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.coalType}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="dark:text-gray-300">Distance (m) *</Label>
        <Input
          type="text"
          value={distanceText}
          onFocus={() => {
            if (distanceText === "0" || distanceText === "0.0")
              setDistanceText("");
          }}
          onChange={(e) => setDistanceText(e.target.value.replace(",", "."))}
          onBlur={() => {
            const v = distanceText.trim();
            if (v === "") {
              setDistanceText("0");
              return;
            }
            const n = Number(v);
            if (Number.isFinite(n)) setDistanceText(String(n));
          }}
          placeholder="Masukkan jarak dalam meter"
          disabled={isSaving}
          className="border-none dark:text-gray-300"
        />
        {errors.distance && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.distance}
          </p>
        )}
      </div>
    </InfoCard>
  );
};

export default FleetCoalDistanceSection;