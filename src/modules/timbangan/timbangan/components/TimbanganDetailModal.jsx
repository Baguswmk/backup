import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  X,
  Trash2,
  Save,
  Truck,
  User,
  MapPin,
  Weight,
  Clock,
  Settings,
  AlertCircle,
  Loader2,
  FileEdit,
} from "lucide-react";
import {
  formatDate,
  formatTime,
  formatDateTime,
} from "@/shared/utils/date";
import { getFirstTruthyValue } from "@/shared/utils/object";
import { formatWeight } from "@/shared/utils/number";
import PrintTicketButton from "@/modules/timbangan/timbangan/components/PrintTicketButton";

const TimbanganDetailModal = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onNavigateToEdit,
  userRole = "user",
}) => {
  const [mode, setMode] = useState("view");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedData, setEditedData] = useState({
    gross_weight: item?.gross_weight || "",
  });
  const [errors, setErrors] = useState({});

  const extractedData = React.useMemo(() => {
    if (!item) return {};

    return {
      hullNo: getFirstTruthyValue(
        item,
        "hull_no",
        "dumptruck",
        "unit_dump_truck"
      ),
      excavator: getFirstTruthyValue(
        item,
        "fleet_excavator",
        "unit_exca",
        "excavator"
      ),
      dumpTruck: getFirstTruthyValue(
        item,
        "dumptruck",
        "unit_dump_truck",
        "hull_no"
      ),
      operator: getFirstTruthyValue(
        item,
        "operator",
        "operator_name",
        "operatorId",
        "operatorName"
      ),
      loadingLocation: getFirstTruthyValue(
        item,
        "fleet_loading",
        "loading_location",
        "source"
      ),
      dumpingLocation: getFirstTruthyValue(
        item,
        "fleet_dumping",
        "dumping_location",
        "destination"
      ),
      shift: getFirstTruthyValue(item, "fleet_shift", "shift"),
      netWeight: item.net_weight || item.tonnage || 0,
      tareWeight: item.tare_weight || 0,
      grossWeight:
        item.gross_weight ||
        parseFloat(item.net_weight || item.tonnage || 0) +
          parseFloat(item.tare_weight || 0),
    };
  }, [item]);

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

  useEffect(() => {
    if (item) {
      setEditedData({ gross_weight: item.gross_weight || "" });
      setMode("view");
      setErrors({});
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const canEdit = userRole === "admin" || item.status !== "approved";
  const canDelete = userRole === "admin";

  const validateWeight = (value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return "Berat harus lebih dari 0";
    }
    if (num > 9999.99) {
      return "Berat maksimal 9999.99 ton";
    }
    return null;
  };

  const handleNavigateToEditForm = () => {
    if (onNavigateToEdit) {
      onNavigateToEdit(item);
      onClose();
    }
  };

  const handleDeleteMode = () => {
    setMode("delete");
  };

  const handleCancel = () => {
    setMode("view");
    setEditedData({ gross_weight: extractedData.grossWeight });
    setErrors({});
  };

  const handleSaveEdit = async () => {
    const error = validateWeight(editedData.gross_weight);
    if (error) {
      setErrors({ gross_weight: error });
      return;
    }

    setIsSubmitting(true);
    try {
      await onEdit(item, {
        ...item,
        gross_weight: parseFloat(editedData.gross_weight),
      });
      setMode("view");
    } catch (error) {
      console.error("Edit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(item);
      onClose();
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      ACTIVE: { className: "bg-green-100 text-green-800", label: "Active" },
      INACTIVE: {
        className: "bg-yellow-100 text-yellow-800",
        label: "Inactive",
      },
      CLOSED: { className: "bg-red-100 text-red-800", label: "Closed" },
      pending: { className: "bg-blue-100 text-blue-800", label: "Pending" },
      approved: { className: "bg-green-100 text-green-800", label: "Approved" },
    };
    const config = statusMap[status] || statusMap.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="detail-modal fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-50 dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-50 dark:bg-gray-800  px-6 py-4 flex items-center justify-between z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 dark:text-white">
              <Weight className="w-5 h-5" />
              {mode === "view" && "Detail Data Timbangan"}
              {mode === "edit" && "Edit Data Timbangan"}
              {mode === "delete" && "Hapus Data Timbangan"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {mode === "view" && "Informasi lengkap data ritase"}
              {mode === "edit" && "Perbarui data timbangan"}
              {mode === "delete" && "Konfirmasi penghapusan data"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 dark:bg-gray-800">
          {mode === "delete" ? (
            <>
              <Alert
                variant="destructive"
                className="mb-4 dark:bg-red-900/20 dark:border-red-800"
              >
                <AlertCircle className="w-4 h-4 dark:text-red-400" />
                <AlertDescription className="dark:text-red-300">
                  <p className="font-medium mb-2">
                    Apakah Anda yakin ingin menghapus data ini?
                  </p>
                  <p className="text-sm">
                    Data yang sudah dihapus tidak dapat dikembalikan.
                  </p>
                </AlertDescription>
              </Alert>

              <Card className="bg-gray-50 dark:bg-gray-900 ">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        ID:
                      </span>
                      <span className="font-mono text-sm dark:text-gray-300">
                        {item.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Hull No:
                      </span>
                      <span className="font-bold dark:text-gray-200">
                        {extractedData.hullNo}
                      </span>
                    </div>
                    <div className="flex justify-between dark:text-gray-400">
                      <span className="text-gray-600">Operator:</span>
                      <span className="font-medium">
                        {extractedData.operator}
                      </span>
                    </div>
                    <div className="flex justify-between dark:text-gray-400">
                      <span className="text-gray-600">Net Weight:</span>
                      <span className="font-bold text-green-600">
                        {formatWeight(extractedData.netWeight)} ton
                      </span>
                    </div>
                    <div className="flex justify-between dark:text-gray-400">
                      <span className="text-gray-600">Excavator:</span>
                      <span className="font-medium">
                        {extractedData.excavator}
                      </span>
                    </div>
                    <div className="flex justify-between dark:text-gray-400">
                      <span className="text-gray-600">Shift:</span>
                      <Badge variant="outline">{extractedData.shift}</Badge>
                    </div>
                    <div className="flex justify-between dark:text-gray-400">
                      <span className="text-gray-600">Waktu:</span>
                      <span className="font-medium dark:text-gray-400">
                        {formatDateTime(item.createdAt || item.timestamp)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {parseFloat(extractedData.netWeight) > 50 && (
                <Alert className="mt-4 border-orange-200 bg-orange-50">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <AlertDescription className="text-sm text-orange-800">
                    ⚠️ Data ini memiliki tonnage besar (
                    {formatWeight(extractedData.netWeight)} ton). Pastikan Anda
                    sudah yakin sebelum menghapus.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {/* Timestamp Info */}
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                    <Clock className="w-4 h-4" />
                    Waktu Pencatatan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Tanggal:
                    </span>
                    <span className="font-medium dark:text-gray-200">
                      {formatDate(item.createdAt || item.timestamp)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Waktu:
                    </span>
                    <span className="font-medium font-mono dark:text-gray-400">
                      {formatTime(item.createdAt || item.timestamp)}
                    </span>
                  </div>
                  {item.updatedAt && item.updatedAt !== item.createdAt && (
                    <div className="flex justify-between items-center pt-2 ">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Terakhir diupdate:
                      </span>
                      <span className="text-sm dark:text-gray-400">
                        {formatDateTime(item.updatedAt)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hull Number & Weight */}
              <Card className="dark:bg-gray-900 border-none dark:text-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 dark:text-white">
                    <Truck className="w-4 h-4" />
                    Data Ritase
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600">
                      Nomor Lambung / Hull No
                    </Label>
                    <div className="mt-1 font-mono font-bold text-lg text-blue-600">
                      {extractedData.hullNo}
                    </div>
                  </div>

                  {mode === "edit" ? (
                    <div>
                      <Label htmlFor="gross_weight">Gross Weight (ton) *</Label>
                      <Input
                        id="gross_weight"
                        type="text"
                        inputMode="decimal"
                        value={editedData.gross_weight}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === "") {
                            setEditedData({ gross_weight: value });
                            setErrors({});
                            return;
                          }

                          const regex = /^\d*\.?\d{0,2}$/;
                          if (!regex.test(value)) {
                            return;
                          }

                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue > 9999.99) {
                            return;
                          }

                          setEditedData({ gross_weight: value });
                          setErrors({});
                        }}
                        className={`mt-1 ${
                          errors.gross_weight ? "border-red-500" : ""
                        }`}
                        placeholder="0.00"
                      />
                      {errors.gross_weight && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.gross_weight}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Maksimal 9999.99 ton
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          Tare Weight
                        </div>
                        <div className="font-bold text-orange-600">
                          {formatWeight(extractedData.tareWeight)} ton
                        </div>
                      </div>
                      <div className="text-center ">
                        <div className="text-xs text-gray-600 mb-1">
                          Net Weight
                        </div>
                        <div className="font-bold text-2xl text-green-600">
                          {formatWeight(extractedData.netWeight)} ton
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-600 mb-1">
                          Gross Weight
                        </div>
                        <div className="font-bold text-blue-600">
                          {formatWeight(extractedData.grossWeight)} ton
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fleet Information */}
              <Card className="dark:bg-gray-900 border-none dark:text-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Informasi Fleet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Excavator</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className="font-mono">
                          {extractedData.excavator}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">
                        Dump Truck
                      </Label>
                      <div className="mt-1 font-medium">
                        {extractedData.dumpTruck}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Shift</Label>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={
                            extractedData.shift === "PAGI"
                              ? "bg-yellow-50 dark:bg-gray-800 dark:text-gray-200  "
                              : "bg-blue-50 dark:bg-gray-800 dark:text-gray-200"
                          }
                        >
                          {extractedData.shift}
                        </Badge>
                      </div>
                    </div>
                    {item.fleet_date && (
                      <div>
                        <Label className="text-xs text-gray-600">
                          Tanggal Fleet
                        </Label>
                        <div className="mt-1 font-medium">
                          {formatDate(item.fleet_date)}
                        </div>
                      </div>
                    )}
                    {item.status && (
                      <div>
                        <Label className="text-xs text-gray-600">Status</Label>
                        <div className="mt-1">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Personnel Information */}
             <Card className="dark:bg-gray-900 border-none dark:text-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Personnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Operator</Label>
                      <div className="mt-1 font-medium">
                        {extractedData.operator}
                      </div>
                      {item.weigh_bridge && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.weigh_bridge}
                        </div>
                      )}
                    </div>
                    {item.fleet_inspector && (
                      <div>
                        <Label className="text-xs text-gray-600">
                          Inspector
                        </Label>
                        <div className="mt-1 font-medium">
                          {item.fleet_inspector}
                        </div>
                      </div>
                    )}
                    {item.fleet_checker && (
                      <div>
                        <Label className="text-xs text-gray-600">Checker</Label>
                        <div className="mt-1 font-medium">
                          {item.fleet_checker}
                        </div>
                      </div>
                    )}
                    {item.fleet_work_unit && (
                      <div>
                        <Label className="text-xs text-gray-600">
                          Work Unit
                        </Label>
                        <div className="mt-1 font-medium">
                          {item.fleet_work_unit}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Location Information */}
              <Card className="dark:bg-gray-900 border-none dark:text-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Lokasi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">
                        Loading Location
                      </Label>
                      <div className="mt-1 font-medium text-blue-600">
                        {extractedData.loadingLocation}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">
                        Dumping Location
                      </Label>
                      <div className="mt-1 font-medium text-red-600">
                        {extractedData.dumpingLocation}
                      </div>
                    </div>
                    {item.distance > 0 && (
                      <div>
                        <Label className="text-xs text-gray-600">
                          Jarak Tempuh
                        </Label>
                        <div className="mt-1 font-medium">
                          {item.distance} meter
                        </div>
                      </div>
                    )}
                    {item.fleet_coal_type && (
                      <div>
                        <Label className="text-xs text-gray-600">
                          Jenis Batubara
                        </Label>
                        <div className="mt-1 font-medium">
                          {item.fleet_coal_type}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-neutral-50 dark:bg-gray-800 px-6 py-4 flex items-center justify-between">
          {mode === "view" && (
            <>
              <Button
                variant="ghost"
                onClick={onClose}
                className="cursor-pointer hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200  dark:hover:bg-gray-600"
              >
                Tutup
              </Button>
              <div className="flex items-center gap-2">
                {canEdit && onNavigateToEdit && (
                  <Button
                    onClick={handleNavigateToEditForm}
                    className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-gray-200"
                  >
                    <FileEdit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteMode}
                    className="cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hapus
                  </Button>
                )}

                <PrintTicketButton data={item} variant="default" />
              </div>
            </>
          )}

          {mode === "edit" && (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Simpan Perubahan
              </Button>
            </>
          )}

          {mode === "delete" && (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Ya, Hapus Data
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimbanganDetailModal;
