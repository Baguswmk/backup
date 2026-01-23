// KendalaTable.jsx - Updated dengan Edit & Delete actions
import React, { useState } from 'react';
import { AlertTriangle, FileText, Image, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

const KendalaTable = ({ kendalaList, isLoading, onEdit, onDelete }) => {
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Memuat data kendala...</span>
        </div>
      </div>
    );
  }

  if (!kendalaList || kendalaList.length === 0) {
    return null;
  }

  const handleEdit = (kendala) => {
    onEdit?.(kendala);
    setActionMenuOpen(null);
  };

  const handleDelete = (kendala) => {
    onDelete?.(kendala);
    setActionMenuOpen(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-orange-50 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h3 className="font-semibold text-orange-900 dark:text-orange-100">
            Daftar Kendala pada Jam Ini ({kendalaList.length})
          </h3>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                No
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Kategori
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Kendala
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Deskripsi
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Waktu
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Shift
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Bukti
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
                  className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <Badge 
                      variant="outline" 
                      className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700"
                    >
                      {kendala.hindrance_category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {kendala.hindrance}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                      {kendala.description || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      <div>{kendala.start_time} - {kendala.end_time}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {kendala.date}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="dark:bg-gray-700">
                      {kendala.shift}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {photos.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          {photos.length} foto
                        </span>
                        <div className="flex gap-1 ml-2">
                          {photos.slice(0, 3).map((photo, idx) => (
                            <div
                              key={idx}
                              className="relative w-10 h-10 rounded border border-gray-300 dark:border-gray-600 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(photo.url || photo, '_blank')}
                            >
                              <img
                                src={photo.url || photo}
                                alt={`Bukti ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {photos.length > 3 && (
                            <div className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                +{photos.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        Tidak ada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu
                      open={actionMenuOpen === kendala.id}
                      onOpenChange={(open) => setActionMenuOpen(open ? kendala.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 dark:bg-slate-800  border-none">
                        <DropdownMenuItem
                          onClick={() => handleEdit(kendala)}
                          className="cursor-pointer dark:text-neutral-50"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(kendala)}
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

      {/* Footer Summary */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Total kendala tercatat: <span className="font-semibold text-gray-900 dark:text-gray-100">{kendalaList.length}</span>
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-xs">
            * Kendala yang mempengaruhi ketercapaian target
          </span>
        </div>
      </div>
    </div>
  );
};

export default KendalaTable;