import React from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Eye, Edit, Weight, Calendar } from "lucide-react";
import ModalHeader from "@/shared/components/ModalHeader";

const parseMySQLDateTime = (dateString) => {
  if (!dateString) return new Date();
  const [datePart, timePart] = dateString.split(" ");
  const [year, month, day] = datePart.split("-");
  const [hour, minute, second] = timePart.split(":");
  return new Date(year, month - 1, day, hour, minute, second);
};

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
      <Card className="w-full max-w-2xl bg-neutral-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <ModalHeader title="Detail Ritase" icon={Eye} onClose={onClose} />

        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Unit Dump Truck
                </label>
                <p className="font-semibold text-lg dark:text-gray-200">
                  {ritase.unit_dump_truck}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Driver
                </label>
                <p className="font-semibold text-lg dark:text-gray-200">
                  {ritase.driver || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Mitra/Perusahaan
                </label>
                <div className="mt-1">
                                <Badge variant="secondary" className="mt-1 dark:bg-gray-700">
                  {ritase.company}
                </Badge>
</div>
    
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">
                  Shift
                </label>
                <div className="mt-1">
                  <Badge
                    variant={
                      ritase.shift.includes("1") ? "default" : "secondary"
                    }
                    className={
                      ritase.shift.includes("1")
                        ? "dark:bg-blue-600"
                        : "dark:bg-gray-700"
                    }
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {displayTime}
                </p>
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

export default RitaseDetailModal;