import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  BarChart3,
  RefreshCw,
  Package,
  Plus,
  CheckCircle2,
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  Copy,
  FileDown,
  Search,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import Pagination from "@/shared/components/Pagination";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { USER_ROLES } from "@/modules/timbangan/ritase/constant/ritaseConstants";
import RitaseEditForm from "@/modules/timbangan/ritase/components/RitaseEditForm";
import RitaseDuplicateForm from "@/modules/timbangan/ritase/components/RitaseDuplicateForm";
import PrintBukti from "@/modules/timbangan/timbangan/components/PrintBukti";
import { generateRitaseExcel } from "@/modules/timbangan/ritase/services/generateRitaseExcel";
const ITEMS_PER_PAGE = 10;

const RitaseList = ({
  userRole,
  filteredRitaseData,
  isInitialLoading,
  currentPage,
  onPageChange,
  onOpenInputModal,
  filteredFleetCount,
  onRefreshData,
  onDeleteRitase,
  onDuplicateRitase,
}) => {
  const [selectedRitase, setSelectedRitase] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingRitase, setIsDeletingRitase] = useState(false);
  const [pageSize, setPageSize] = useState(10); // Added pageSize state
  const [searchQuery, setSearchQuery] = useState("");
  const isCCR = userRole.toLowerCase() === "ccr";
  const getInputButtonText = () => {
    return userRole === USER_ROLES.OPERATOR_JT ? "Timbang" : "Input Data";
  };

  const searchedData = useMemo(() => {
    if (!searchQuery) return filteredRitaseData;
    const lowerQuery = searchQuery.toLowerCase();
    return filteredRitaseData.filter((item) => {
      return (
        item.unit_dump_truck?.toLowerCase().includes(lowerQuery) ||
        item.hull_no?.toLowerCase().includes(lowerQuery) ||
        item.unit_exca?.toLowerCase().includes(lowerQuery) ||
        item.excavator?.toLowerCase().includes(lowerQuery) ||
        item.company?.toLowerCase().includes(lowerQuery) ||
        item.mitra?.toLowerCase().includes(lowerQuery)
      );
    });
  }, [filteredRitaseData, searchQuery]);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return searchedData.slice(startIdx, endIdx);
  }, [searchedData, currentPage, pageSize]);

  console.log(paginatedData);
  const totalPages = useMemo(() => {
    return Math.ceil(searchedData.length / pageSize);
  }, [searchedData, pageSize]);

  const handleViewDetail = (ritase) => {
    setSelectedRitase(ritase);
    setIsDetailDialogOpen(true);
  };

  const handleEdit = (ritase) => {
    setSelectedRitase(ritase);
    setIsEditModalOpen(true);
  };

  const handleDuplicate = (ritase) => {
    setSelectedRitase(ritase);
    setIsDuplicateModalOpen(true);
  };

  const handleDelete = (ritase) => {
    setSelectedRitase(ritase);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRitase || isDeletingRitase) return;

    setIsDeletingRitase(true);
    try {
      if (onDeleteRitase) {
        await onDeleteRitase(selectedRitase);
      }
      setIsDeleteDialogOpen(false);
      setSelectedRitase(null);
    } catch (error) {
      console.error("Error deleting ritase:", error);
    } finally {
      setIsDeletingRitase(false);
    }
  };

  const handleEditSuccess = async (updatedData) => {
    if (onRefreshData && selectedRitase) {
      await onRefreshData(selectedRitase.id, updatedData);
    } else {
      console.warn("⚠️ onRefreshData not available or selectedRitase is null", {
        hasCallback: !!onRefreshData,
        hasSelectedRitase: !!selectedRitase,
      });
    }

    // Close modal setelah refresh
    setIsEditModalOpen(false);
    setSelectedRitase(null);
  };

  const handleDuplicateSubmit = async (duplicatedData) => {
    try {
      if (onDuplicateRitase) {
        await onDuplicateRitase(duplicatedData);
      }
      setIsDuplicateModalOpen(false);
      setSelectedRitase(null);
    } catch (error) {
      console.error("Error duplicating ritase:", error);
    }
  };

  const handleExportExcel = () => {
    generateRitaseExcel(filteredRitaseData);
  };
  return (
    <>
      <Card
        data-ritase-list
        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
              <BarChart3 className="w-4 h-4" />
              Daftar Ritase Detail
            </CardTitle>
            <div className="flex items-center gap-2">
              {!isCCR && (
                <div className="relative">
                  <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-500 dark:text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cari DT, Exca, Mitra..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (currentPage !== 1 && onPageChange) onPageChange(1);
                    }}
                    className="pl-7 w-[180px] text-xs bg-white dark:bg-gray-800 dark:text-neutral-50 border-gray-200 dark:border-gray-700 h-7"
                  />
                </div>
              )}
              <Badge
                variant="secondary"
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {searchedData.length} total
              </Badge>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                disabled={filteredRitaseData.length === 0}
                className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <FileDown className="w-3 h-3 mr-1" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {isInitialLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Memuat data...
              </p>
            </div>
          ) : filteredRitaseData.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Belum ada data ritase
              </p>
              <Button
                onClick={onOpenInputModal}
                variant="outline"
                className="mt-4 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                disabled={filteredFleetCount === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                {getInputButtonText()}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-thin mt-2">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-16 py-1.5">
                        No
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Shift
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        DT
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Excavator
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Company
                      </TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">
                        Berat Bersih
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Measurement
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Loading
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Dumping
                      </TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((ritase, index) => (
                      <TableRow
                        key={ritase.id || index}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 h-8"
                      >
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {ritase.date ? (
                            <div className="flex flex-col">
                              <span>
                                {format(new Date(ritase.date), "dd MMM yyyy", {
                                  locale: localeId,
                                })}
                              </span>
                              {ritase.createdAt && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {format(
                                    new Date(ritase.createdAt),
                                    "HH:mm:ss",
                                    {
                                      locale: localeId,
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {ritase.shift || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-600 dark:bg-blue-500 text-white">
                            {ritase.hull_no || ritase.unit_dump_truck || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {ritase.unit_exca || ritase.excavator || "-"}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {ritase.company || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          >
                            {ritase.net_weight || "0"} ton
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="capitalize border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                          >
                            {ritase.measurement_type || "timbangan"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {ritase.loading_location || "-"}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">
                          {ritase.dumping_location || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 dark:hover:bg-gray-700 cursor-pointer hover:bg-gray-200"
                              >
                                <MoreVertical className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white dark:bg-gray-800 dark:border-gray-700"
                            >
                              <DropdownMenuItem
                                onClick={() => handleViewDetail(ritase)}
                                className="dark:hover:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:text-gray-200 text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Detail
                              </DropdownMenuItem>
                              <PrintBukti
                                data={ritase}
                                variant="ghost"
                                size="sm"
                              />
                              {isCCR && (
                                <>
                                  {" "}
                                  <DropdownMenuSeparator className="dark:bg-gray-700" />
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(ritase)}
                                    className="dark:hover:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:text-gray-200 text-xs"
                                  >
                                    <Edit2 className="w-3 h-3 mr-1" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDuplicate(ritase)}
                                    className="dark:hover:bg-gray-700 cursor-pointer hover:bg-gray-200 dark:text-gray-200 text-xs"
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Tambah Ritase
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="dark:bg-gray-700" />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(ritase)}
                                    className="text-red-600 dark:text-red-400 dark:hover:bg-gray-700 cursor-pointer hover:bg-gray-200 text-xs"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {(totalPages > 1 || filteredRitaseData.length > 10) && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                  isLoading={false}
                  itemsPerPage={pageSize}
                  onItemsPerPageChange={setPageSize}
                  totalItems={searchedData.length}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-neutral-50">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Detail Ritase
            </DialogTitle>
          </DialogHeader>
          {selectedRitase && (
            <div className="space-y-4">
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Hull No (DT)
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.unit_dump_truck || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Excavator
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.unit_exca || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Company
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.company || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Operator
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.operator || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Measurement Type
                  </div>
                  <Badge
                    variant="outline"
                    className="capitalize dark:text-gray-200"
                  >
                    {selectedRitase.measurement_type || "timbangan"}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Loading Location
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.loading_location || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Dumping Location
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.dumping_location || "-"}
                  </div>
                </div>

                {/* Weight Details - Conditional based on measurement_type */}
                {selectedRitase.measurement_type === "timbangan" ? (
                  <>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Berat Kotor
                      </div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {selectedRitase.gross_weight || "-"} ton
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Berat Kosong
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedRitase.tare_weight || "-"} ton
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Berat Bersih
                      </div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {selectedRitase.net_weight || "-"} ton
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Berat Bersih
                    </div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {selectedRitase.net_weight || "-"} ton
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Distance
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.distance || "0"} m
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Date
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.date
                      ? format(new Date(selectedRitase.date), "dd MMMM yyyy", {
                          locale: localeId,
                        })
                      : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Shift
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedRitase.shift || "-"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Waktu Input
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {format(
                      new Date(selectedRitase.createdAt || selectedRitase.date),
                      "dd MMMM yyyy HH:mm:ss",
                      { locale: localeId },
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <PrintBukti
                  data={selectedRitase}
                  variant="ghost"
                  size="sm"
                ></PrintBukti>
                {isCCR && (
                  <Button
                    onClick={() => {
                      setIsDetailDialogOpen(false);
                      handleEdit(selectedRitase);
                    }}
                    variant="outline"
                    className="flex-1 dark:text-gray-200 "
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {selectedRitase && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl lg:min-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="dark:text-neutral-50">
                Edit Data Ritase
              </DialogTitle>
            </DialogHeader>
            <RitaseEditForm
              editingItem={selectedRitase}
              onSuccess={handleEditSuccess} // ✅ FIXED: Callback dengan updatedData
              onCancel={() => {
                setIsEditModalOpen(false);
                setSelectedRitase(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Duplicate Modal */}
      {selectedRitase && (
        <Dialog
          open={isDuplicateModalOpen}
          onOpenChange={setIsDuplicateModalOpen}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin dark:bg-slate-900 bg-white border-none">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-neutral-50 ">
                <Copy className="w-5 h-5" />
                Tambah Data Ritase
              </DialogTitle>
            </DialogHeader>
            <RitaseDuplicateForm
              sourceRitase={selectedRitase}
              onSubmit={handleDuplicateSubmit}
              onCancel={() => {
                setIsDuplicateModalOpen(false);
                setSelectedRitase(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {selectedRitase && (
        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedRitase(null);
          }}
          onConfirm={handleConfirmDelete}
          target={{
            hull_no: selectedRitase.hull_no,
            excavator: selectedRitase.unit_exca,
            loadingLocation: selectedRitase.loading_location,
            dumpingLocation: selectedRitase.dumping_location,
            weight:
              selectedRitase.measurement_type === "bypass" ||
              selectedRitase.measurement_type === "manual"
                ? selectedRitase.net_weight
                : selectedRitase.gross_weight,
            measurement_type: selectedRitase.measurement_type,
          }}
          isProcessing={isDeletingRitase}
        />
      )}
    </>
  );
};

export default RitaseList;
