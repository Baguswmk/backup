import { useState, useEffect } from "react";
import { Eye, Search, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/shared/components/ui/dropdown-menu";
import ModalHeader from "@/shared/components/ModalHeader";
import StatusBadge from "@/shared/components/StatusBadge";
import EmptyState from "@/shared/components/EmptyState";
import { masterDataService } from "@/modules/timbangan/masterData/services/masterDataService";
import { cn } from "@/lib/utils";

const DumpTruckDetailModal = ({
  isOpen,
  onClose,
  setting,
  availableFleets = [],
  onMoveUnit,
}) => {
  const [query, setQuery] = useState("");
  const [operatorsMap, setOperatorsMap] = useState({});
  const [isLoadingOperators, setIsLoadingOperators] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setQuery("");
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const loadOperators = async () => {
      setIsLoadingOperators(true);
      try {
        const ops = await masterDataService.fetchOperators();
        const map = {};
        ops.forEach((op) => {
          map[String(op.id)] = op.name;
        });
        setOperatorsMap(map);
      } catch (error) {
        console.error("Failed to load operators:", error);
      } finally {
        setIsLoadingOperators(false);
      }
    };

    loadOperators();
  }, [isOpen]);

  if (!setting) return null;

  const units = setting.units || [];
  const filtered = units.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.hull_no?.toLowerCase().includes(q) ||
      u.company?.toLowerCase().includes(q) ||
      u.workUnit?.toLowerCase().includes(q) ||
      (u.status || "").toLowerCase().includes(q)
    );
  });

  const currentFleetId = setting.fleet?.id;

  if (!isOpen) return null;

  return (
    <div className="detail-modal fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
        <ModalHeader
          title={`Unit Dump Truck • ${setting.fleet?.name || "–"}`}
          subtitle={`Fleet: ${setting.fleet?.excavator || "-"} • ${
            setting.fleet?.shift || "-"
          } • ${setting.fleet?.workUnit || "-"}`}
          icon={Eye}
          onClose={onClose}
        />

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Cari unit (hull_no, company, workUnit, status)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(
                "pl-10 border-none hover:bg-gray-200 cursor-pointer",
                "dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
              )}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Eye}
              title="Tidak ada unit"
              description={
                query
                  ? "Tidak ada unit yang cocok dengan pencarian Anda."
                  : "Belum ada unit dump truck di fleet ini."
              }
            />
          ) : (
            <div className="rounded-md overflow-hidden">
              {/* ✅ FIXED: Added dark mode classes */}
              <div className={cn(
                "grid grid-cols-5 gap-2 px-3 py-2 text-xs font-medium",
                "bg-gray-50 dark:bg-gray-900",
                "text-gray-600 dark:text-gray-400"
              )}>
                <div>Hull No</div>
                <div>Company</div>
                <div>Status</div>
                <div>Operator</div>
                <div className="text-right">Aksi</div>
              </div>

              <div className="max-h-72 overflow-auto">
                {filtered.map((u) => (
                  <div
                    key={u.id}
                    className={cn(
                      "grid grid-cols-5 gap-2 px-3 py-2 text-sm items-center",
                      "hover:bg-gray-50 dark:hover:bg-gray-700",
                      "border-b border-gray-100 dark:border-gray-700",
                      "dark:text-gray-300"
                    )}
                  >
                    <div className="font-medium dark:text-gray-200">
                      {u.hull_no}
                    </div>
                    <div>{u.company || "-"}</div>
                    <div>
                      <StatusBadge status={u.status || "active"} />
                    </div>
                    <div className="text-sm">
                      {isLoadingOperators ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        operatorsMap[String(u.operatorId)] || "-"
                      )}
                    </div>

                    <div className="text-right">
                      {onMoveUnit ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 gap-2 cursor-pointer hover:bg-gray-200 disabled:cursor-not-allowed",
                                "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                              )}
                            >
                              Pindah
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent 
                            align="end" 
                            className={cn(
                              "w-80 bg-white border-none",
                              "dark:bg-gray-800 dark:border-gray-700"
                            )}
                          >
                            <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                              Pilih Fleet Tujuan (per Unit)
                            </div>
                            {(availableFleets || [])
                              .filter(
                                (f) => String(f.id) !== String(currentFleetId)
                              )
                              .map((fleet) => (
                                <DropdownMenuItem
                                  key={fleet.id}
                                  onClick={() =>
                                    onMoveUnit?.(setting.id, u.id, fleet.id)
                                  }
                                  className={cn(
                                    "cursor-pointer",
                                    "dark:text-gray-200 dark:hover:bg-gray-700"
                                  )}
                                >
                                  {fleet.name} — {fleet.excavator} •{" "}
                                  {fleet.shift}
                                </DropdownMenuItem>
                              ))}
                            {(!availableFleets ||
                              (availableFleets || []).filter(
                                (f) => String(f.id) !== String(currentFleetId)
                              ).length === 0) && (
                              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                Tidak ada fleet tujuan tersedia
                              </div>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          –
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex justify-end border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            onClick={onClose}
            className={cn(
              "cursor-pointer disabled:cursor-not-allowed hover:bg-gray-200",
              "dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            )}
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DumpTruckDetailModal;