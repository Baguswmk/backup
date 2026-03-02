import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { ArrowRight, Truck, AlertCircle, Info, Loader2, X } from "lucide-react";
import SearchableSelect from "@/shared/components/SearchableSelect";
import ModalHeader from "@/shared/components/ModalHeader";

/**
 * Dialog untuk transfer DT antar fleet
 * Prinsip:
 * 1. Fleet boleh kosong (valid state)
 * 2. Tidak ada auto-delete
 * 3. Move = pindah ownership
 * 4. User harus paham konsekuensi
 */
const FleetTransferDialog = ({
  isOpen,
  onClose,
  fleetConfigs = [],
  onTransfer,
  isTransferring = false,
}) => {
  const [sourceFleetId, setSourceFleetId] = useState("");
  const [targetFleetId, setTargetFleetId] = useState("");
  const [selectedDTs, setSelectedDTs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Get source fleet data
  const sourceFleet = useMemo(() => {
    if (!sourceFleetId) return null;
    return fleetConfigs.find((f) => String(f.id) === String(sourceFleetId));
  }, [sourceFleetId, fleetConfigs]);

  // Get target fleet data
  const targetFleet = useMemo(() => {
    if (!targetFleetId) return null;
    return fleetConfigs.find((f) => String(f.id) === String(targetFleetId));
  }, [targetFleetId, fleetConfigs]);

  // Get DTs from source fleet
  const sourceDTs = useMemo(() => {
    if (!sourceFleet?.dumpTrucks) return [];
    return sourceFleet.dumpTrucks.map((dt) => ({
      id: dt.id,
      hullNo: dt.hullNo,
      companyName: dt.companyName,
      operatorName: dt.operatorName,
    }));
  }, [sourceFleet]);

  // Source fleet options (must have DTs)
  const sourceFleetOptions = useMemo(() => {
    return fleetConfigs
      .filter(
        (f) =>
          String(f.id) !== String(targetFleetId) &&
          f.dumpTrucks &&
          f.dumpTrucks.length > 0,
      )
      .map((f) => ({
        value: String(f.id),
        label: `${f.excavatorName || "No Exca"} - ${f.loadingLocationName || "No Loading"} → ${f.dumpingLocationName || "No Dumping"} (${f.dumpTrucks?.length || 0} DT)`,
      }));
  }, [fleetConfigs, targetFleetId]);

  // Target fleet options
  const targetFleetOptions = useMemo(() => {
    return fleetConfigs
      .filter((f) => String(f.id) !== String(sourceFleetId))
      .map((f) => ({
        value: String(f.id),
        label: `${f.excavatorName || "No Exca"} - ${f.loadingLocationName || "No Loading"} → ${f.dumpingLocationName || "No Dumping"} (${f.dumpTrucks?.length || 0} DT)`,
      }));
  }, [fleetConfigs, sourceFleetId]);

  // Calculate remaining DTs
  const remainingSourceDTs = sourceDTs.length - selectedDTs.length;
  const newTargetDTCount =
    (targetFleet?.dumpTrucks?.length || 0) + selectedDTs.length;
  const willSourceBeEmpty = remainingSourceDTs === 0;

  // Validation
  const isTransferValid =
    sourceFleetId &&
    targetFleetId &&
    selectedDTs.length > 0 &&
    sourceFleetId !== targetFleetId;

  // Handlers
  const handleToggleDT = useCallback((dtId) => {
    setSelectedDTs((prev) => {
      const isSelected = prev.includes(dtId);
      if (isSelected) {
        return prev.filter((id) => id !== dtId);
      }
      return [...prev, dtId];
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked) => {
      setSelectAll(checked);
      if (checked) {
        setSelectedDTs(sourceDTs.map((dt) => dt.id));
      } else {
        setSelectedDTs([]);
      }
    },
    [sourceDTs],
  );

  const handleReset = useCallback(() => {
    setSourceFleetId("");
    setTargetFleetId("");
    setSelectedDTs([]);
    setSelectAll(false);
  }, []);

  const handleConfirmTransfer = useCallback(async () => {
    if (!isTransferValid) return;

    const result = await onTransfer(sourceFleetId, targetFleetId, selectedDTs);

    if (result?.success) {
      handleReset();
      onClose();
    }
  }, [
    isTransferValid,
    onTransfer,
    sourceFleetId,
    targetFleetId,
    selectedDTs,
    handleReset,
    onClose,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <ModalHeader
          title="Transfer Dump Truck Antar Fleet"
          icon={ArrowRight}
          onClose={onClose}
        />

        <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin flex-1">
          {/* Fleet Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Fleet */}
            <div className="space-y-2">
              <Label className="dark:text-gray-300">Fleet Sumber *</Label>
              <SearchableSelect
                items={sourceFleetOptions}
                value={sourceFleetId}
                onChange={(value) => {
                  setSourceFleetId(value);
                  setSelectedDTs([]);
                  setSelectAll(false);
                }}
                placeholder="Pilih fleet sumber"
                emptyText="Tidak ada fleet dengan DT"
                disabled={isTransferring}
              />
            </div>

            {/* Target Fleet */}
            <div className="space-y-2">
              <Label className="dark:text-gray-300">Fleet Tujuan *</Label>
              <SearchableSelect
                items={targetFleetOptions}
                value={targetFleetId}
                onChange={setTargetFleetId}
                placeholder="Pilih fleet tujuan"
                emptyText="Tidak ada fleet tersedia"
                disabled={isTransferring || !sourceFleetId}
              />
            </div>
          </div>

          {/* Warning jika fleet sama */}
          {sourceFleetId &&
            targetFleetId &&
            sourceFleetId === targetFleetId && (
              <Alert
                variant="destructive"
                className="dark:bg-red-900/20 dark:border-red-800"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Fleet sumber dan tujuan tidak boleh sama!
                </AlertDescription>
              </Alert>
            )}

          {/* DT Selection */}
          {sourceFleetId && sourceDTs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="dark:text-gray-300">
                  Pilih Dump Truck ({selectedDTs.length}/{sourceDTs.length})
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    disabled={isTransferring}
                  />
                  <Label className="text-sm cursor-pointer dark:text-gray-400">
                    Pilih Semua
                  </Label>
                </div>
              </div>

              <div className="border dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto scrollbar-thin">
                {sourceDTs.map((dt) => {
                  const isSelected = selectedDTs.includes(dt.id);
                  return (
                    <div
                      key={dt.id}
                      className={`p-3 border-b dark:border-gray-700 last:border-b-0 transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleDT(dt.id)}
                          disabled={isTransferring}
                        />
                        <Truck
                          className={`w-4 h-4 ${
                            isSelected
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-400"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm dark:text-gray-200">
                            {dt.hullNo}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {dt.companyName} • Operator: {dt.operatorName}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transfer Preview */}
          {isTransferValid && (
            <div className="space-y-3">
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm dark:text-blue-300">
                  <strong>Preview Transfer:</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Fleet Sumber: {remainingSourceDTs} DT tersisa</li>
                    <li>• Fleet Tujuan: {newTargetDTCount} DT total</li>
                    <li>• DT yang dipindah: {selectedDTs.length}</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Warning jika fleet akan kosong */}
              {willSourceBeEmpty && (
                <Alert className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-sm dark:text-orange-300">
                    <strong>⚠️ Perhatian:</strong> Fleet sumber akan kosong (0
                    DT) setelah transfer. Fleet kosong adalah valid, tapi
                    pastikan ini memang yang Anda inginkan.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isTransferring}
            className="dark:text-gray-200"
          >
            Batal
          </Button>
          <Button
            onClick={handleConfirmTransfer}
            disabled={!isTransferValid || isTransferring}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isTransferring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Memindahkan...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Transfer {selectedDTs.length} DT
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FleetTransferDialog;
