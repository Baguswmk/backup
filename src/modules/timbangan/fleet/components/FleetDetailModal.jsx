import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Settings,
  MapPin,
  Truck,
  Users,
  UserCheck,
  User,
} from "lucide-react";
import ModalHeader from "@/shared/components/ModalHeader";
import { InfoCard, InfoItem } from "@/shared/components/InfoCard";

const FleetDetailModal = ({ isOpen, config, onClose, onEdit, dumptruck }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !config) return null;

  const dumptruckCount = dumptruck?.length || 0;
  const dumptruckList = dumptruck || [];

  // ADDED: Handle multiple inspectors & checkers
  const inspectors = config.inspectors || [];
  const checkers = config.checkers || [];
  
  // Fallback to old format if new format is empty
  const displayInspectors = inspectors.length > 0 
    ? inspectors 
    : config.inspector 
      ? [{ id: config.inspectorId, name: config.inspector }]
      : [];
      
  const displayCheckers = checkers.length > 0
    ? checkers
    : config.checker
      ? [{ id: config.checkerId, name: config.checker }]
      : [];

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title="Detail Fleet Configuration"
          icon={Settings}
          onClose={onClose}
        />

        <div className="p-6 space-y-6">
          {/* Fleet Configuration */}
          <InfoCard title="Konfigurasi Fleet" icon={Settings} variant="default">
            <InfoItem
              label="Excavator"
              icon={Settings}
              value={config.excavator}
            />
            <InfoItem
              label="Loading Location"
              icon={MapPin}
              value={config.loadingLocation}
            />
            <InfoItem
              label="Dumping Location"
              icon={MapPin}
              value={config.dumpingLocation}
            />
          </InfoCard>

          {/* Inspector & Checker - UPDATED */}
          <InfoCard title="Inspector & Checker" icon={Users} variant="purple">
            {/* Inspectors */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Users className="w-4 h-4" />
                <span>Inspector{displayInspectors.length > 1 ? 's' : ''}</span>
                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  {displayInspectors.length}
                </span>
              </div>
              {displayInspectors.length > 0 ? (
                <div className="space-y-1 pl-6">
                  {displayInspectors.map((inspector, idx) => (
                    <div 
                      key={inspector.id || idx}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <div className="w-1.5 h-1.5 bg-purple-500 dark:bg-purple-400 rounded-full" />
                      <span>{inspector.name || '-'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 pl-6">
                  Tidak ada inspector
                </div>
              )}
            </div>

            {/* Checkers */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <UserCheck className="w-4 h-4" />
                <span>Checker{displayCheckers.length > 1 ? 's' : ''}</span>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                  {displayCheckers.length}
                </span>
              </div>
              {displayCheckers.length > 0 ? (
                <div className="space-y-1 pl-6">
                  {displayCheckers.map((checker, idx) => (
                    <div 
                      key={checker.id || idx}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <div className="w-1.5 h-1.5 bg-green-500 dark:bg-green-400 rounded-full" />
                      <span>{checker.name || '-'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 pl-6">
                  Tidak ada checker
                </div>
              )}
            </div>
          </InfoCard>

          {/* Additional Info */}
          {(config.coalType || config.distance > 0 || config.workUnit) && (
            <InfoCard title="Informasi Tambahan" variant="default">
              {config.workUnit && (
                <InfoItem label="Work Unit" value={config.workUnit} />
              )}
              {config.coalType && (
                <InfoItem label="Coal Type" value={config.coalType} />
              )}
              {config.distance > 0 && (
                <InfoItem label="Distance" value={`${config.distance} m`} />
              )}
              {config.measurementType && (
                <InfoItem label="Measurement Type" value={config.measurementType} />
              )}
            </InfoCard>
          )}

          {/* Dumptruck Assignment */}
          <InfoCard title="Dumptruck Assignment" icon={Truck} variant="primary">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Dumptruck Assigned
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {dumptruckCount}
                  </p>
                </div>
                <Truck className="w-16 h-16 text-blue-200 dark:text-blue-700" />
              </div>

              {dumptruckCount > 0 ? (
                <div className="bg-neutral-50 dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-blue-100 dark:bg-blue-900 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                            No
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                            Hull No
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                            Operator
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                            Company
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dumptruckList.map((dt, index) => (
                          <tr
                            key={dt.id || index}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          >
                            <td className="px-3 py-2 text-sm dark:text-gray-300">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium dark:text-gray-200">
                              {dt.hull_no}
                            </td>
                            <td className="px-3 py-2 text-sm dark:text-gray-300">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                                {dt.operatorName}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                              {dt.company}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-50 dark:bg-gray-900 rounded-lg p-4 border border-blue-200 dark:border-blue-800 text-center">
                  <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Belum ada dump truck yang di-assign ke fleet ini
                  </p>
                </div>
              )}
            </div>
          </InfoCard>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={onClose}
              className="cursor-pointer hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Tutup
            </Button>
            {onEdit && (
              <Button
                onClick={() => {
                  onClose();
                  onEdit(config);
                }}
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-200"
              >
                Edit Fleet
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDetailModal;