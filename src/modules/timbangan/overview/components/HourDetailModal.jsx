import React, { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { 
  Clock, MapPin, Weight, Plus, Edit, Eye, Trash2, 
  AlertTriangle, FileText, MoreVertical, Calendar 
} from "lucide-react";

// ✅ IMPORTED SHARED COMPONENTS
import ModalHeader from "@/shared/components/ModalHeader";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import DeleteConfirmDialog from "@/shared/components/DeleteConfirmDialog";

const parseMySQLDateTime = (dateString) => {
  if (!dateString) return new Date();
  const [datePart, timePart] = dateString.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hour, minute, second] = timePart.split(":");
  return new Date(year, month - 1, day, hour, minute, second);
};

// ✅ REFACTORED: Using ConfirmDialog instead of custom modal
const KendalaModal = ({ isOpen, hour, currentKendala, onClose, onSave }) => {
  const [kendala, setKendala] = useState(currentKendala || "");
  const [kategori, setKategori] = useState("operasional");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ kendala, kategori, hour });
    onClose();
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSubmit}
      title={`Input Kendala Jam ${hour}:00`}
      confirmLabel="Simpan Kendala"
      cancelLabel="Batal"
      variant="default"
      icon={AlertTriangle}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">
            Kategori Kendala <span className="text-red-500">*</span>
          </label>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200"
            required
          >
            <option value="operasional">Operasional</option>
            <option value="cuaca">Cuaca</option>
            <option value="alat">Kerusakan Alat</option>
            <option value="material">Material</option>
            <option value="infrastruktur">Infrastruktur</option>
            <option value="lainnya">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">
            Deskripsi Kendala <span className="text-red-500">*</span>
          </label>
          <textarea
            value={kendala}
            onChange={(e) => setKendala(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200 min-h-30"
            placeholder="Jelaskan kendala yang menyebabkan produksi tidak mencapai 250 ton..."
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimal 10 karakter
          </p>
        </div>
      </form>
    </ConfirmDialog>
  );
};

// ✅ REFACTORED: Using ModalHeader
const RitaseFormModal = ({ isOpen, mode, ritase, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    ritase || {
      unit_dump_truck: "",
      driver: "",
      company: "",
      net_weight: "",
      shift: "Shift 1",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
    }
  );

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* ✅ USING ModalHeader */}
        <ModalHeader
          title={mode === "create" ? "Tambah Ritase Baru" : "Edit Ritase"}
          icon={mode === "create" ? Plus : Edit}
          onClose={onClose}
        />

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Unit Dump Truck <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.unit_dump_truck}
                  onChange={(e) => handleChange("unit_dump_truck", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Contoh: DT-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Nama Driver <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.driver}
                  onChange={(e) => handleChange("driver", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Nama driver"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Mitra/Perusahaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200"
                  placeholder="Nama perusahaan"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Berat (Ton) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.net_weight}
                  onChange={(e) => handleChange("net_weight", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Shift <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => handleChange("shift", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200"
                  required
                >
                  <option value="Shift 1">Shift 1</option>
                  <option value="Shift 2">Shift 2</option>
                  <option value="Shift 3">Shift 3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-200">
                  Waktu <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 dark:text-gray-200"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {mode === "create" ? "Simpan" : "Update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ✅ REFACTORED: Using ModalHeader
const RitaseDetailModal = ({ isOpen, ritase, onClose, onEdit }) => {
  if (!isOpen || !ritase) return null;

  const ritaseDate = parseMySQLDateTime(ritase.created_at);
  const displayDate = ritaseDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const displayTime = ritaseDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* ✅ USING ModalHeader */}
        <ModalHeader
          title="Detail Ritase"
          icon={Eye}
          onClose={onClose}
        />

        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Unit Dump Truck
                </label>
                <p className="font-semibold text-lg dark:text-gray-200">{ritase.unit_dump_truck}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Driver
                </label>
                <p className="font-semibold text-lg dark:text-gray-200">{ritase.driver || "-"}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Mitra/Perusahaan
                </label>
                <Badge variant="secondary" className="mt-1 dark:bg-gray-700">
                  {ritase.company}
                </Badge>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Shift
                </label>
                <div className="mt-1">
                  <Badge
                    variant={ritase.shift.includes("1") ? "default" : "secondary"}
                    className={ritase.shift.includes("1") ? "dark:bg-blue-600" : "dark:bg-gray-700"}
                  >
                    {ritase.shift.split("(")[0].trim()}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Weight className="w-4 h-4" />
                  Berat Bersih
                </label>
                <p className="font-bold text-2xl text-green-600 dark:text-green-400">
                  {ritase.net_weight.toFixed(2)} Ton
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Tanggal & Waktu
                </label>
                <p className="font-medium dark:text-gray-200">{displayDate}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{displayTime}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={onClose}
                className="cursor-pointer"
              >
                Tutup
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  onEdit(ritase);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ✅ REFACTORED: Using ConfirmDialog
const DeleteConfirmModal = ({ isOpen, ritase, onClose, onConfirm }) => {
  if (!isOpen || !ritase) return null;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => {
        onConfirm(ritase.id);
        onClose();
      }}
      title="Konfirmasi Hapus"
      confirmLabel="Hapus"
      cancelLabel="Batal"
      variant="destructive"
      icon={Trash2}
    >
      <p className="text-gray-700 dark:text-gray-300 mb-4">
        Apakah Anda yakin ingin menghapus ritase ini?
      </p>
      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md mb-4">
        <p className="text-sm dark:text-gray-300">
          <span className="font-semibold">Unit:</span> {ritase.unit_dump_truck}
        </p>
        <p className="text-sm dark:text-gray-300">
          <span className="font-semibold">Driver:</span> {ritase.driver}
        </p>
        <p className="text-sm dark:text-gray-300">
          <span className="font-semibold">Berat:</span> {ritase.net_weight} Ton
        </p>
      </div>
      <p className="text-sm text-red-600 dark:text-red-400">
        Data yang dihapus tidak dapat dikembalikan!
      </p>
    </ConfirmDialog>
  );
};

// ✅ MAIN COMPONENT - REFACTORED: Using ModalHeader
const HourDetailModal = ({ isOpen, data, hour, onClose }) => {
  const [showKendalaModal, setShowKendalaModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [selectedRitase, setSelectedRitase] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [kendalaData, setKendalaData] = useState(null);

  if (!isOpen || !data) return null;

  const hourRitases = data.ritases.filter((ritase) => {
    const ritaseDate = parseMySQLDateTime(ritase.created_at);
    const ritaseHour = ritaseDate.getHours();
    return ritaseHour === hour;
  });

  const sortedRitases = [...hourRitases].sort((a, b) => {
    const dateA = parseMySQLDateTime(a.created_at);
    const dateB = parseMySQLDateTime(b.created_at);
    return dateA - dateB;
  });

  const totalTonnage = hourRitases.reduce((sum, r) => sum + r.net_weight, 0);
  const isBelowThreshold = totalTonnage < 250;

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
    // Implementasi save ke backend
  };

  const handleConfirmDelete = (id) => {
    // Implementasi delete ke backend
  };

  const handleSaveKendala = (kendalaInfo) => {
    setKendalaData(kendalaInfo);
    // Implementasi save kendala ke backend
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {/* ✅ USING ModalHeader */}
          <ModalHeader
            title={`Detail Jam ${hour}:00 - ${data.unit_exca}`}
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
                    <span className="text-gray-600 dark:text-gray-400">Total Jam Ini:</span>
                    <span className={`font-bold ${isBelowThreshold ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {totalTonnage.toFixed(2)} Ton
                    </span>
                    {isBelowThreshold && (
                      <Badge variant="destructive" className="ml-2">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Di bawah target
                      </Badge>
                    )}
                  </div>
                </div>

                {data.pic_work_unit && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">PIC Work Unit:</span>
                    <Badge variant="outline" className="dark:border-gray-600">
                      {data.pic_work_unit}
                    </Badge>
                  </div>
                )}

                {kendalaData && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                          Kendala: {kendalaData.kategori}
                        </p>
                        <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                          {kendalaData.kendala}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            }
            icon={Clock}
            onClose={onClose}
          />

          <CardContent className="flex-1 overflow-auto p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total {sortedRitases.length} ritase pada jam {hour}:00
              </div>

              <div className="flex gap-2">
                {isBelowThreshold && (
                  <Button
                    variant="outline"
                    onClick={() => setShowKendalaModal(true)}
                    className="cursor-pointer dark:hover:bg-orange-900/20 dark:border-orange-600 text-orange-600 dark:text-orange-400"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Input Kendala
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">No</th>
                    <th className="px-3 py-2 text-left font-semibold">Tanggal & Waktu</th>
                    <th className="px-3 py-2 text-left font-semibold">Dump Truck</th>
                    <th className="px-3 py-2 text-left font-semibold">Driver</th>
                    <th className="px-3 py-2 text-left font-semibold">Mitra</th>
                    <th className="px-3 py-2 text-right font-semibold">Berat (Ton)</th>
                    <th className="px-3 py-2 text-center font-semibold">Shift</th>
                    <th className="px-3 py-2 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedRitases.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                        Tidak ada data ritase pada jam ini
                      </td>
                    </tr>
                  ) : (
                    sortedRitases.map((ritase, idx) => {
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
                          <td className="px-3 py-2 font-medium dark:text-gray-200">{ritase.unit_dump_truck}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                            {ritase.driver || "-"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="secondary" className="text-xs dark:bg-gray-700">
                              {ritase.company}
                            </Badge>
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
                              <div className="absolute right-0  mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                                <Button
                                  onClick={() => handleDetail(ritase)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer dark:text-gray-200"
                                >
                                  <Eye className="w-4 h-4" />
                                  Detail
                                </Button>
                                <Button
                                  onClick={() => handleEdit(ritase)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer dark:text-gray-200"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDelete(ritase)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer rounded-b-md"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Hapus
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {sortedRitases.length > 0 && (
                  <tfoot className="bg-blue-50 dark:bg-blue-900/30 font-semibold sticky bottom-0">
                    <tr>
                      <td colSpan="5" className="px-3 py-2 text-right">
                        Total Tonase Jam {hour}:00:
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={isBelowThreshold ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                          {totalTonnage.toFixed(2)}
                        </span>
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <KendalaModal
        isOpen={showKendalaModal}
        hour={hour}
        currentKendala={kendalaData?.kendala}
        onClose={() => setShowKendalaModal(false)}
        onSave={handleSaveKendala}
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