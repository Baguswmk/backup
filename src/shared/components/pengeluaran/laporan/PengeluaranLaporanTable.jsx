import React from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

export const PengeluaranLaporanTable = ({
  data = [],
  columns = [],
  offset = 0,
  onViewDetail,
  onEdit,
  onDelete,
}) => {
  const hasActions = onViewDetail || onEdit || onDelete;

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-32 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 text-sm">
        Tidak ada data rekaman untuk ditampilkan.
      </div>
    );
  }

  return (
    <div className="w-full border border-gray-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11.5px] whitespace-nowrap">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700/60">
              <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300 w-12 text-center">
                No
              </th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    "py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right"
                  )}
                >
                  {col.header}
                </th>
              ))}
              {hasActions && (
                <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300 text-center w-24 sticky right-0 bg-slate-50 dark:bg-slate-800/80 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)] border-l border-gray-100 dark:border-slate-700/40">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || row.trainId || rowIndex}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
              >
                <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 font-medium">
                  {offset + rowIndex + 1}
                </td>
                
                {columns.map((col, colIndex) => {
                  const value = row[col.key];
                  const renderContent = col.render ? col.render(value, row) : value;

                  return (
                    <td
                      key={colIndex}
                      className={cn(
                        "py-2 px-3 text-slate-700 dark:text-slate-200",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right",
                        col.truncate && "max-w-[120px] truncate",
                        col.className
                      )}
                      title={col.truncate && typeof renderContent === 'string' ? renderContent : undefined}
                    >
                      {renderContent || "-"}
                    </td>
                  );
                })}

                {hasActions && (
                  <td className="py-1.5 px-3 text-center sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50/80 dark:group-hover:bg-slate-800/40 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.02)] border-l border-gray-50 dark:border-slate-800 transition-colors">
                    <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {onViewDetail && (
                        <button
                          onClick={() => onViewDetail(row)}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/40 cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row.id || row.trainId)}
                          className="p-1.5 rounded text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-900/30 cursor-pointer"
                          title="Edit Rekaman"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row.id, row.trainId)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 cursor-pointer"
                          title="Hapus Rekaman"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
