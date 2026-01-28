import React from "react"
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { MapPin, Weight, Clock, Briefcase, AlertTriangle, Image as ImageIcon } from "lucide-react";
import ModalHeader from "@/shared/components/ModalHeader";

const parseMySQLDateTime = (dateString) => {
  if (!dateString) return new Date();
  const [datePart, timePart] = dateString.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hour, minute, second] = timePart.split(":");
  return new Date(year, month - 1, day, hour, minute, second);
};

const OverviewDetailModal = ({ isOpen, data, onClose }) => {
  if (!isOpen || !data) return null;

  const sortedRitases = [...data.ritases].sort((a, b) => {
    const dateA = parseMySQLDateTime(a.created_at);
    const dateB = parseMySQLDateTime(b.created_at);
    return dateA - dateB;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-neutral-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700">
        <ModalHeader
          title={`Detail Ritase - ${data.unit_exca}`}
          subtitle={
            <div className="space-y-2 mt-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Loading:
                  </span>
                  <span className="font-medium dark:text-gray-200">
                    {data.loading_location}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Dumping:
                  </span>
                  <span className="font-medium dark:text-gray-200">
                    {data.dumping_location}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Weight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Total:
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {data.totalTonase.toFixed(2)} Ton
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {data.company && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Mitra:
                    </span>
                    <Badge
                      variant="secondary"
                      className="dark:bg-gray-700 dark:text-gray-200"
                    >
                      {data.company}
                    </Badge>
                  </div>
                )}
                {data.pic_work_unit && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      PIC Work Unit:
                    </span>
                    <Badge
                      variant="outline"
                      className="dark:border-gray-600 dark:text-gray-300"
                    >
                      {data.pic_work_unit}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Ritase:
                  </span>
                  <Badge variant="default" className="dark:bg-blue-600">
                    {data.ritaseCount || data.ritases.length}
                  </Badge>
                </div>
              </div>
            </div>
          }
          onClose={onClose}
        />

        {/* Content */}
        <CardContent className="flex-1 overflow-auto p-4">
          <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Total {data.ritases.length} ritase ditemukan
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">No</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Tanggal & Waktu
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Dump Truck
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Driver</th>
                  <th className="px-3 py-2 text-left font-semibold">Mitra</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Berat (Ton)
                  </th>
                  <th className="px-3 py-2 text-center font-semibold">Shift</th>
                  <th className="px-3 py-2 text-center font-semibold">Kendala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedRitases.map((ritase, idx) => {
                  const ritaseDate = parseMySQLDateTime(ritase.created_at);
                  const displayDate =
                    ritase.date ||
                    ritaseDate.toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                  
                  const hasKendala = ritase.kendala && ritase.kendala.trim().length > 0;
                  const hasPhotos = ritase.photos && ritase.photos.length > 0;

                  return (
                    <React.Fragment key={ritase.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              {displayDate}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                              {ritaseDate.toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-medium dark:text-gray-200">
                          {ritase.unit_dump_truck}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                          {ritase.driver || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="secondary"
                            className="text-xs dark:bg-gray-700 dark:text-gray-200"
                          >
                            {ritase.company}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-medium dark:text-gray-200">
                          {ritase.net_weight.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            variant={
                              ritase.shift.includes("1") ? "default" : "secondary"
                            }
                            className={
                              ritase.shift.includes("1")
                                ? "dark:bg-blue-600"
                                : "dark:bg-gray-700 dark:text-gray-200"
                            }
                          >
                            {ritase.shift.split("(")[0].trim()}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {hasKendala ? (
                            <div className="flex items-center justify-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                              {hasPhotos && (
                                <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                      
                      {/* Kendala Row - Expandable */}
                      {hasKendala && (
                        <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                          <td colSpan="8" className="px-3 py-3">
                            <div className="flex gap-3">
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                                    Kendala:
                                  </span>
                                  {ritase.kategori && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-400"
                                    >
                                      {ritase.kategori.charAt(0).toUpperCase() + ritase.kategori.slice(1)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                                  {ritase.kendala}
                                </p>
                                
                                {/* Foto Pendukung */}
                                {hasPhotos && (
                                  <div className="mt-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <ImageIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Foto Pendukung ({ritase.photos.length})
                                      </span>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                      {ritase.photos.map((photo, photoIdx) => (
                                        <div
                                          key={photoIdx}
                                          className="relative w-20 h-20 rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 group cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => window.open(photo.url || photo, '_blank')}
                                        >
                                          <img
                                            src={photo.url || photo}
                                            alt={`Foto kendala ${photoIdx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                                        </div>
                                      ))}
                                    </div>
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
              <tfoot className="bg-blue-50 dark:bg-blue-900/30 font-semibold sticky bottom-0">
                <tr>
                  <td
                    colSpan="5"
                    className="px-3 py-2 text-right dark:text-gray-200"
                  >
                    Total Keseluruhan:
                  </td>
                  <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400">
                    {data.totalTonase.toFixed(2)}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewDetailModal;