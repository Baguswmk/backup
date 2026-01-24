import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Clock,
  MapPin,
  Weight,
  AlertTriangle,
} from "lucide-react";
import ModalHeader from "@/shared/components/ModalHeader";
import KendalaModal from "./KendalaModal";
import KendalaTable from "./KendalaTable";
import KendalaDeleteConfirmModal from "./KendalaDeleteConfirmModal";
import RitaseFormModal from "./RitaseFormModal";
import RitaseDetailModal from "./RitaseDetailModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import CompanySection from "./CompanySection";
import { hindranceService } from "@/modules/timbangan/overview/services/hindranceService";
import { showToast } from "@/shared/utils/toast";

const parseMySQLDateTime = (dateString) => {
  if (!dateString) return new Date();
  const [datePart, timePart] = dateString.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hour, minute, second] = timePart.split(":");
  return new Date(year, month - 1, day, hour, minute, second);
};

const HourDetailModal = ({ isOpen, data, hour, onClose }) => {
  const [showKendalaModal, setShowKendalaModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showKendalaDeleteModal, setShowKendalaDeleteModal] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [selectedRitase, setSelectedRitase] = useState(null);
  const [selectedKendala, setSelectedKendala] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [kendalaList, setKendalaList] = useState([]);
  const [isLoadingKendala, setIsLoadingKendala] = useState(false);
  const [isDeletingKendala, setIsDeletingKendala] = useState(false);

  // Fetch kendala data saat modal dibuka
  useEffect(() => {
    if (isOpen && data && hour !== null) {
      fetchKendalaData();
    }
  }, [isOpen, data, hour]);

  const fetchKendalaData = async () => {
    if (!data?.unit_exca) return;

    setIsLoadingKendala(true);
    try {
      // Get date from first ritase or use current date
      const firstRitase = data.ritases?.[0];
      const ritaseDate = firstRitase?.created_at 
        ? parseMySQLDateTime(firstRitase.created_at)
        : new Date();
      const dateStr = ritaseDate.toISOString().split('T')[0];

      const result = await hindranceService.getHindranceDetails({
        exca_hull_no: data.unit_exca,
        date: dateStr,
      });

      if (result.success && result.data?.length > 0) {
        // Filter kendala untuk jam ini dan convert hour_data ke hour number
        const hourKendalaList = result.data.filter(k => {
          if (k.hour_data) {
            const kendalaHour = parseInt(k.hour_data.split(':')[0]);
            return kendalaHour === hour;
          }
          return false;
        });

        // Parse evidence untuk setiap kendala
        const parsedKendalaList = hourKendalaList.map(k => {
          let photos = [];
          if (k.evidence) {
            if (typeof k.evidence === 'string') {
              try {
                photos = JSON.parse(k.evidence);
              } catch (e) {
                photos = [];
              }
            } else if (Array.isArray(k.evidence)) {
              photos = k.evidence.map(media => ({
                id: media.id,
                url: media.url,
                name: media.name,
              }));
            }
          }

          return {
            ...k,
            photos,
          };
        });

        setKendalaList(parsedKendalaList);
      } else {
        setKendalaList([]);
      }
    } catch (error) {
      console.error("Error fetching kendala:", error);
      setKendalaList([]);
    } finally {
      setIsLoadingKendala(false);
    }
  };

  // Group ritases by company for this specific hour
  const companyData = useMemo(() => {
    if (!isOpen || !data) return [];

    // Filter ritases untuk jam ini
    const hourRitases = data.ritases.filter((ritase) => {
      const ritaseDate = parseMySQLDateTime(ritase.created_at);
      const ritaseHour = ritaseDate.getHours();
      return ritaseHour === hour;
    });

    // Group by company
    const grouped = hourRitases.reduce((acc, ritase) => {
      const company = ritase.company || "Tidak Diketahui";
      if (!acc[company]) {
        acc[company] = [];
      }
      acc[company].push(ritase);
      return acc;
    }, {});

    const totalRitases = hourRitases.length;
    const TARGET_PER_HOUR = 250;

    return Object.entries(grouped).map(([company, ritases]) => {
      const ritaseCount = ritases.length;
      const targetTonnage = (ritaseCount / totalRitases) * TARGET_PER_HOUR;
      const actualTonnage = ritases.reduce((sum, r) => sum + r.net_weight, 0);
      
      // Filter kendala untuk company ini
      const companyKendala = kendalaList.filter(k => k.company === company);
      
      return {
        company,
        ritases,
        targetTonnage,
        actualTonnage,
        isBelowTarget: actualTonnage < targetTonnage,
        kendalaList: companyKendala,
      };
    });
  }, [isOpen, data, hour, kendalaList]);

  const totalTonnage = useMemo(() => {
    return companyData.reduce((sum, cd) => sum + cd.actualTonnage, 0);
  }, [companyData]);

  const totalTarget = useMemo(() => {
    return companyData.reduce((sum, cd) => sum + cd.targetTonnage, 0);
  }, [companyData]);

  const hasCompaniesWithIssues = useMemo(() => {
    return companyData.some(cd => cd.isBelowTarget);
  }, [companyData]);

  const totalKendala = useMemo(() => {
    return kendalaList.length;
  }, [kendalaList]);

  // Get shift from first ritase
  const currentShift = useMemo(() => {
    if (!data?.ritases?.length) return null;
    const hourRitases = data.ritases.filter((ritase) => {
      const ritaseDate = parseMySQLDateTime(ritase.created_at);
      return ritaseDate.getHours() === hour;
    });
    if (hourRitases.length === 0) return null;
    return hourRitases[0].shift || null;
  }, [data, hour]);

  // Get date from first ritase
  const currentDate = useMemo(() => {
    if (!data?.ritases?.length) return null;
    const firstRitase = data.ritases[0];
    const ritaseDate = parseMySQLDateTime(firstRitase.created_at);
    return ritaseDate.toISOString().split('T')[0];
  }, [data]);

  if (!isOpen || !data) return null;

  const handleCreate = () => {
    setFormMode("create");
    setSelectedRitase(null);
    setShowFormModal(true);
  };

  const handleEdit = (ritase) => {
    setFormMode("edit");
    setSelectedRitase(ritase);
    setShowFormModal(true);
    setActionMenuOpen(null);
  };

  const handleDetail = (ritase) => {
    setSelectedRitase(ritase);
    setShowDetailModal(true);
    setActionMenuOpen(null);
  };

  const handleDelete = (ritase) => {
    setSelectedRitase(ritase);
    setShowDeleteModal(true);
    setActionMenuOpen(null);
  };

  const handleSaveRitase = (formData) => {
    // TODO: Implement actual save logic via API
  };

  const handleConfirmDelete = (id) => {
    // TODO: Implement actual delete logic via API
  };

  const handleSaveKendala = async (kendalaInfo) => {
    // Refresh kendala data untuk memastikan sync dengan database
    await fetchKendalaData();
    showToast.success("Kendala berhasil disimpan");
  };

  const handleEditKendala = (kendala) => {
    setSelectedKendala(kendala);
    setFormMode("edit");
    setShowKendalaModal(true);
  };

  const handleDeleteKendala = (kendala) => {
    setSelectedKendala(kendala);
    setShowKendalaDeleteModal(true);
  };

  const handleConfirmDeleteKendala = async (kendalaId) => {
    setIsDeletingKendala(true);
    try {
      const result = await hindranceService.deleteHindrance(kendalaId);
      
      if (result.success) {
        showToast.success("Kendala berhasil dihapus");
        // Refresh data kendala
        await fetchKendalaData();
        setShowKendalaDeleteModal(false);
        setSelectedKendala(null);
      }
    } catch (error) {
      console.error("Error deleting kendala:", error);
      showToast.error(error.message || "Gagal menghapus kendala");
    } finally {
      setIsDeletingKendala(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-neutral-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <ModalHeader
            title={`Detail Jam ${hour.toString().padStart(2, '0')}:00 - ${data.unit_exca}`}
            subtitle={
              <div className="space-y-2 mt-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Loading:</span>
                    <span className="font-medium dark:text-gray-200">{data.loading_location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Dumping:</span>
                    <span className="font-medium dark:text-gray-200">{data.dumping_location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Target Jam Ini:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {totalTarget.toFixed(2)} Ton
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Realisasi:</span>
                    <span className={`font-bold ${totalTonnage < totalTarget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {totalTonnage.toFixed(2)} Ton
                    </span>
                 
                  </div>
                  {totalKendala > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                      <span className="text-gray-600 dark:text-gray-400">Total Kendala:</span>
                      <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700">
                        {totalKendala}
                      </Badge>
                    </div>
                  )}
                </div>

                {data.pic_work_unit && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">PIC Work Unit:</span>
                    <Badge variant="outline" className="dark:border-gray-600">
                      {data.pic_work_unit}
                    </Badge>
                  </div>
                )}
              </div>
            }
            icon={Clock}
            onClose={onClose}
          />

          <CardContent className="flex-1 overflow-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total {companyData.reduce((sum, cd) => sum + cd.ritases.length, 0)} ritase dari {companyData.length} company pada jam {hour.toString().padStart(2, '0')}:00
              </div>

              <div className="flex gap-2">
                {hasCompaniesWithIssues && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFormMode("create");
                      setSelectedKendala(null);
                      setShowKendalaModal(true);
                    }}
                    className="cursor-pointer dark:hover:bg-orange-900/20 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Input Kendala
                  </Button>
                )}
              </div>
            </div>

            {companyData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-base font-medium">Tidak ada data ritase pada jam ini</p>
                <p className="text-sm mt-1">Jam {hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* List Ritase per Company dengan Kendala */}
                {companyData.map((cd) => (
                  <CompanySection
                    key={cd.company}
                    company={cd.company}
                    ritases={cd.ritases}
                    hour={hour}
                    targetTonnage={cd.targetTonnage}
                    actualTonnage={cd.actualTonnage}
                    kendalaList={cd.kendalaList}
                    onEdit={handleEdit}
                    onDetail={handleDetail}
                    onDelete={handleDelete}
                    onEditKendala={handleEditKendala}
                    onDeleteKendala={handleDeleteKendala}
                    actionMenuOpen={actionMenuOpen}
                    setActionMenuOpen={setActionMenuOpen}
                  />
                ))}

                {/* Grand Total */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        Total Keseluruhan Jam {hour.toString().padStart(2, '0')}:00
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {companyData.length} company • {companyData.reduce((sum, cd) => sum + cd.ritases.length, 0)} ritase
                        {totalKendala > 0 && (
                          <span className="text-orange-600 dark:text-orange-400"> • {totalKendala} kendala</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Target</div>
                          <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
                            {totalTarget.toFixed(2)} Ton
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Realisasi</div>
                          <div className={`font-bold text-2xl ${totalTonnage < totalTarget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                            {totalTonnage.toFixed(2)} Ton
                          </div>
                        </div>
                      </div>
                      {totalTonnage < totalTarget && (
                        <div className="mt-2">
                          <Badge variant="destructive">
                            Kurang {(totalTarget - totalTonnage).toFixed(2)} Ton dari target
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <KendalaModal
        isOpen={showKendalaModal}
        hour={hour}
        mode={formMode}
        currentKendala={selectedKendala}
        onClose={() => {
          setShowKendalaModal(false);
          setSelectedKendala(null);
          setFormMode("create");
        }}
        onSave={handleSaveKendala}
        excaHullNo={data?.unit_exca}
        date={currentDate}
        shift={currentShift}
      />

      <KendalaDeleteConfirmModal
        isOpen={showKendalaDeleteModal}
        kendala={selectedKendala}
        onClose={() => {
          setShowKendalaDeleteModal(false);
          setSelectedKendala(null);
        }}
        onConfirm={handleConfirmDeleteKendala}
        isDeleting={isDeletingKendala}
      />

      <RitaseFormModal
        isOpen={showFormModal}
        mode={formMode}
        ritase={selectedRitase}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveRitase}
      />

      <RitaseDetailModal
        isOpen={showDetailModal}
        ritase={selectedRitase}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEdit}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        ritase={selectedRitase}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default HourDetailModal;