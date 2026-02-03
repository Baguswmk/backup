import React, { useState } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Clock,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Building2,
  FileText,
  Image,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

const parseMySQLDateTime = (dateString) => {
  if (!dateString) return new Date();
  const [datePart, timePart] = dateString.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hour, minute, second] = timePart.split(":");
  return new Date(year, month - 1, day, hour, minute, second);
};

const CompanySection = ({ 
  company, 
  ritases, 
  hour,
  targetTonnage,
  actualTonnage,
  kendalaList = [],
  onEdit,
  onDetail,
  onDelete,
  onEditKendala,
  onDeleteKendala,
  actionMenuOpen,
  setActionMenuOpen
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isKendalaOpen, setIsKendalaOpen] = useState(false); // Default tertutup
  const [kendalaActionMenuOpen, setKendalaActionMenuOpen] = useState(null);
  
  const sortedRitases = [...ritases].sort((a, b) => {
    const dateA = parseMySQLDateTime(a.created_at);
    const dateB = parseMySQLDateTime(b.created_at);
    return dateA - dateB;
  });

  const isBelowTarget = actualTonnage < targetTonnage;

  // Fungsi untuk mendapatkan full URL foto
  const getPhotoUrl = (photo, useFormat = 'thumbnail') => {
    if (!photo) return '';
    
    let url = '';
    
    // Jika photo adalah object dengan formats (untuk thumbnail)
    if (photo.formats && photo.formats[useFormat]) {
      url = photo.formats[useFormat].url;
    } 
    // Fallback ke url utama
    else if (photo.url) {
      url = photo.url;
    }
    // Jika photo adalah string
    else if (typeof photo === 'string') {
      url = photo;
    }
    
    if (!url) return '';
    
    // Tambahkan base path jika diperlukan
    if (url.startsWith('http')) return url;
    if (url.startsWith('/timbangan-internal')) return url;
    if (url.startsWith('/uploads')) return `/timbangan-internal${url}`;
    return `/timbangan-internal/uploads/${url}`;
  };

  const handleEditKendala = (kendala) => {
    onEditKendala?.(kendala);
    setKendalaActionMenuOpen(null);
  };

  const handleDeleteKendala = (kendala) => {
    onDeleteKendala?.(kendala);
    setKendalaActionMenuOpen(null);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {company}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {sortedRitases.length} ritase
                  {kendalaList.length > 0 && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">
                      • {kendalaList.length} kendala
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">Target</div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {targetTonnage.toFixed(2)} Ton
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">Realisasi</div>
                <div className={`font-bold ${isBelowTarget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {actualTonnage.toFixed(2)} Ton
                </div>
              </div>
                  
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {/* Tabel Kendala - Tampilkan jika ada dengan Collapsible */}
          {kendalaList.length > 0 && (
            <Collapsible open={isKendalaOpen} onOpenChange={setIsKendalaOpen}>
              <div className="bg-orange-50/50 dark:bg-orange-900/10 border-b border-orange-200 dark:border-orange-700 mb-4">
                <CollapsibleTrigger className="w-full">
                  <div className="px-4 py-3 bg-orange-100 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/40 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isKendalaOpen ? (
                          <ChevronDown className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        )}
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                          Kendala Tercatat ({kendalaList.length})
                        </span>
                      </div>
                      <span className="text-xs text-orange-700 dark:text-orange-300">
                        {isKendalaOpen ? 'Klik untuk tutup' : 'Klik untuk lihat detail'}
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="overflow-x-auto ">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">No</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Kategori</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Kendala</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Deskripsi</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Waktu</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Shift</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Bukti</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-100 dark:divide-orange-900/20">
                        {kendalaList.map((kendala, index) => {
                          // Parse evidence photos
                          let photos = [];
                          if (kendala.evidence) {
                            if (typeof kendala.evidence === 'string') {
                              try {
                                const parsed = JSON.parse(kendala.evidence);
                                photos = Array.isArray(parsed) ? parsed : [];
                              } catch (e) {
                                photos = [];
                              }
                            } else if (Array.isArray(kendala.evidence)) {
                              photos = kendala.evidence;
                            }
                          }

                          return (
                            <tr 
                              key={kendala.id} 
                              className="hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-colors"
                            >
                              <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                              <td className="px-3 py-2">
                                <Badge 
                                  variant="outline" 
                                  className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700 text-xs"
                                >
                                  {kendala.hindrance_category}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-start gap-2">
                                  <FileText className="w-3 h-3 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {kendala.hindrance}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <p className="text-gray-600 dark:text-gray-400 max-w-xs">
                                  {kendala.description || '-'}
                                </p>
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-gray-900 dark:text-gray-100">
                                  <div className="text-xs">{kendala.start_time} - {kendala.end_time}</div>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="secondary" className="dark:bg-gray-700 text-xs">
                                  {kendala.shift}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">
                                {photos.length > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <Image className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                      {photos.length}
                                    </span>
                                    <div className="flex gap-1">
                                      {photos.slice(0, 2).map((photo, idx) => {
                                        const thumbnailUrl = getPhotoUrl(photo, 'thumbnail');
                                        const fullUrl = getPhotoUrl(photo, 'large') || getPhotoUrl(photo);
                                        
                                        return thumbnailUrl ? (
                                          <div
                                            key={idx}
                                            className="relative w-8 h-8 rounded border border-gray-300 dark:border-gray-600 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => window.open(fullUrl, '_blank')}
                                            title={photo.name || `Foto ${idx + 1}`}
                                          >
                                            <img
                                              src={thumbnailUrl}
                                              alt={`Bukti ${idx + 1}`}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                console.error('Image load failed:', thumbnailUrl);
                                                e.target.parentElement.innerHTML = `
                                                  <div class="w-full h-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-xs text-red-600">
                                                    !
                                                  </div>
                                                `;
                                              }}
                                            />
                                          </div>
                                        ) : null;
                                      })}
                                      {photos.length > 2 && (
                                        <div className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                            +{photos.length - 2}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <DropdownMenu
                              open={kendalaActionMenuOpen === kendala.id}
                              onOpenChange={(open) => setKendalaActionMenuOpen(open ? kendala.id : null)}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 dark:bg-slate-800 border-none">
                                <DropdownMenuItem
                                  onClick={() => handleEditKendala(kendala)}
                                  className="cursor-pointer dark:text-neutral-50"
                                >
                                  <Edit className="mr-2 h-4 w-4 " />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteKendala(kendala)}
                                  className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Tabel Ritase */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">No</th>
                  <th className="px-3 py-2 text-left font-semibold">Tanggal & Waktu</th>
                  <th className="px-3 py-2 text-left font-semibold">Dump Truck</th>
                  <th className="px-3 py-2 text-left font-semibold">Driver</th>
                  <th className="px-3 py-2 text-right font-semibold">Berat (Ton)</th>
                  <th className="px-3 py-2 text-center font-semibold">Shift</th>
                  <th className="px-3 py-2 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedRitases.map((ritase, idx) => {
                  const ritaseDate = parseMySQLDateTime(ritase.created_at);
                  const displayDate = ritase.date || ritaseDate.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={ritase.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {displayDate}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                            {ritaseDate.toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
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
                      <td className="px-3 py-2 text-right font-medium dark:text-gray-200">
                        {ritase.net_weight.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant={ritase.shift.includes("1") ? "default" : "secondary"}
                          className={ritase.shift.includes("1") ? "dark:bg-blue-600" : "dark:bg-gray-700"}
                        >
                          {ritase.shift.split("(")[0].trim()}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionMenuOpen(actionMenuOpen === ritase.id ? null : ritase.id)}
                          className="h-8 w-8 p-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>

                        {actionMenuOpen === ritase.id && (
                          <div className="absolute right-2 mt-2 w-48 bg-neutral-50 dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                            <Button
                              onClick={() => onDetail(ritase)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer dark:text-gray-200"
                            >
                              <Eye className="w-4 h-4" />
                              Detail
                            </Button>
                            <Button
                              onClick={() => onEdit(ritase)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer dark:text-gray-200"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => onDelete(ritase)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer rounded-b-md"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-blue-50 dark:bg-blue-900/30 font-semibold">
                <tr>
                  <td colSpan="4" className="px-3 py-2 text-right">
                    Subtotal {company}:
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={isBelowTarget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                      {actualTonnage.toFixed(2)}
                    </span>
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default CompanySection;