import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useReducer,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import {
  Database,
  Plus,
  Search,
  RefreshCw,
  Building2,
  Truck,
  User,
  MapPin,
  Settings,
  Layers,
  AlertCircle,
  Wrench,
  Scale,
  Lock,
  Tag,
} from "lucide-react";

import { useMasterDataPermissions } from "@/shared/permissions/usePermissions";
import {
  canAccessMasterDataCategory,
  getAllowedMasterDataCategories,
  canOnlyUpdateTareWeight,
} from "@/shared/permissions/rolePermissions";

import { useMasterData } from "@/modules/timbangan/masterData/hooks/useMasterData";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

import Pagination from "@/shared/components/Pagination";
import TareWeightModal from "@/modules/timbangan/masterData/components/TareWeightModal";
import MasterDataTable from "@/modules/timbangan/masterData/components/MasterDataTable";
import MasterDataModal from "@/modules/timbangan/masterData/components/MasterDataModal";
import { TareWeightCell } from "@/modules/timbangan/masterData/components/TareWeightCell";
import { ExpandableList } from "@/modules/timbangan/masterData/components/ExpandableList";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import LoadingOverlay from "@/shared/components/LoadingOverlay";
import EmptyState from "@/shared/components/EmptyState";

import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { showToast } from "@/shared/utils/toast";
import useAuthStore from "@/modules/auth/store/authStore";
import AdvancedFilter from "@/shared/components/AdvancedFilter";

const ALL_CATEGORIES = [
  { id: "companies", label: "Companies", icon: Building2, color: "blue" },
  { id: "units", label: "Dump Truck", icon: Truck, color: "green" },
  { id: "alatLoader", label: "Excavator", icon: Wrench, color: "teal" },
  { id: "operators", label: "Operators", icon: User, color: "purple" },
  { id: "locations", label: "Locations", icon: MapPin, color: "orange" },
  { id: "work-units", label: "Work Units", icon: Settings, color: "indigo" },
  { id: "coal-types", label: "Coal Types", icon: Layers, color: "amber" },
  { id: "weigh-bridge", label: "Weigh Bridge", icon: Database, color: "blue" },
];

const COLOR_CLASS = {
  blue: "text-blue-600",
  green: "text-green-600",
  purple: "text-purple-600",
  orange: "text-orange-600",
  indigo: "text-indigo-600",
  amber: "text-amber-600",
  teal: "text-teal-600",
};

const PAGE_SIZE = 10;

const initialUI = {
  searchQuery: "",
  showModal: false,
  editingItem: null,
  isSaving: false,
  showDelete: false,
  deletingItem: null,
  isDeleting: false,
  currentPage: 1,
  showTareModal: false,
  tareMode: null,
  weighingUnit: null,
  isSavingTare: false,
};

function uiReducer(state, action) {
  return { ...state, ...action };
}

const MasterDataManagement = () => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  const permissions = useMasterDataPermissions();
  const isOnlyTareWeight = canOnlyUpdateTareWeight(userRole);

  const allowedCategories = useMemo(() => {
    const allowed = getAllowedMasterDataCategories(userRole);
    if (allowed === "all") return ALL_CATEGORIES;
    if (!allowed || allowed.length === 0) return [];
    return ALL_CATEGORIES.filter((cat) => allowed.includes(cat.id));
  }, [userRole]);

  const [activeCategory, setActiveCategory] = useState(
    allowedCategories.length > 0 ? allowedCategories[0].id : "companies",
  );
  const [ui, setUI] = useReducer(uiReducer, initialUI);
  const debouncedSearch = useDebouncedValue(ui.searchQuery, 250);
  const canAccessCategory = canAccessMasterDataCategory(
    userRole,
    activeCategory,
  );

  const [filterExpanded, setFilterExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    companies: [],
    locations: [],
  });

  const hookCategory =
    activeCategory === "alatLoader" ? "units" : activeCategory;

  const {
    data,
    isLoading,
    error,
    companies,
    workUnits,
    locations,
    users,
    createItem,
    updateItem,
    deleteItem,
    refresh,
  } = useMasterData(hookCategory);

  const baseData = useMemo(() => {
    if (!data) return [];
    if (activeCategory === "units") {
      return data.filter((it) => String(it?.type || "") === "DUMP_TRUCK");
    }
    if (activeCategory === "alatLoader") {
      return data.filter((it) => String(it?.type || "") !== "DUMP_TRUCK");
    }
    return data;
  }, [data, activeCategory]);

  useEffect(() => {
    setUI({ currentPage: 1 });
    setActiveFilters({ companies: [], locations: [] });
  }, [activeCategory]);

  useEffect(() => {
    setUI({ currentPage: 1 });
  }, [debouncedSearch]);

  const companyOptions = useMemo(() => {
    if (!companies) return [];
    return companies.map((comp) => ({
      value: String(comp.id),
      label: comp.name,
    }));
  }, [companies]);

  const locationOptions = useMemo(() => {
    if (!locations) return [];
    return locations.map((loc) => ({
      value: String(loc.id),
      label: loc.name,
      hint: loc.type,
    }));
  }, [locations]);

  const filterGroups = useMemo(() => {
    const groups = [];
    if (["units", "alatLoader", "operators"].includes(activeCategory)) {
      groups.push({
        id: "companies",
        label: "Company",
        options: companyOptions,
        value: activeFilters.companies || [],
        onChange: (val) =>
          setActiveFilters((prev) => ({ ...prev, companies: val })),
        placeholder: "Pilih Company",
      });
    }
    if (activeCategory === "work-units") {
      groups.push({
        id: "locations",
        label: "Locations",
        options: locationOptions,
        value: activeFilters.locations || [],
        onChange: (val) =>
          setActiveFilters((prev) => ({ ...prev, locations: val })),
        placeholder: "Pilih Location",
      });
    }
    return groups;
  }, [activeCategory, companyOptions, locationOptions, activeFilters]);

  const hasActiveFilters =
    activeFilters.companies.length > 0 || activeFilters.locations.length > 0;

  const handleResetFilters = () => {
    setActiveFilters({ companies: [], locations: [] });
  };

  const filteredData = useMemo(() => {
    let result = baseData;
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter((item) =>
        Object.values(item).some(
          (v) =>
            (typeof v === "string" || typeof v === "number") &&
            String(v).toLowerCase().includes(search),
        ),
      );
    }
    if (activeFilters.companies.length > 0) {
      result = result.filter((item) => {
        const companyId = item.companyId || item.company_id;
        return companyId && activeFilters.companies.includes(String(companyId));
      });
    }
    if (activeFilters.locations.length > 0 && activeCategory === "work-units") {
      result = result.filter((item) => {
        const itemLocationIds = item.locationIds || [];
        return itemLocationIds.some((locId) =>
          activeFilters.locations.includes(String(locId)),
        );
      });
    }
    return result;
  }, [baseData, debouncedSearch, activeFilters, activeCategory]);

  const totalItems = filteredData.length;
  const paginatedData = useMemo(() => {
    if (totalItems <= PAGE_SIZE) return filteredData;
    const startIdx = (ui.currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredData, ui.currentPage, totalItems]);

  const columns = useMemo(() => {
    const columnMap = {
      companies: [
        { key: "__no__", label: "No" },
        { key: "name", label: "Name" },
        {
          key: "createdAt",
          label: "Created",
          render: (val) =>
            val ? new Date(val).toLocaleDateString("id-ID") : "-",
        },
      ],
      units: [
        { key: "__no__", label: "No" },
        { key: "hull_no", label: "Hull No" },
        { key: "company", label: "Company" },
        {
          key: "rfid",
          label: "RFID",
          render: (val) =>
            val ? (
              <Badge variant="secondary" className="font-mono">
                <Tag className="w-3 h-3 mr-1" />
                {val}
              </Badge>
            ) : (
              "-"
            ),
        },
        {
          key: "bypass_tonnage",
          label: "Bypass Tonnage",
          render: (val) => (val ? `${parseFloat(val).toFixed(2)} ton` : "-"),
        },
        {
          key: "tare_weight",
          label: "Berat Kosong",
          render: (val, row) => (
            <TareWeightCell
              tareWeight={row.tare_weight}
              tareWeightUpdatedDate={row.tare_weight_updated_date}
            />
          ),
        },
        {
          key: "tare_weight_updated_date",
          label: "Last Updated",
          render: (val) =>
            val ? new Date(val).toLocaleDateString("id-ID") : "-",
        },
      ],
      alatLoader: [
        { key: "__no__", label: "No" },
        { key: "hull_no", label: "Name" },
        { key: "company", label: "Company" },
        {
          key: "rfid",
          label: "RFID",
          render: (val) =>
            val ? (
              <Badge variant="secondary" className="font-mono">
                <Tag className="w-3 h-3 mr-1" />
                {val}
              </Badge>
            ) : (
              "-"
            ),
        },
      ],
      operators: [
        { key: "__no__", label: "No" },
        { key: "name", label: "Name" },
        { key: "company", label: "Company" },
      ],
      locations: [
        { key: "__no__", label: "No" },
        { key: "name", label: "Name" },
        {
          key: "type",
          label: "Type",
          render: (val) => (
            <Badge variant={val === "LOADING" ? "default" : "secondary"}>
              {val}
            </Badge>
          ),
        },
      ],
      "work-units": [
        { key: "__no__", label: "No" },
        { key: "satker", label: "Satker" },
        { key: "subsatker", label: "Subsatker" },
        {
          key: "locationIds",
          label: "Locations",
          render: (val) => (
            <ExpandableList
              items={
                Array.isArray(val)
                  ? val
                      .map((id) =>
                        Array.isArray(locations)
                          ? locations.find((loc) => loc.id === id)
                          : null,
                      )
                      .filter(Boolean)
                  : []
              }
              icon={MapPin}
              labelKey="name"
              badgeKey="type"
              badgeVariant={(item) =>
                item.type === "LOADING" ? "default" : "secondary"
              }
              titleSingular="location"
              titlePlural="locations"
              emptyText="No locations"
            />
          ),
        },
      ],
      "coal-types": [
        { key: "__no__", label: "No" },
        { key: "name", label: "Name" },
      ],
      "weigh-bridge": [
        { key: "__no__", label: "No" },
        { key: "name", label: "Name" },
        {
          key: "operators",
          label: "Users",
          render: (operators) => (
            <ExpandableList
              items={operators}
              icon={User}
              labelKey="name"
              badgeKey="username"
              titleSingular="operator"
              titlePlural="operators"
              emptyText="No users"
            />
          ),
        },
        {
          key: "createdAt",
          label: "Created",
          render: (val) =>
            val ? new Date(val).toLocaleDateString("id-ID") : "-",
        },
      ],
    };
    return columnMap[activeCategory] || [];
  }, [activeCategory, locations]);

  const handleAdd = useCallback(() => {
    if (!permissions.canCreate) {
      showToast.error(permissions.getDisabledMessage("create"));
      return;
    }
    setUI({ editingItem: null, showModal: true });
  }, [permissions]);

  const handleEdit = useCallback(
    (item) => {
      if (isOnlyTareWeight && activeCategory === "units") {
        showToast.error(
          "Anda hanya bisa update tare weight. Gunakan tombol timbangan.",
        );
        return;
      }
      if (!permissions.canUpdate) {
        showToast.error(permissions.getDisabledMessage("update"));
        return;
      }
      setUI({ editingItem: item, showModal: true });
    },
    [permissions, isOnlyTareWeight, activeCategory],
  );

  const handleAskDelete = useCallback(
    (item) => {
      if (!permissions.canDelete) {
        showToast.error(permissions.getDisabledMessage("delete"));
        return;
      }
      setUI({ deletingItem: item, showDelete: true });
    },
    [permissions],
  );

  const cancelDelete = useCallback(
    () => setUI({ showDelete: false, deletingItem: null }),
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!ui.deletingItem) return;
    setUI({ isDeleting: true });
    try {
      await deleteItem(ui.deletingItem.id);
      setUI({ showDelete: false, deletingItem: null });
    } finally {
      setUI({ isDeleting: false });
    }
  }, [ui.deletingItem, deleteItem]);

  const handleWeigh = useCallback(
    (unit) => {
      if (!permissions.canUpdate && !isOnlyTareWeight) {
        showToast.error("Anda tidak memiliki akses untuk update tare weight");
        return;
      }
      setUI({ weighingUnit: unit, tareMode: "single", showTareModal: true });
    },
    [permissions, isOnlyTareWeight],
  );

  const handleQuickTare = useCallback(() => {
    if (!permissions.canUpdate && !isOnlyTareWeight) {
      showToast.error("Anda tidak memiliki akses untuk update tare weight");
      return;
    }
    setUI({ weighingUnit: null, tareMode: "selection", showTareModal: true });
  }, [permissions, isOnlyTareWeight]);

  const handleSaveTareWeight = useCallback(
    async (data) => {
      setUI({ isSavingTare: true });
      try {
        const payload = { tare_weight: data.tareWeight };
        const result = await masterDataService.updateUnit(data.unitId, payload);
        if (result) {
          showToast.success("Tare weight berhasil disimpan");
          await refresh();
          setUI({ showTareModal: false, weighingUnit: null, tareMode: null });
        }
      } catch (error) {
        console.error("Failed to save tare weight:", error);
        showToast.error("Gagal menyimpan tare weight");
      } finally {
        setUI({ isSavingTare: false });
      }
    },
    [refresh],
  );

  const handleSave = useCallback(
    async (formData) => {
      let payload = { ...formData };
      if (activeCategory === "units" && payload.type !== "DUMP_TRUCK")
        payload.type = "DUMP_TRUCK";
      if (activeCategory === "alatLoader" && payload.type === "DUMP_TRUCK")
        payload.type = "EXCAVATOR";
      setUI({ isSaving: true });
      try {
        const result = ui.editingItem
          ? await updateItem(ui.editingItem.id, payload)
          : await createItem(payload);
        if (result?.success) setUI({ showModal: false, editingItem: null });
      } finally {
        setUI({ isSaving: false });
      }
    },
    [activeCategory, ui.editingItem, createItem, updateItem],
  );

  const handleRefresh = useCallback(() => refresh(), [refresh]);

  const handleCategoryChange = useCallback(
    (categoryId) => {
      if (!canAccessMasterDataCategory(userRole, categoryId)) {
        showToast.error("Anda tidak memiliki akses ke kategori ini");
        return;
      }
      setActiveCategory(categoryId);
      setUI({ searchQuery: "", currentPage: 1 });
    },
    [userRole],
  );

  const activeConfig = ALL_CATEGORIES.find((c) => c.id === activeCategory);
  const Icon = activeConfig?.icon;
  const iconColorClass = COLOR_CLASS[activeConfig?.color] || "text-primary";

  const deleteTarget = useMemo(() => {
    if (!ui.deletingItem) return null;
    return {
      name:
        ui.deletingItem.name ||
        ui.deletingItem.hull_no ||
        ui.deletingItem.subsatker ||
        "-",
      excavator: ui.deletingItem.excavator || "-",
      shift: ui.deletingItem.shift || "-",
      workUnit: ui.deletingItem.workUnit || ui.deletingItem.subsatker || "-",
      units: [],
    };
  }, [ui.deletingItem]);

  const isUnitsCategory = activeCategory === "units";

  if (allowedCategories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-800 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Lock className="w-4 h-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Akses Ditolak</p>
            <p>Anda tidak memiliki akses ke Master Data Management.</p>
            <p className="text-xs mt-2">
              Role: <strong>{userRole}</strong>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canAccessCategory) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-800 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Lock className="w-4 h-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Kategori Tidak Tersedia</p>
            <p>
              Anda tidak memiliki akses ke kategori{" "}
              <strong>{activeConfig?.label}</strong>.
            </p>
            <p className="text-xs mt-2">
              Role: <strong>{userRole}</strong>
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark:text-gray-200">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Database className="w-5 h-5 sm:w-6 sm:h-6" />
              Master Data Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
              {permissions.roleDescription}
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <User className="w-3 h-3 mr-1" />
            {userRole}
          </Badge>
        </div>

        {isOnlyTareWeight && (
          <Alert className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
            <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <AlertDescription className="text-purple-800 dark:text-purple-300">
              <p className="font-medium">Mode Khusus: Timbang Kosong</p>
              <p className="text-sm mt-1">
                Anda hanya dapat melakukan update tare weight pada dump truck.
                Gunakan tombol <strong>Timbangan</strong> untuk menimbang.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x">
          {allowedCategories.map((cat) => {
            const CatIcon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <Button
                key={cat.id}
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => handleCategoryChange(cat.id)}
                className="flex items-center gap-2 whitespace-nowrap snap-start dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-200"
                disabled={isLoading}
              >
                <CatIcon className="w-4 h-4" />
                <span className="xs:inline">{cat.label}</span>
              </Button>
            );
          })}
        </div>

        <Card className="border-none dark:bg-gray-800">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                {Icon && <Icon className={`w-5 h-5 ${iconColorClass}`} />}
                <span className="text-base sm:text-lg">
                  {activeConfig?.label}
                </span>
              </CardTitle>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={ui.searchQuery}
                    onChange={(e) => setUI({ searchQuery: e.target.value })}
                    className="pl-10 w-full sm:w-72 md:w-64 border-none hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="cursor-pointer hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                  </Button>

                  {isUnitsCategory &&
                    (permissions.canUpdate || isOnlyTareWeight) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleQuickTare}
                        disabled={isLoading}
                        className="cursor-pointer hover:bg-gray-200 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-200"
                      >
                        <Scale className="w-4 h-4 mr-1" />
                        <span className="hidden md:inline">Timbang Kosong</span>
                      </Button>
                    )}

                  {permissions.shouldShowButton("create") &&
                    !isOnlyTareWeight && (
                      <Button
                        size="sm"
                        onClick={handleAdd}
                        disabled={isLoading}
                        className="cursor-pointer dark:hover:bg-gray-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        <span>Add New</span>
                      </Button>
                    )}

                  {filterGroups.length > 0 && (
                    <AdvancedFilter
                      isExpanded={filterExpanded}
                      onToggle={() => setFilterExpanded(!filterExpanded)}
                      filterGroups={filterGroups}
                      isLoading={isLoading}
                      hasActiveFilters={hasActiveFilters}
                      onResetFilters={handleResetFilters}
                    />
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {!isLoading &&
              paginatedData.length === 0 &&
              !debouncedSearch &&
              !hasActiveFilters && (
                <EmptyState
                  icon={Icon}
                  title="Tidak ada data"
                  description={`Belum ada ${activeConfig?.label.toLowerCase()} untuk ditampilkan`}
                  actionLabel={
                    permissions.canCreate && !isOnlyTareWeight
                      ? "Tambah Baru"
                      : undefined
                  }
                  onAction={
                    permissions.canCreate && !isOnlyTareWeight
                      ? handleAdd
                      : undefined
                  }
                  variant="primary"
                />
              )}

            {!isLoading &&
              paginatedData.length === 0 &&
              (debouncedSearch || hasActiveFilters) && (
                <EmptyState
                  icon={Search}
                  title="Tidak ditemukan"
                  description={
                    debouncedSearch
                      ? `Tidak ada hasil untuk "${debouncedSearch}"`
                      : "Tidak ada hasil dengan filter yang dipilih"
                  }
                  actionLabel={hasActiveFilters ? "Reset Filter" : undefined}
                  onAction={hasActiveFilters ? handleResetFilters : undefined}
                />
              )}

            {(isLoading || paginatedData.length > 0) && (
              <MasterDataTable
                data={paginatedData}
                columns={columns}
                onEdit={handleEdit}
                onDelete={handleAskDelete}
                onWeigh={handleWeigh}
                isLoading={isLoading}
                rowStart={(ui.currentPage - 1) * PAGE_SIZE}
                category={activeCategory}
                canEdit={permissions.canUpdate && !isOnlyTareWeight}
                canDelete={permissions.canDelete}
                canWeigh={
                  isUnitsCategory && (permissions.canUpdate || isOnlyTareWeight)
                }
              />
            )}

            {totalItems > PAGE_SIZE && (
              <Pagination
                currentPage={ui.currentPage}
                totalPages={Math.ceil(totalItems / PAGE_SIZE)}
                onPageChange={(page) => setUI({ currentPage: page })}
                isLoading={false}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <MasterDataModal
        isOpen={ui.showModal}
        onClose={() => setUI({ showModal: false, editingItem: null })}
        category={activeCategory}
        editData={ui.editingItem}
        onSave={handleSave}
        isSaving={ui.isSaving}
        companies={companies}
        workUnits={workUnits}
        locations={locations}
        users={users}
        MASTER_CATEGORIES={ALL_CATEGORIES}
      />

      <DeleteConfirmDialog
        isOpen={ui.showDelete}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        target={deleteTarget}
        assignedCount={0}
        isProcessing={ui.isDeleting}
      />

      <TareWeightModal
        isOpen={ui.showTareModal}
        onClose={() =>
          setUI({ showTareModal: false, weighingUnit: null, tareMode: null })
        }
        unit={ui.tareMode === "single" ? ui.weighingUnit : null}
        units={ui.tareMode === "selection" ? baseData : null}
        onSave={handleSaveTareWeight}
        isSaving={ui.isSavingTare}
      />

      <LoadingOverlay
        isVisible={ui.isSaving || ui.isDeleting}
        message={ui.isSaving ? "Menyimpan..." : "Menghapus..."}
      />
    </div>
  );
};

export default MasterDataManagement;