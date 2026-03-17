import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { 
  CheckCircle2, 
  MapPin, 
  Navigation, 
  Truck, 
  User, 
  Calendar,
  CalendarDays,
  Weight,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function DetailRencanaModal({ isOpen, onClose, data }) {
  if (!data) return null;

  const rawDocument = data.coal_flow_document?.data?.attributes;
  const rawUrl = rawDocument?.url || data.document?.url;
  const docUrl = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${import.meta.env.VITE_API_URL || ''}${rawUrl}`) : null;
  const docName = rawDocument?.name || data.document?.name || "Unduh Dokumen";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-neutral-50 border-b border-gray-100 dark:border-gray-800 pb-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Detail Rencana Pengangkutan
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {/* Main Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Navigation className="w-4 h-4 text-blue-500" />
                Lokasi Loading
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {data.loading_location || "-"}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <MapPin className="w-4 h-4 text-orange-500" />
                Lokasi Dumping
              </div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {data.dumping_location || "-"}
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Truck className="w-3.5 h-3.5" />
                Jumlah Fleet
              </div>
              <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                {data.total_fleet || 0} Unit
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Weight className="w-3.5 h-3.5" />
                Total Tonase
              </div>
              <div>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm">
                  {data.total_tonase?.toLocaleString("id-ID") || "0"} ton
                </Badge>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <User className="w-3.5 h-3.5" />
                PIC 
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.pic_work_unit || "-"}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Tanggal Efektif
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.effective_date 
                  ? format(new Date(data.effective_date), "dd MMMM yyyy", { locale: localeId })
                  : "-"}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Waktu Dibuat
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.createdAt 
                  ? format(new Date(data.createdAt), "dd MMMM yyyy HH:mm:ss", { locale: localeId })
                  : "-"}
              </div>
            </div>
          </div>

          {(docUrl) && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Dokumen Lampiran
              </div>
              <a 
                href={docUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center justify-between sm:justify-start gap-3 px-3 py-2 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-100 dark:border-emerald-800/50 w-full sm:w-auto"
              >
                <span className="truncate max-w-[200px] sm:max-w-xs">{docName}</span>
                <div className="bg-white dark:bg-emerald-900/50 p-1.5 rounded-md shadow-sm shrink-0">
                  <Download className="w-3.5 h-3.5" />
                </div>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
