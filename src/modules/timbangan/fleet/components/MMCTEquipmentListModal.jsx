import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Settings,
  Plus,
  Trash2,
  Save,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { showToast } from "@/shared/utils/toast";
import { mmctEquipmentService } from "@/modules/timbangan/fleet/services/mmctEquipmentService";
import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";

const EQUIPMENT_CATEGORIES = {
  DT_SERVICE: {
    id: "dt_service",
    label: "List DT Service",
    color: "blue",
    icon: "🚛",
  },
  DT_BD: {
    id: "dt_bd",
    label: "List DT BD (Breakdown)",
    color: "red",
    icon: "⚠️",
  },
  EXCA_SERVICE: {
    id: "exca_service",
    label: "List Exca Service",
    color: "green",
    icon: "🏗️",
  },
  EXCA_BD: {
    id: "exca_bd",
    label: "List Exca BD (Breakdown)",
    color: "orange",
    icon: "🔧",
  },
};

const MMCTEquipmentListModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("dt_service");
  const [equipmentLists, setEquipmentLists] = useState({
    dt_service: [],
    dt_bd: [],
    exca_service: [],
    exca_bd: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Get master data for dropdowns
  const { workUnits, isLoading: masterDataLoading } = useMasterData(null);

  // Load equipment lists on modal open
  useEffect(() => {
    if (isOpen) {
      loadEquipmentLists();
    }
  }, [isOpen]);

  const loadEquipmentLists = async () => {
    setIsLoading(true);
    try {
      const data = await mmctEquipmentService.getAllEquipmentLists();
      setEquipmentLists(data);
      setHasChanges(false);
    } catch (error) {
      showToast.error("Gagal memuat data list alat");
      console.error("Load equipment lists error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEquipment = (category) => {
    setEquipmentLists((prev) => ({
      ...prev,
      [category]: [
        ...prev[category],
        {
          id: `temp-${Date.now()}`,
          equipmentType: "",
          equipmentId: null,
          equipmentName: "",
          isNew: true,
        },
      ],
    }));
    setHasChanges(true);
  };

  const handleRemoveEquipment = (category, index) => {
    setEquipmentLists((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  };

  const handleEquipmentChange = (category, index, field, value) => {
    setEquipmentLists((prev) => ({
      ...prev,
      [category]: prev[category].map((item, i) => {
        if (i === index) {
          // When equipment is selected, auto-fill the name
          if (field === "equipmentId") {
            const isDT = category.startsWith("dt_");
            const masterList = isDT ? workUnits : workUnits; // You might need excavator master data
            const selectedEquipment = masterList.find(
              (eq) => eq.id === parseInt(value)
            );
            
            return {
              ...item,
              equipmentId: value,
              equipmentName: selectedEquipment?.name || "",
            };
          }
          
          return {
            ...item,
            [field]: value,
          };
        }
        return item;
      }),
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate all entries
    for (const [category, items] of Object.entries(equipmentLists)) {
      for (const item of items) {
        if (!item.equipmentId || !item.equipmentName) {
          showToast.error(
            `Mohon lengkapi semua data pada ${EQUIPMENT_CATEGORIES[category.toUpperCase()].label}`
          );
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      await mmctEquipmentService.saveAllEquipmentLists(equipmentLists);
      showToast.success("List alat PM/BD MMCT berhasil disimpan!");
      setHasChanges(false);
      
      // Reload data after save
      await loadEquipmentLists();
    } catch (error) {
      showToast.error("Gagal menyimpan list alat");
      console.error("Save equipment lists error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (
        window.confirm(
          "Ada perubahan yang belum disimpan. Yakin ingin menutup?"
        )
      ) {
        onClose();
        setHasChanges(false);
      }
    } else {
      onClose();
    }
  };

  const currentList = equipmentLists[activeTab] || [];

  const getCategoryConfig = (categoryId) => {
    const key = categoryId.toUpperCase();
    return EQUIPMENT_CATEGORIES[key] || EQUIPMENT_CATEGORIES.DT_SERVICE;
  };

  const getEquipmentOptions = (category) => {
    const isDT = category.startsWith("dt_");
    
    if (isDT) {
      // For Dump Truck - use workUnits or specific dump truck master data
      return workUnits.map((unit) => ({
        id: unit.id,
        name: unit.name,
        hull_no: unit.hull_no || "",
      }));
    } else {
      // For Excavator - you might need to create excavator master data
      // For now, using workUnits as placeholder
      return workUnits.map((unit) => ({
        id: unit.id,
        name: unit.name,
      }));
    }
  };

  const totalEquipment = useMemo(() => {
    return Object.values(equipmentLists).reduce(
      (sum, list) => sum + list.length,
      0
    );
  }, [equipmentLists]);

  // Helper function to get tab classes with explicit dark mode
  const getTabClasses = (config, isActive) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm transition-all duration-200 whitespace-nowrap border-b-2";
    
    if (!isActive) {
      return `${baseClasses} bg-transparent text-gray-600 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800`;
    }

    // Active state with explicit color classes
    switch (config.color) {
      case 'blue':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-500 dark:border-blue-400`;
      case 'red':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-500 dark:border-red-400`;
      case 'green':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-500 dark:border-green-400`;
      case 'orange':
        return `${baseClasses} bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-500 dark:border-orange-400`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-500 dark:border-gray-400`;
    }
  };

  // Helper function to get badge classes
  const getBadgeClasses = (config, isActive) => {
    if (!isActive) return "";
    
    switch (config.color) {
      case 'blue':
        return "bg-blue-600 dark:bg-blue-700 text-white border-blue-600 dark:border-blue-700";
      case 'red':
        return "bg-red-600 dark:bg-red-700 text-white border-red-600 dark:border-red-700";
      case 'green':
        return "bg-green-600 dark:bg-green-700 text-white border-green-600 dark:border-green-700";
      case 'orange':
        return "bg-orange-600 dark:bg-orange-700 text-white border-orange-600 dark:border-orange-700";
      default:
        return "bg-gray-600 dark:bg-gray-700 text-white border-gray-600 dark:border-gray-700";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                  List Alat PM/BD MMCT
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Kelola list alat Preventive Maintenance dan Breakdown untuk MMCT
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-sm font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-300 border-gray-300 dark:border-gray-600"
            >
              Total: {totalEquipment} Alat
            </Badge>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {Object.entries(EQUIPMENT_CATEGORIES).map(([key, config]) => {
              const count = equipmentLists[config.id]?.length || 0;
              const isActive = activeTab === config.id;

              return (
                <button
                  key={config.id}
                  onClick={() => setActiveTab(config.id)}
                  className={getTabClasses(config, isActive)}
                >
                  <span className="text-lg">{config.icon}</span>
                  <span>{config.label}</span>
                  <Badge
                    variant={isActive ? "default" : "outline"}
                    className={isActive ? getBadgeClasses(config, isActive) : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Add Button */}
              <Button
                onClick={() => handleAddEquipment(activeTab)}
                variant="outline"
                className="w-full border-dashed border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                disabled={isSaving}
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah {getCategoryConfig(activeTab).label}
              </Button>

              {/* Equipment List */}
              {currentList.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    Belum ada data {getCategoryConfig(activeTab).label}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Klik tombol "Tambah" untuk menambahkan alat
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentList.map((item, index) => {
                    const isDT = activeTab.startsWith("dt_");
                    const options = getEquipmentOptions(activeTab);

                    return (
                      <div
                        key={item.id || index}
                        className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center font-semibold text-gray-600 dark:text-gray-300">
                          {index + 1}
                        </div>

                        <div className="flex-1 space-y-3">
                          {/* Equipment Type - Hidden, auto-determined by category */}
                          <input
                            type="hidden"
                            value={isDT ? "DUMP_TRUCK" : "EXCAVATOR"}
                          />

                          {/* Equipment Selection */}
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {isDT ? "Dump Truck" : "Excavator"}
                              <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                            </label>
                            <select
                              value={item.equipmentId || ""}
                              onChange={(e) =>
                                handleEquipmentChange(
                                  activeTab,
                                  index,
                                  "equipmentId",
                                  e.target.value
                                )
                              }
                              disabled={isSaving || masterDataLoading}
                              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <option value="" className="text-gray-500 dark:text-gray-400">
                                -- Pilih {isDT ? "Dump Truck" : "Excavator"} --
                              </option>
                              {options.map((opt) => (
                                <option 
                                  key={opt.id} 
                                  value={opt.id}
                                  className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                                >
                                  {opt.name}
                                  {opt.hull_no ? ` (${opt.hull_no})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Equipment Name - Auto-filled but editable */}
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Nama Alat
                              <span className="text-red-500 dark:text-red-400 ml-1">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.equipmentName || ""}
                              onChange={(e) =>
                                handleEquipmentChange(
                                  activeTab,
                                  index,
                                  "equipmentName",
                                  e.target.value
                                )
                              }
                              disabled={isSaving}
                              placeholder="Nama alat (otomatis terisi)"
                              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:opacity-50 transition-colors"
                            />
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEquipment(activeTab, index)}
                          disabled={isSaving}
                          className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-200 dark:border-gray-700 -mx-6 px-6 pt-4 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge 
                  variant="outline" 
                  className="text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Ada perubahan belum disimpan
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="gap-2 bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Semua
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MMCTEquipmentListModal;