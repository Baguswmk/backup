import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  Settings,
  Plus,
  Trash2,
  Save,
  X,
  AlertCircle,
  Loader2,
  Truck,
  Construction,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import { showToast } from "@/shared/utils/toast";
import { useUnitLog } from "@/modules/timbangan/fleet/hooks/useUnitLog";
import MultiSearchableSelect from "@/shared/components/MultiSearchableSelect";
import Pagination from "@/shared/components/Pagination";

const EQUIPMENT_CATEGORIES = {
  DT_SERVICE: {
    id: "dt_service",
    label: "DT Service",
    color: "blue",
    icon: "🚛",
    type: "dt",
  },
  DT_BD: {
    id: "dt_bd",
    label: "DT Breakdown",
    color: "red",
    icon: "⚠️",
    type: "dt",
  },
  EXCA_SERVICE: {
    id: "exca_service",
    label: "Exca Service",
    color: "green",
    icon: "🏗️",
    type: "exca",
  },
  EXCA_BD: {
    id: "exca_bd",
    label: "Exca Breakdown",
    color: "orange",
    icon: "🔧",
    type: "exca",
  },
};

const MAIN_TABS = {
  UNIT: {
    id: "unit",
    label: "Unit (DT)",
    icon: Truck,
    categories: ["dt_service", "dt_bd"],
  },
  EXCA: {
    id: "exca",
    label: "Excavator",
    icon: Construction,
    categories: ["exca_service", "exca_bd"],
  },
};

const MMCTEquipmentListModal = ({
  isOpen,
  onClose,
  masters,
  mastersLoading,
}) => {
  const [activeMainTab, setActiveMainTab] = useState("unit");
  const [tempEquipmentLists, setTempEquipmentLists] = useState({
    dt_service: [],
    dt_bd: [],
    exca_service: [],
    exca_bd: [],
  });

  // Pagination State per category
  const [paginationConfig, setPaginationConfig] = useState({
    dt_service: { page: 1, itemsPerPage: 10 },
    dt_bd: { page: 1, itemsPerPage: 10 },
    exca_service: { page: 1, itemsPerPage: 10 },
    exca_bd: { page: 1, itemsPerPage: 10 },
  });

  // Selected items per category for bulk delete
  const [selectedItems, setSelectedItems] = useState({
    dt_service: [],
    dt_bd: [],
    exca_service: [],
    exca_bd: [],
  });

  // Track which notes are expanded
  const [expandedNotes, setExpandedNotes] = useState({});

  const [hasChanges, setHasChanges] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    category: null,
    index: null,
    item: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Use unitLog hook for MMCT operations
  const {
    mmctEquipmentLists,
    isLoading,
    isSaving,
    addToMMCTList,
    removeFromMMCTList,
    bulkRemoveFromMMCTList,
    bulkAddToMMCTList,
    loadMMCTEquipmentLists,
  } = useUnitLog();

  // Sync temp state with actual data
  useEffect(() => {
    setTempEquipmentLists(mmctEquipmentLists);
  }, [mmctEquipmentLists]);

  const loadEquipmentLists = async () => {
    await loadMMCTEquipmentLists(true);
    setHasChanges(false);
  };

  const handleEquipmentSelectionChange = (category, selectedIds) => {
    const isDT = category.startsWith("dt_");
    const masterList = isDT ? masters.dumpTruck : masters.excavators;

    // Get current list
    const currentList = tempEquipmentLists[category] || [];
    const currentIds = currentList.map((item) => String(item.equipmentId));

    // Find newly added IDs
    const newIds = selectedIds.filter((id) => !currentIds.includes(id));

    // Find removed IDs
    const removedIds = currentIds.filter((id) => !selectedIds.includes(id));

    // Add new items
    const newItems = newIds.map((id) => {
      const equipment = masterList.find((eq) => eq.id === parseInt(id));
      return {
        id: `temp-${Date.now()}-${id}`,
        equipmentType: isDT ? "DT" : "EXCA",
        equipmentId: id,
        equipmentName: equipment?.hull_no || equipment?.name || "",
        description: "", // Add notes field
        isNew: true,
      };
    });

    // Remove items
    let updatedList = currentList.filter(
      (item) => !removedIds.includes(String(item.equipmentId)),
    );

    // Add new items
    updatedList = [...updatedList, ...newItems];

    setTempEquipmentLists((prev) => ({
      ...prev,
      [category]: updatedList,
    }));

    if (newIds.length > 0 || removedIds.length > 0) {
      setHasChanges(true);
    }
  };

  const handleNotesChange = (category, index, description) => {
    setTempEquipmentLists((prev) => {
      const updatedCategory = [...prev[category]];
      updatedCategory[index] = {
        ...updatedCategory[index],
        description: description,
      };
      return {
        ...prev,
        [category]: updatedCategory,
      };
    });
    setHasChanges(true);
  };

  const handleRemoveEquipment = (category, index) => {
    const item = tempEquipmentLists[category][index];

    // If it's existing item (has real ID), show confirmation dialog
    if (!item.isNew && item.id && !item.id.toString().startsWith("temp-")) {
      setDeleteConfirmation({
        isOpen: true,
        category,
        index,
        item,
      });
    } else {
      // Just remove from temp state for new items
      setTempEquipmentLists((prev) => ({
        ...prev,
        [category]: prev[category].filter((_, i) => i !== index),
      }));
      setHasChanges(true);
    }
  };

  const handleConfirmDelete = async () => {
    const { category, index, item } = deleteConfirmation;

    try {
      setIsDeleting(true);
      await removeFromMMCTList(item.id);

      // Close dialog
      setDeleteConfirmation({
        isOpen: false,
        category: null,
        index: null,
        item: null,
      });

      showToast.success("Alat berhasil dihapus dari MMCT list");
    } catch (error) {
      showToast.error("Gagal menghapus alat dari MMCT list");
      console.error("Remove equipment error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      category: null,
      index: null,
      item: null,
    });
  };

  const handleToggleSelect = (categoryId, itemId) => {
    setSelectedItems((prev) => {
      const categorySelected = prev[categoryId] || [];
      if (categorySelected.includes(itemId)) {
        return {
          ...prev,
          [categoryId]: categorySelected.filter((id) => id !== itemId),
        };
      } else {
        return { ...prev, [categoryId]: [...categorySelected, itemId] };
      }
    });
  };

  const handleSelectAll = (categoryId, paginatedList) => {
    // Only select items that have a real ID (saved in DB), ignore temp new items
    const selectableItems = paginatedList.filter(
      (item) =>
        !item.isNew && item.id && !item.id.toString().startsWith("temp-"),
    );
    const visibleIds = selectableItems.map((item) => item.id);

    if (visibleIds.length === 0) return;

    setSelectedItems((prev) => {
      const categorySelected = prev[categoryId] || [];

      // Check if ALL visible items are already selected
      const isAllVisibleSelected = visibleIds.every((id) =>
        categorySelected.includes(id),
      );

      if (isAllVisibleSelected) {
        // Deselect only the visible ones, keep others
        return {
          ...prev,
          [categoryId]: categorySelected.filter(
            (id) => !visibleIds.includes(id),
          ),
        };
      } else {
        // Select all visible ones + keep previously selected others
        // Use Set to avoid duplicates
        const newSelection = Array.from(
          new Set([...categorySelected, ...visibleIds]),
        );
        return { ...prev, [categoryId]: newSelection };
      }
    });
  };

  const handleBulkDelete = async (categoryId) => {
    const idsToDelete = selectedItems[categoryId] || [];
    if (idsToDelete.length === 0) return;

    if (
      window.confirm(
        `Yakin ingin menghapus ${idsToDelete.length} alat terpilih dari MMCT list?`,
      )
    ) {
      try {
        setIsDeleting(true);
        await bulkRemoveFromMMCTList(idsToDelete);

        // Clear selection after successful delete
        setSelectedItems((prev) => ({ ...prev, [categoryId]: [] }));
        showToast.success(`Berhasil menghapus ${idsToDelete.length} alat`);
      } catch (error) {
        console.error("Bulk delete error:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const toggleNoteExpanded = (itemId, e) => {
    e.stopPropagation();
    setExpandedNotes((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleSave = async () => {
    // Validate all entries
    for (const [category, items] of Object.entries(tempEquipmentLists)) {
      for (const item of items) {
        if (!item.equipmentId || !item.equipmentName) {
          showToast.error(
            `Mohon lengkapi semua data pada ${getCategoryConfig(category).label}`,
          );
          return;
        }
      }
    }

    try {
      // Save logic using bulkAddToMMCTList
      for (const [category, items] of Object.entries(tempEquipmentLists)) {
        // Filter only new items
        const newItems = items.filter(
          (item) => item.isNew || item.id.toString().startsWith("temp-"),
        );

        if (newItems.length > 0) {
          await bulkAddToMMCTList(category, newItems);
        }
      }

      setHasChanges(false);
      await loadEquipmentLists();
    } catch (error) {
      showToast.error("Gagal menyimpan list alat");
      console.error("Save equipment lists error:", error);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (
        window.confirm("Ada perubahan yang belum disimpan. Yakin ingin keluar?")
      ) {
        onClose();
        setHasChanges(false);
      }
    } else {
      onClose();
    }
  };

  const getCategoryConfig = (categoryId) => {
    return (
      Object.values(EQUIPMENT_CATEGORIES).find((c) => c.id === categoryId) ||
      EQUIPMENT_CATEGORIES.DT_SERVICE
    );
  };

  const getEquipmentOptions = (categoryId) => {
    const isDT = categoryId.startsWith("dt_");
    const masterList = isDT ? masters.dumpTruck : masters.excavators;

    if (!masterList) return [];

    // Gather all currently selected IDs across all categories of the same type
    // This prevents a DT from being added to both "Service" and "Breakdown"
    // or from being added twice.
    const relevantCategories = isDT
      ? ["dt_service", "dt_bd"]
      : ["exca_service", "exca_bd"];

    const allSelectedIds = new Set();

    for (const cat of relevantCategories) {
      const items = tempEquipmentLists[cat] || [];
      items.forEach((item) => {
        allSelectedIds.add(String(item.equipmentId));
      });
    }

    return (
      masterList
        // Filter out items already selected in any relevant category
        .filter((item) => !allSelectedIds.has(String(item.id)))
        .map((item) => ({
          value: item.id,
          label:
            item.hull_no || item.name || `${isDT ? "DT" : "Exca"} ${item.id}`,
          hint: item.company || "",
        }))
    );
  };

  const getSelectedEquipmentIds = (categoryId) => {
    return (tempEquipmentLists[categoryId] || []).map((item) =>
      String(item.equipmentId),
    );
  };

  const handlePageChange = (categoryId, newPage) => {
    setPaginationConfig((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], page: newPage },
    }));
  };

  const handleItemsPerPageChange = (categoryId, newItemsPerPage) => {
    setPaginationConfig((prev) => ({
      ...prev,
      [categoryId]: { page: 1, itemsPerPage: newItemsPerPage },
    }));
  };

  const getCategoryBgColor = (categoryId) => {
    const config = getCategoryConfig(categoryId);
    const colorMap = {
      blue: "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800",
      red: "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800",
      green:
        "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800",
      orange:
        "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800",
    };
    return colorMap[config.color] || colorMap.blue;
  };

  const getCategoryTextColor = (categoryId) => {
    const config = getCategoryConfig(categoryId);
    const colorMap = {
      blue: "text-blue-700 dark:text-blue-300",
      red: "text-red-700 dark:text-red-300",
      green: "text-green-700 dark:text-green-300",
      orange: "text-orange-700 dark:text-orange-300",
    };
    return colorMap[config.color] || colorMap.blue;
  };

  const renderEquipmentCard = (categoryId) => {
    const config = getCategoryConfig(categoryId);
    const currentList = tempEquipmentLists[categoryId] || [];
    const isDT = categoryId.startsWith("dt_");
    const options = getEquipmentOptions(categoryId);
    const count = currentList.length;
    const selectedCount = (selectedItems[categoryId] || []).length;

    // Pagination Logic
    const { page, itemsPerPage } = paginationConfig[categoryId] || {
      page: 1,
      itemsPerPage: 10,
    };
    const totalPages = Math.ceil(count / itemsPerPage);
    const paginatedList = currentList.slice(
      (page - 1) * itemsPerPage,
      page * itemsPerPage,
    );

    // Only real items on the current page can be bulk deleted
    const selectableItemsOnPage = paginatedList.filter(
      (item) =>
        !item.isNew && item.id && !item.id.toString().startsWith("temp-"),
    );
    const isAllSelectedOnPage =
      selectableItemsOnPage.length > 0 &&
      selectableItemsOnPage.every((item) =>
        (selectedItems[categoryId] || []).includes(item.id),
      );

    return (
      <div
        key={categoryId}
        className={`rounded-xl border-2 flex flex-col overflow-hidden shadow-sm ${getCategoryBgColor(categoryId)}`}
      >
        {/* Card Header */}
        <div className="px-4 py-3 border-b border-current/20 bg-white/50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{config.icon}</span>
              <h3
                className={`font-semibold ${getCategoryTextColor(categoryId)}`}
              >
                {config.label}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkDelete(categoryId)}
                  disabled={isDeleting || isSaving}
                  className="h-6 text-xs px-2 py-0"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Hapus ({selectedCount})
                </Button>
              )}
              <Badge
                variant="outline"
                className={`${getCategoryTextColor(categoryId)} border-current`}
              >
                {count} Unit
              </Badge>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 space-y-3">
          {/* Multi Select Section */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Pilih {isDT ? "Dump Truck" : "Excavator"}
            </label>
            <MultiSearchableSelect
              items={options}
              values={getSelectedEquipmentIds(categoryId)}
              onChange={(values) =>
                handleEquipmentSelectionChange(categoryId, values)
              }
              placeholder={`Pilih ${isDT ? "DT" : "Exca"}...`}
              emptyText={`${isDT ? "DT" : "Exca"} tidak ditemukan`}
              disabled={isSaving || mastersLoading}
            />
          </div>

          {/* Equipment List */}
          {currentList.length === 0 ? (
            <div className="text-center py-8 bg-white/70 dark:bg-gray-800/70 rounded-lg border-2 border-dashed border-current/30">
              <AlertCircle className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Belum ada data
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectableItemsOnPage.length > 0 && (
                <div className="flex items-center justify-between px-2 py-1 mb-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={isAllSelectedOnPage}
                      onChange={() =>
                        handleSelectAll(categoryId, paginatedList)
                      }
                      disabled={isSaving || isDeleting}
                    />
                    <span className="font-medium">
                      Pilih Semua Halaman Ini ({selectableItemsOnPage.length}{" "}
                      data)
                    </span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2">
                {paginatedList.map((item, index) => {
                  // Calculate true index based on pagination
                  const absoluteIndex = (page - 1) * itemsPerPage + index;
                  const isItemSaved =
                    !item.isNew &&
                    item.id &&
                    !item.id.toString().startsWith("temp-");
                  const isSelected =
                    isItemSaved &&
                    (selectedItems[categoryId] || []).includes(item.id);

                  return (
                    <div
                      key={item.id || absoluteIndex}
                      onClick={() => {
                        if (isItemSaved && !isSaving && !isDeleting) {
                          handleToggleSelect(categoryId, item.id);
                        }
                      }}
                      className={`p-2 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md dark:hover:shadow-gray-900/50 transition-all ${
                        isItemSaved && !isSaving && !isDeleting
                          ? "cursor-pointer"
                          : ""
                      } ${
                        isSelected
                          ? "border-blue-400 bg-blue-50/50 dark:border-blue-500/50 dark:bg-blue-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        {isItemSaved && (
                          <div className="shrink-0 flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 w-3.5 h-3.5 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 cursor-pointer"
                              checked={isSelected}
                              onChange={() => {
                                // Handled by parent div onClick
                              }}
                              disabled={isSaving || isDeleting}
                            />
                          </div>
                        )}
                        <div className="shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                          {absoluteIndex + 1}
                        </div>

                        <div className="flex-1 flex flex-col justify-center leading-tight">
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {item.equipmentName}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            ID: {item.equipmentId}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveEquipment(categoryId, absoluteIndex);
                          }}
                          disabled={isSaving}
                          className="shrink-0 h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Notes Section */}
                      <div className="ml-7 mt-0.5">
                        {isItemSaved ? (
                          item.description && item.description !== "-" ? (
                            <div
                              className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              onClick={(e) => toggleNoteExpanded(item.id, e)}
                            >
                              <div className="flex items-start gap-1 w-full overflow-hidden">
                                <span className="font-medium text-[10px] text-gray-500 uppercase mt-0.5 shrink-0">
                                  Catatan:
                                </span>
                                <div
                                  className={`flex-1 min-w-0 ${
                                    expandedNotes[item.id]
                                      ? "whitespace-pre-wrap break-words"
                                      : "line-clamp-1 break-all"
                                  }`}
                                >
                                  {item.description}
                                </div>
                              </div>
                              {!expandedNotes[item.id] &&
                                item.description.length > 40 && (
                                  <div className="text-[10px] font-semibold text-blue-500 mt-1 hover:underline text-right active:scale-95 transition-transform">
                                    Baca selengkapnya ⤓
                                  </div>
                                )}
                              {expandedNotes[item.id] &&
                                item.description.length > 40 && (
                                  <div className="text-[10px] font-semibold text-gray-500 mt-1 hover:underline text-right active:scale-95 transition-transform">
                                    Sembunyikan ⤒
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-400 italic">
                              Tidak ada catatan
                            </div>
                          )
                        ) : (
                          <Input
                            type="text"
                            placeholder="Catatan (opsional)..."
                            value={item.description || ""}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleNotesChange(
                                categoryId,
                                absoluteIndex,
                                e.target.value,
                              )
                            }
                            disabled={isSaving}
                            className="w-full text-xs h-7 min-h-[28px] px-2 py-0 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 dark:text-neutral-50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Internal Category Pagination */}
              {count > 10 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) =>
                      handlePageChange(categoryId, newPage)
                    }
                    isLoading={isSaving}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(newItems) =>
                      handleItemsPerPageChange(categoryId, newItems)
                    }
                    totalItems={count}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 bg-white dark:bg-slate-800 border-none">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Kelola List Alat PM/BD MMCT
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Atur daftar alat untuk PM (Preventive Maintenance) dan BD
                  (Breakdown)
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Main Tabs */}
          <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              {Object.entries(MAIN_TABS).map(([key, tab]) => {
                const Icon = tab.icon;
                const isActive = activeMainTab === tab.id;

                return (
                  <Button
                    key={tab.id}
                    onClick={() => setActiveMainTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-all ${
                      isActive
                        ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-x-2 border-blue-500 dark:border-blue-400 -mb-px"
                        : "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 border-2 border-transparent"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {MAIN_TABS[activeMainTab.toUpperCase()].categories.map(
                  (categoryId) => renderEquipmentCard(categoryId),
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={handleCancelDelete}
      >
        <DialogContent className="max-w-md bg-white dark:bg-gray-800 border-none">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Konfirmasi Hapus
              </DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Apakah Anda yakin ingin menghapus alat ini dari MMCT list?
            </DialogDescription>
          </DialogHeader>

          {deleteConfirmation.item && (
            <div className="my-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Nama Alat
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {deleteConfirmation.item.equipmentName}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    ID Alat
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {deleteConfirmation.item.equipmentId}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Tipe
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {deleteConfirmation.item.equipmentType}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Data yang sudah dihapus tidak dapat dikembalikan
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Ya, Hapus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MMCTEquipmentListModal;
