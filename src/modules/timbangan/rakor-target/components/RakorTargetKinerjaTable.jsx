import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { formatNumber } from "@/shared/utils/number";

export const RakorTargetKinerjaTable = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center p-8 text-slate-500">
        Memuat data kinerja...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center p-8 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-md">
        Belum ada data kinerja untuk filter yang dipilih.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-800">
          <TableRow>
            <TableHead className="w-12 text-center text-slate-600 dark:text-slate-300">
              No
            </TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">
              Periode
            </TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">
              SPPH / Mitra
            </TableHead>
            <TableHead className="text-slate-600 dark:text-slate-300">
              Unit / LP / DP
            </TableHead>
            <TableHead className="text-right text-slate-600 dark:text-slate-300">
              Target (Ton)
            </TableHead>
            <TableHead className="text-right text-slate-600 dark:text-slate-300">
              Realisasi (Ton)
            </TableHead>
            <TableHead className="text-center text-slate-600 dark:text-slate-300">
              Persentase
            </TableHead>
            <TableHead className="text-center text-slate-600 dark:text-slate-300">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white dark:bg-slate-900">
          {data.map((item, index) => {
            const isAchieved = item.tercapai;
            
            return (
              <TableRow 
                key={item.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <TableCell className="text-center align-top py-3 text-slate-600 dark:text-slate-400">
                  {index + 1}
                </TableCell>
                <TableCell className="align-top py-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Bulan {item.month}
                  </span>
                  <br />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Tahun {item.year}
                  </span>
                </TableCell>
                <TableCell className="align-top py-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]" title={item.spph}>
                    {item.spph}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.company}
                  </span>
                </TableCell>
                <TableCell className="align-top py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[250px] truncate" title={`${item.pic_work_unit} | ${item.loading_location} -> ${item.dumping_location}`}>
                  <div className="font-medium text-slate-800 dark:text-slate-200">{item.pic_work_unit}</div>
                  <div className="text-xs mt-0.5 text-slate-500 dark:text-slate-400">
                    L: {item.loading_location}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    D: {item.dumping_location}
                  </div>
                </TableCell>
                <TableCell className="text-right align-top py-3 font-medium text-slate-700 dark:text-slate-300">
                  {formatNumber(item.target_ton)}
                </TableCell>
                <TableCell className="text-right align-top py-3 font-semibold text-blue-600 dark:text-blue-400">
                  {formatNumber(item.realisasi_ton)}
                </TableCell>
                <TableCell className="text-center align-top py-3">
                  <div className="flex flex-col flex-wrap gap-1 items-center justify-center">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.persentase}%</span>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 dark:bg-slate-700 max-w-[80px]">
                      <div 
                        className={`h-1.5 rounded-full ${isAchieved ? "bg-green-500" : "bg-orange-500"}`} 
                        style={{ width: `${Math.min(item.persentase, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center align-top py-3">
                  <Badge 
                    variant="outline" 
                    className={
                      isAchieved 
                        ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" 
                        : "border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20"
                    }
                  >
                    {isAchieved ? "Tercapai" : "Belum"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
