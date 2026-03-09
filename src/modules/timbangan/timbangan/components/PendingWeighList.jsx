import React, { useCallback, useEffect, useState, useMemo } from "react";
import Pagination from "@/shared/components/Pagination";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Truck,
  Weight,
  Loader2,
  RefreshCw,
  Pencil,
  Check,
  X,
  MapPin,
  Clock,
  User,
  Pickaxe,
} from "lucide-react";

const WEIGHT_REGEX = /^\d{0,3}(\.\d{0,2})?$/;
const WEIGHT_MAX = 199.99;

const StatusBadge = ({ hasTare }) =>
  hasTare ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
      Lengkap
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700 animate-pulse">
      Pending
    </span>
  );

const PendingWeighList = ({
  weighList,
  isListLoading,
  loadWeighList,
  editingId,
  editTareWeight,
  setEditTareWeight,
  isUpdating,
  startEditTare,
  cancelEditTare,
  handleTareSubmit,
  scale,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(weighList.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(
    () => weighList.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage),
    [weighList, safePage, itemsPerPage]
  );

  const handleItemsPerPageChange = useCallback((val) => {
    setItemsPerPage(val);
    setCurrentPage(1);
  }, []);

  // Auto-fill tare from scale when connected (same pattern as gross_weight in TimbanganInputCard)
  useEffect(() => {
    if (editingId && scale?.isConnected) {
      const activeWeight = scale.lockedWeight ?? scale.currentWeight;
      if (activeWeight != null) {
        const weightInTons = parseFloat(activeWeight) / 1000;
        if (!isNaN(weightInTons) && weightInTons <= WEIGHT_MAX) {
          setEditTareWeight(weightInTons.toFixed(2));
        }
      }
    }
  }, [editingId, scale?.isConnected, scale?.lockedWeight, scale?.currentWeight, setEditTareWeight]);

  const handleCancelEditTare = useCallback(() => {
    cancelEditTare();
  }, [cancelEditTare]);

  const handleTareWeightChange = useCallback(
    (e) => {
      let value = e.target.value.replace(/,/g, ".");
      if (value === "") { setEditTareWeight(""); return; }
      if (!WEIGHT_REGEX.test(value)) return;
      const num = parseFloat(value);
      if (!isNaN(num) && num > WEIGHT_MAX) return;
      setEditTareWeight(value);
    },
    [setEditTareWeight]
  );

  const getCalculatedNet = useCallback((grossWeight, tareWeight) => {
    if (!grossWeight || !tareWeight) return null;
    const gross = parseFloat(grossWeight);
    const tare = parseFloat(tareWeight);
    if (isNaN(gross) || isNaN(tare) || tare >= gross) return null;
    return (gross - tare).toFixed(2);
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Weight className="w-4 h-4 text-blue-500" />
          Timbangan Retail
          {weighList.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
              {weighList.length}
            </Badge>
          )}
        </h3>
        <Button variant="outline" size="sm" onClick={loadWeighList} disabled={isListLoading} className="text-xs dark:text-neutral-50">
          {isListLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {isListLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">Memuat data...</span>
        </div>
      ) : weighList.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
          <Weight className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Belum ada data timbangan retail</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-10">No</th>
                   <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Waktu</span>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Unit</span>
                  </th>
                  {/* <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> Operator</span>
                  </th> */}
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Pickaxe className="w-3 h-3" /> Excavator</span>
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Loading</span>
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Berat Kotor (ton)</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Berat Kosong (ton)</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Berat Bersih (ton)</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                 
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedList.map((item, index) => {
                  const isEditing = editingId === item.id;
                  const hasTare = item.tare_weight != null && item.tare_weight !== "" && item.tare_weight !== 0;
                  const netWeight = hasTare ? getCalculatedNet(item.gross_weight, item.tare_weight) : null;
                  const netPreview = isEditing ? getCalculatedNet(item.gross_weight, editTareWeight) : null;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`transition-colors group ${
                          isEditing
                            ? "bg-emerald-50/60 dark:bg-emerald-900/10"
                            : hasTare
                            ? "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                            : "bg-amber-50/30 dark:bg-amber-900/5 hover:bg-amber-50/60 dark:hover:bg-amber-900/10"
                        }`}
                      >
                        {/* No */}
                        <td className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-600 font-mono">
                          {(safePage - 1) * itemsPerPage + index + 1}
                        </td>
                                                {/* Waktu */}
                        <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                          {formatTime(item.created_at || item.createdAt)}
                        </td>
                        {/* Unit */}
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-gray-900 dark:text-gray-100 tracking-wide">
                            {item.hull_no || item.unit_dump_truck || "-"}
                          </span>
                        </td>
                        {/* Operator */}
                        {/* <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 max-w-[120px]">
                          <span className="truncate block">{item.operator_name || item.operator || "-"}</span>
                        </td> */}
                        {/* Excavator */}
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">
                          <span className="truncate block">{item.excavator_name || item.unit_exca || "-"}</span>
                        </td>
                        {/* Loading */}
                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 max-w-[160px]">
                          <span className="truncate block text-xs" title={item.loading_location_name || item.loading_location}>
                            {item.loading_location_name || item.loading_location || "-"}
                          </span>
                        </td>
                        {/* Gross */}
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                            {item.gross_weight != null ? Number(item.gross_weight).toFixed(2) : "-"}
                          </span>
                        </td>
                        {/* Tare */}
                        <td className="px-3 py-2.5 text-right">
                          <span className={`tabular-nums font-medium ${hasTare ? "text-gray-700 dark:text-gray-300" : "text-gray-300 dark:text-gray-600"}`}>
                            {hasTare ? Number(item.tare_weight).toFixed(2) : "—"}
                          </span>
                        </td>
                        {/* Netto */}
                        <td className="px-3 py-2.5 text-right">
                          {netWeight ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {netWeight}
                            </span>
                          ) : isEditing && netPreview ? (
                            <span className="font-bold text-emerald-500 dark:text-emerald-400 tabular-nums opacity-70">
                              {netPreview}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-3 py-2.5 text-center">
                          <StatusBadge hasTare={hasTare} />
                        </td>
                        {/* Aksi */}
                        <td className="px-3 py-2.5 text-center">
                          {!hasTare && !isEditing && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditTare(item)}
                              className="text-xs h-7 px-2.5 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              Tare
                            </Button>
                          )}
                          {isEditing && (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleTareSubmit(item)}
                                disabled={isUpdating || !editTareWeight}
                                className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEditTare}
                                disabled={isUpdating}
                                className="h-7 w-7 p-0 dark:text-neutral-50"
                              >
                                <X className="w-3 h-3 " />
                              </Button>
                            </div>
                          )}
                          {hasTare && !isEditing && (
                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Inline Tare Edit Row */}
                      {isEditing && (
                        <tr className="bg-emerald-50/80 dark:bg-emerald-900/15 border-b-2 border-emerald-300 dark:border-emerald-700">
                          <td colSpan={11} className="px-4 py-3">
                            <div className="flex flex-wrap items-end gap-3">
                              {/* Tare input */}
                              <div className="flex items-end gap-2">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                                    Berat Kosong (Ton)
                                    {scale?.isConnected && (
                                      <Badge
                                        variant="outline"
                                        className={`ml-2 py-0 text-[10px] h-4 ${
                                          scale.isStable
                                            ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
                                            : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                                        }`}
                                      >
                                        {scale.isStable ? "STABLE" : "UNSTABLE"}
                                      </Badge>
                                    )}
                                  </label>
                                  <div className="relative">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0.00"
                                      value={editTareWeight}
                                      onChange={handleTareWeightChange}
                                      disabled={isUpdating}
                                      autoFocus
                                      className="w-28 bg-white dark:bg-slate-700 dark:text-neutral-50 font-medium border-none"
                                    />
                                    {scale?.isConnected && (
                                      <div className="absolute right-2 top-2.5 text-xs text-emerald-600 font-medium animate-pulse">Live</div>
                                    )}
                                  </div>
                                </div>
                                {netPreview && (
                                  <div className="pb-1.5">
                                    <span className="text-xs text-gray-500">→ Netto:</span>
                                    <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">{netPreview} ton</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            isLoading={isListLoading}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            totalItems={weighList.length}
          />

          {/* Footer summary */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total: <span className="font-semibold text-gray-700 dark:text-gray-300">{weighList.length} data</span>
            </span>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Lengkap: {weighList.filter(i => i.tare_weight != null && i.tare_weight !== "" && i.tare_weight !== 0).length}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Pending: {weighList.filter(i => !i.tare_weight || i.tare_weight === "" || i.tare_weight === 0).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingWeighList;