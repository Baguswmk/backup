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
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Eye,
  Printer,
  Edit2,
  Trash2,
  MoreVertical,
  Copy,
  Search,
  X,
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
import AdvancedFilter from "@/shared/components/AdvancedFilter";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { USER_ROLES } from "@/modules/timbangan/ritase/constant/ritaseConstants";
import RitaseEditForm from "@/modules/timbangan/ritase/components/RitaseEditForm";
import RitaseDuplicateForm from "@/modules/timbangan/ritase/components/RitaseDuplicateForm";

const ITEMS_PER_PAGE = 10;

const RitaseList = ({
  userRole,
  filteredRitaseData,
  isInitialLoading,
  isRefreshing,
  currentPage,
  onPageChange,
  onOpenInputModal,
  filteredFleetCount,
  onPrintTicket,
  onUpdateRitase,
  onDeleteRitase,
  onDuplicateRitase, 
}) => {
  const [selectedRitase, setSelectedRitase] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingRitase, setIsDeletingRitase] = useState(false);
  const getInputButtonText = () => {
    return userRole === USER_ROLES.OPERATOR_JT ? "Timbang" : "Input Data";
  };

  // Filter data berdasarkan search query
  const searchedData = useMemo(() => {
    if (!searchQuery.trim()) return filteredRitaseData;
    
    const lowerQuery = searchQuery.toLowerCase().trim();
    
    return filteredRitaseData.filter((ritase) => {
      // Gabungkan semua field yang bisa dicari menjadi satu string
      const searchableText = [
        ritase.hull_no,
        ritase.unit_exca,
        ritase.company,
        ritase.operator,
        ritase.loading_location,
        ritase.dumping_location,
        ritase.shift,
        ritase.date,
      ]
        .filter(Boolean) // Hapus nilai null/undefined
        .join(' ') // Gabungkan dengan spasi
        .toLowerCase();
      
      return searchableText.includes(lowerQuery);
    });
  }, [filteredRitaseData, searchQuery]);

  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    return searchedData.slice(startIdx, endIdx);
  }, [searchedData, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(searchedData.length / ITEMS_PER_PAGE);
  }, [searchedData]);

  const handleViewDetail = (ritase) => {
    setSelectedRitase(ritase);
    setIsDetailDialogOpen(true);
  };

  const handlePrintTicket = (ritase) => {
    if (onPrintTicket) onPrintTicket(ritase);
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

  const handleEditSubmit = async (result) => {
    if (result.success) {
      setIsEditModalOpen(false);
      setSelectedRitase(null);
      if (onUpdateRitase) {
        await onUpdateRitase(result.data);
      }
    }
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

  return (
    <>
      <Card
        data-ritase-list
        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <BarChart3 className="w-5 h-5" />
              Daftar Ritase Detail
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {searchedData.length} dari {filteredRitaseData.length} total
              </Badge>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder="Cari berdasarkan Hull No, Unit, Company, Operator, Location, atau Shift..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isInitialLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Memuat data...
              </p>
            </div>
          ) : searchedData.length === 0 && searchQuery ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Tidak ada data yang sesuai dengan pencarian "{searchQuery}"
              </p>
              <Button
                onClick={() => setSearchQuery("")}
                variant="outline"
                className="mt-4 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Reset Pencarian
              </Button>
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
              <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold w-16">
                        No
                      </TableHead>
                       <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Date
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Shift
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Hull No
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Excavator
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Company
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Type
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Loading
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Dumping
                      </TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300 font-semibold">
                        Weight
                      </TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 font-semibold">
                        Waktu
                      </TableHead>
                      <TableHead className="text-center text-gray-700 dark:text-gray-300 font-semibold w-20">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((ritase, index) => (
                      <TableRow
                        key={ritase.id || index}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {ritase.date ? format(new Date(ritase.date), "dd MMM yyyy", { locale: localeId }) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          <Badge variant="outline" className="text-xs border-gray-300 dark:border-gray-600">
                            {ritase.shift || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Badge className="bg-blue-600 dark:bg-blue-500 text-white">
                            {ritase.unit_dump_truck}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {ritase.unit_exca || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm">
                          {ritase.company || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                          >
                            {ritase.measurement_type || "timbangan"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm">
                          {ritase.loading_location || "-"}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 text-sm">
                          {ritase.dumping_location || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {/* {ritase.measurement_type === "bypass" ||
                              ritase.measurement_type === "manual"
                                ? ritase.net_weight || "-"
                                : ritase.gross_weight || "-"} */}
                                {ritase.net_weight}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ton
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {format(
                            new Date(ritase.createdAt || ritase.date),
                            "HH:mm",
                            { locale: localeId },
                          )}
                        </TableCell>
                        <TableCell className="text-center ">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-neutral-50"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-neutral-50 dark:bg-slate-800 dark:text-neutral-50 border-none shadow-sm shadow-slate-700"
                            >
                              <DropdownMenuItem
                                onClick={() => handleViewDetail(ritase)}
                                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Detail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handlePrintTicket(ritase)}
                                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700"
                              >
                                <Printer className="mr-2 h-4 w-4" />
                                Cetak Karcis
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(ritase)}
                                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700"
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Tambah Ritase
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(ritase)}
                                className="cursor-pointer hover:bg-gray-200 dark:hover:bg-slate-700"
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(ritase)}
                                className="cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-slate-700"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                    isLoading={isRefreshing}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl bg-neutral-50 dark:bg-slate-800 ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 dark:text-gray-200">
              <Eye className="w-5 h-5" />
              Detail Ritase
            </DialogTitle>
          </DialogHeader>

          {selectedRitase && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Hull No
                  </div>
                  <Badge className="mt-1 bg-blue-600 dark:bg-blue-500 text-white">
                    {selectedRitase.unit_dump_truck}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Status
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Information */}
              <div className="grid grid-cols-2 gap-4">
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
                        Gross Weight
                      </div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {selectedRitase.gross_weight || "-"} ton
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Tare Weight
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedRitase.tare_weight || "-"} ton
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Net Weight
                      </div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {selectedRitase.net_weight || "-"} ton
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Net Weight
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
                    {selectedRitase.date ? format(new Date(selectedRitase.date), "dd MMMM yyyy", { locale: localeId }) : "-"}
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
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => handlePrintTicket(selectedRitase)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Cetak Karcis
                </Button>
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {selectedRitase && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl lg:min-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="dark:text-neutral-50">
                Edit Data Ritase
              </DialogTitle>
            </DialogHeader>
            <RitaseEditForm
              editingItem={selectedRitase}
              onSubmit={handleEditSubmit}
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
        <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-neutral-50">
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