import React from "react";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  MapPin,
  Truck,
  Fuel,
  Activity,
  Clock,
  Ruler,
  Box,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ── helpers ───────────────────────────────────────────────────────────────────
// Gunakan en-US agar desimal pakai titik (bukan koma seperti id-ID)
const fmtNum = (val) =>
  val != null && !isNaN(val)
    ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : "-";

const fmtDate = (val) => {
  if (!val) return "-";
  try { return format(new Date(val), "dd MMM yyyy, HH:mm"); } catch { return "-"; }
};

const STATUS_CLASS = {
  Haul: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  Hold: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  Standby: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  Breakdown: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  Maintenance: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
};

// ── Sub-components ────────────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value, mono = false, className = "" }) => (
  <div className="space-y-1">
    <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </p>
    <div
      className={cn(
        "text-sm font-medium text-slate-900 dark:text-slate-100",
        "bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg",
        "border border-slate-100 dark:border-slate-800",
        mono && "font-mono",
        className,
      )}
    >
      {value ?? <span className="text-slate-400 italic">-</span>}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const DetailBeltConveyorModal = ({ isOpen, onClose, data }) => {
  if (!data) return null;

  const delta = data.delta ?? null;
  const isPositiveDelta = delta !== null && Number(delta) >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl rounded-xl">

        {/* Gradient header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-24 h-24" />
          </div>

          <DialogHeader className="relative z-10 text-left">
            <DialogTitle className="flex flex-col gap-1">
              <span className="text-teal-100 text-xs font-medium tracking-widest uppercase">
                Detail Belt Conveyor
              </span>
              <span className="text-white text-xl font-bold">
                {data.loader ?? "—"}
                {data.hauler ? <span className="font-normal text-teal-100 ml-2">· {data.hauler}</span> : null}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Quick badges */}
          <div className="flex flex-wrap gap-2 mt-4 relative z-10">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {fmtDate(data.date)}
            </Badge>
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm text-xs">
              {data.shift ?? "-"}
            </Badge>
            {data.status && (
              <Badge className={cn("border text-xs", STATUS_CLASS[data.status] ?? "bg-white/20 text-white border-0")}>
                {data.status}
              </Badge>
            )}
            <Badge className="bg-white/10 text-teal-100 border-0 text-xs font-mono">
              {data.measurement_type ?? "Beltscale"}
            </Badge>
          </div>
        </div>

        <ScrollArea className="max-h-[65vh]">
          <div className="p-6 space-y-6">

            {/* ── Tonase section ── */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                Pengukuran & Tonase
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <DetailRow
                  icon={Activity}
                  label="Beltscale (T)"
                  value={fmtNum(data.beltscale)}
                  mono
                />
                <DetailRow
                  icon={Activity}
                  label="Tonase (T)"
                  value={<span className="text-teal-600 dark:text-teal-400 font-semibold">{fmtNum(data.tonnage)}</span>}
                  mono
                />
                {/* <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                    {isPositiveDelta ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    )}
                    Delta (Δ)
                  </p>
                  <div
                    className={cn(
                      "text-sm font-mono font-semibold px-3 py-2 rounded-lg border",
                      "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800",
                      delta !== null
                        ? isPositiveDelta
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-red-400"
                        : "text-slate-400",
                    )}
                  >
                    {delta !== null ? fmtNum(delta) : "-"}
                  </div>
                </div> */}
              </div>
            </div>

            {/* ── Equipment section ── */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                Peralatan
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <DetailRow icon={Truck} label="Loader" value={data.loader || "-"} />
                <DetailRow icon={Truck} label="Hauler" value={data.hauler || "-"} mono />
                <DetailRow icon={Box} label="Coal Type" value={data.coal_type?.name || data.coal_type || null} />
                {data.distance != null && (
                  <DetailRow
                    icon={Ruler}
                    label="Jarak"
                    value={`${Number(data.distance).toLocaleString("en-US")} m`}
                  />
                )}
              </div>
            </div>

            {/* ── Location section ── */}
            {(data.loading_point || data.dumping_point) && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                  Lokasi
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow icon={MapPin} label="Loading Point" value={data.loading_point?.name || data.loading_point || "-"} />
                  <DetailRow icon={MapPin} label="Dumping Point" value={data.dumping_point?.name || data.dumping_point || "-"} />
                </div>
              </div>
            )}

              {/* ── Meta ── */}
            {data.createdAt && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-right">
                Dibuat: {fmtDate(data.createdAt)}
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailBeltConveyorModal;
