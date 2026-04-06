import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { Eye, Pencil, Trash2, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/lib/utils";
import Pagination from "@/shared/components/Pagination";

const ITEMS_PER_PAGE_DEFAULT = 10;

// ── Status badge color map ─────────────────────────────────────────────────────
const STATUS_CLASS = {
  Haul: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  Hold: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  Standby: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  Breakdown: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  Maintenance: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
};

// ── Safe number formatter — use dot as decimal separator ─────────────────────
const fmtNum = (val) =>
  val != null && !isNaN(val)
    ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : "-";

export default function BeltConveyorList({
  data,
  isLoading,
  onEdit,
  onDetail,
  onDelete,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

  const totalItems = data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginatedData = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleItemsPerPageChange = (val) => {
    setItemsPerPage(val);
    setCurrentPage(1);
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-10 text-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
        Memuat data belt conveyor...
      </div>
    );
  }

  // ── Table ────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <div className="w-full relative overflow-auto">
        <Table className="w-full caption-bottom text-sm select-none">
          <TableHeader className="bg-slate-50/80 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[4%]">No</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[12%]">Tanggal</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[8%] text-center">Shift</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[10%] text-right">Beltscale Sebelumnya (T)</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[10%] text-right">Beltscale Saat Ini (T)</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[10%] text-right">Tonase / Delta (T)</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[10%]">Loader</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[10%]">Hauler</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[9%] text-center">Status</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 w-[10%] text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700/50">
            {paginatedData.map((item, index) => {
              const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
              // beltscale di DB = Beltscale Saat Ini (kumulatif)
              const beltscaleCurr = item.beltscale ?? null;
              // tonnage di DB = delta/selisih
              const delta = item.tonnage ?? null;
              // Beltscale Sebelumnya = kumulatif - delta (dihitung FE, hanya untuk display)
              const beltscalePrev = (beltscaleCurr != null && delta != null)
                ? Number(beltscaleCurr) - Number(delta)
                : beltscaleCurr;
              const isPositiveDelta = delta !== null && delta >= 0;

              return (
                <TableRow
                  key={item.id}
                  className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200"
                >
                  {/* No */}
                  <TableCell className="text-slate-400 dark:text-slate-500 text-xs">
                    {globalIndex}
                  </TableCell>

                  {/* Tanggal */}
                  <TableCell className="text-slate-700 dark:text-slate-300 text-xs">
                    {item.date
                      ? format(new Date(item.date), "dd/MM/yy HH:mm")
                      : "-"}
                  </TableCell>

                  {/* Shift */}
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200">
                      {item.shift ?? "-"}
                    </span>
                  </TableCell>

                  {/* Beltscale Sebelumnya */}
                  <TableCell className="text-right font-mono text-slate-500 dark:text-slate-400">
                    {fmtNum(beltscalePrev)}
                  </TableCell>

                  {/* Beltscale Saat Ini */}
                  <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">
                    {fmtNum(beltscaleCurr)}
                  </TableCell>

                  {/* Tonase / Delta */}
                  <TableCell className="text-right">
                    {delta !== null ? (
                      <span className={cn(
                        "inline-flex items-center gap-1 font-mono font-semibold text-sm",
                        isPositiveDelta
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400",
                      )}>
                        {isPositiveDelta ? (
                          <TrendingUp className="w-3 h-3 shrink-0" />
                        ) : (
                          <TrendingDown className="w-3 h-3 shrink-0" />
                        )}
                        {fmtNum(delta)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </TableCell>

                  {/* Loader */}
                  <TableCell className="text-slate-700 dark:text-slate-300 text-sm">
                    {item.loader || "-"}
                  </TableCell>

                  {/* Hauler */}
                  <TableCell className="text-slate-600 dark:text-slate-400 text-sm font-mono">
                    {item.hauler || "-"}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-normal text-xs",
                        STATUS_CLASS[item.status] ||
                          "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600",
                      )}
                    >
                      {item.status || "-"}
                    </Badge>
                  </TableCell>

                  {/* Aksi */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDetail(item)}
                        className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-md"
                        title="Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 rounded-md"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                        className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          totalItems={totalItems}
        />
      </div>
    </div>
  );
}
