import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { format } from "date-fns";
import { formatNumber } from "@/shared/utils/number";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const safeFormat = (iso, fmt = "dd/MM/yyyy HH:mm") => {
  if (!iso) return "—";
  try { return format(new Date(iso), fmt); } catch { return "—"; }
};

// Label-Value pair with subtle bg tray
const InfoCell = ({ label, value, mono = false, accent = false }) => (
  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3.5 py-3 border border-slate-100 dark:border-slate-700/60 flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
      {label}
    </span>
    <span
      className={[
        "text-sm font-semibold leading-snug",
        mono ? "font-mono" : "",
        accent
          ? "text-blue-600 dark:text-blue-400"
          : "text-gray-900 dark:text-gray-100",
      ].join(" ")}
    >
      {value || "—"}
    </span>
  </div>
);

// Stat card (Durasi / Tonase)
const StatCard = ({ label, value, unit, sub, colorClass }) => (
  <div
    className={[
      "relative overflow-hidden rounded-xl p-5 flex flex-col gap-1 border",
      colorClass,
    ].join(" ")}
  >
    {/* Decorative circle */}
    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 bg-current" />
    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
    <div className="flex items-baseline gap-1.5 mt-0.5">
      <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight leading-none">
        {value}
      </span>
      <span className="text-xs font-semibold opacity-60">{unit}</span>
    </div>
    {sub && <span className="text-xs opacity-50 mt-0.5">{sub}</span>}
  </div>
);

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────
export const DetailPengeluaranKA = ({ isOpen, onClose, data }) => {
  if (!data) return null;

  const carriages = data.carriages || [];
  const totalBerat = carriages.reduce((s, c) => s + (c.load_weight || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="
          max-w-4xl max-h-[90vh] overflow-hidden flex flex-col
          bg-white dark:bg-slate-900
          border border-slate-200 dark:border-slate-700
          p-0 rounded-2xl shadow-2xl
        "
      >
        {/* ── Sticky Header ── */}
        <DialogHeader
          className="
            sticky top-0 z-10
            flex flex-row items-center gap-3
            px-6 py-4
            bg-white/90 dark:bg-slate-900/90 backdrop-blur-md
            border-b border-slate-100 dark:border-slate-800
          "
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" width={18} height={18}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <DialogTitle className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              Detail Rangkaian
            </DialogTitle>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold truncate mt-0.5">
              {data.trainId}
            </p>
          </div>

          {/* Badge: jumlah gerbong */}
          <div className="shrink-0 text-right">
            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-700">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
              {carriages.length} gerbong
            </span>
          </div>
        </DialogHeader>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-6">

          {/* ── Info Grid ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2.5">
              Informasi Rangkaian
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <InfoCell label="Stockpile" value={data.stockpileLocation} />
              <InfoCell label="TLS" value={data.tlsLocation} />
              <InfoCell label="Tujuan" value={data.destination} accent />
              <InfoCell label="Product Brand" value={data.product} />
              <InfoCell label="Operator" value={data.operator} />
              <InfoCell label="Shift" value={data.shift} />
              {carriages[0]?.start_loading_time && (
                <InfoCell
                  label="Mulai Muat"
                  value={safeFormat(carriages[0].start_loading_time, "dd/MM/yyyy HH:mm")}
                  mono
                />
              )}
              {carriages[0]?.end_loading_time && (
                <InfoCell
                  label="Selesai Muat"
                  value={safeFormat(carriages[0].end_loading_time, "dd/MM/yyyy HH:mm")}
                  mono
                />
              )}
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Durasi Muat"
              value={formatNumber(data.durationMinutes, 0)}
              unit="menit"
              colorClass="
                bg-gradient-to-br from-blue-500 to-blue-700
                text-white border-blue-400 dark:border-blue-600
              "
            />
            <StatCard
              label="Total Tonase"
              value={formatNumber(data.totalTonnage, 3)}
              unit="ton"
              sub={`${carriages.length} gerbong dimuat`}
              colorClass="
                bg-gradient-to-br from-emerald-500 to-emerald-700
                text-white border-emerald-400 dark:border-emerald-600
              "
            />
          </div>

          {/* ── Carriage Table ── */}
          <div>
            {/* Section divider */}
            <div className="flex items-center gap-3 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0">
                Daftar Gerbong
              </p>
              <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              {carriages.length > 0 && (
                <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full shrink-0">
                  {carriages.length} item
                </span>
              )}
            </div>

            {carriages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 gap-2">
                <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span className="text-sm">Tidak ada data gerbong</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <table className="w-full text-xs border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
                      <th className="px-3 py-3 text-center w-8">No</th>
                      <th className="px-3 py-3 text-center w-8">#</th>
                      <th className="px-3 py-3 text-left min-w-[120px]">No. Gerbong</th>
                      <th className="px-3 py-3 text-left min-w-[100px]">Produk</th>
                      <th className="px-3 py-3 text-left ">Source</th>
                      <th className="px-3 py-3 text-right w-24">Kapasitas</th>
                      <th className="px-3 py-3 text-right w-28">Berat (ton)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {carriages.map((c, i) => (
                      <tr
                        key={c.id || i}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
                      >
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold tabular-nums">
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold tabular-nums">
                            {c.seq_no ?? i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-[11px]">
                            {c.carriage_number || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            {c.coal_type || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 tabular-nums text-slate-500 dark:text-slate-400">
                          {c.origin || "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          {formatNumber(c.capasity, 0)}
                          <span className="text-slate-400 dark:text-slate-500 ml-0.5 text-[10px]">ton</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                            {formatNumber(c.load_weight, 3)}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 ml-0.5 text-[10px]">
                            {c.unit_of_weight || "ton"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* ── Footer Total ── */}
                  {carriages.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60">
                        <td colSpan={4} className="px-3 py-2.5 text-right text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">
                          Total Berat
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="font-extrabold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 text-sm">
                            {formatNumber(totalBerat, 3)}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 ml-1 text-[10px]">ton</span>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
