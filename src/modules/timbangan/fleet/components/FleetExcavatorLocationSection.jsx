import React from "react";
import { Label } from "@/shared/components/ui/label";
import SearchableSelect from "@/shared/components/SearchableSelect";
import { InfoCard } from "@/shared/components/InfoCard";

const FleetExcavatorLocationSection = ({
  excaItems,
  loadLocItems,
  dumpLocItems,
  fleetData,
  setFleetData,
  errors,
  isSaving,
  handleExcavatorChange,
}) => {
  return (
    <InfoCard
      title="Excavator & Lokasi"
      variant="default"
      className="border-none"
    >
      <div className="space-y-2">
        <Label className="dark:text-gray-300">Excavator *</Label>
        <SearchableSelect
          items={excaItems}
          value={fleetData.excavator}
          onChange={handleExcavatorChange}
          placeholder="Pilih excavator"
          emptyText="Excavator tidak ditemukan"
          error={!!errors.excavator}
          disabled={isSaving}
        />
        {errors.excavator && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.excavator}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="dark:text-gray-300">Loading Location *</Label>
        <SearchableSelect
          items={loadLocItems}
          value={fleetData.loadingLocation}
          onChange={(val) =>
            setFleetData((p) => ({ ...p, loadingLocation: val || "" }))
          }
          placeholder="Pilih lokasi loading"
          emptyText="Lokasi loading tidak ditemukan"
          error={!!errors.loadingLocation}
          disabled={isSaving}
        />
        {errors.loadingLocation && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.loadingLocation}
          </p>
        )}
      </div>

      <div className="md:col-span-2 space-y-2">
        <Label className="dark:text-gray-300">Dumping Location *</Label>
        <SearchableSelect
          items={dumpLocItems}
          value={fleetData.dumpingLocation}
          onChange={(val) =>
            setFleetData((p) => ({ ...p, dumpingLocation: val || "" }))
          }
          placeholder="Pilih lokasi dumping"
          emptyText="Lokasi dumping tidak ditemukan"
          error={!!errors.dumpingLocation}
          disabled={isSaving}
        />
        {errors.dumpingLocation && (
          <p className="text-sm text-red-500 dark:text-red-400">
            {errors.dumpingLocation}
          </p>
        )}
      </div>
    </InfoCard>
  );
};

export default FleetExcavatorLocationSection;

