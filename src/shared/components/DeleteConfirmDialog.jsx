import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DeleteConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  target,
  assignedCount = 0,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  const handleConfirm = () => {
    if (isProcessing) return;
    onConfirm();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleClose();
    }
  };

  return (
    <div
      className={cn(
        "detail-modal fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4",
        "bg-black/50 backdrop-blur-sm transition-all duration-200"
      )}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <Card
        className={cn(
          "w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-lg transition-all duration-200",
          "bg-white dark:bg-slate-900",
          "border border-gray-200 dark:border-slate-700",
          "animate-fade-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className={cn(
          "pb-2 flex flex-row items-center justify-between transition-colors duration-200",
          "border-b border-gray-200 dark:border-slate-700"
        )}>
          <CardTitle className={cn(
            "text-lg flex items-center gap-2 transition-colors duration-200",
            "text-gray-900 dark:text-white"
          )}>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span>Hapus Konfigurasi Fleet</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            disabled={isProcessing}
            className={cn(
              "h-8 w-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              "hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-200",
              "transition-colors duration-200"
            )}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-200 mb-2 transition-colors duration-200">
              Tindakan ini permanen dan tidak dapat dibatalkan.
            </p>
          </div>

          {target && (
            <div className={cn(
              "rounded-md border p-3 transition-all duration-200",
              "bg-gray-50 dark:bg-slate-800/50",
              "border-gray-200 dark:border-slate-700"
            )}>
              <div className="text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Nama Konfigurasi</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {target.name || target.fleet?.name || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Excavator</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {target.excavator || target.fleet?.excavator || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shift</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {target.shift || target.fleet?.shift || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Work Unit</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {target.workUnit || target.fleet?.workUnit || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dumptruck Terikat</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {assignedCount >= 0
                      ? assignedCount
                      : target.units?.length || 0}
                  </span>
                </div>
              </div>

              {(assignedCount > 0 || target.units?.length > 0) && (
                <Alert className={cn(
                  "mt-3 transition-colors duration-200",
                  "border-yellow-300 dark:border-yellow-800",
                  "bg-yellow-50 dark:bg-yellow-900/20"
                )}>
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-300">
                    {target.units?.length > 0 ? (
                      <>
                        Setting ini memiliki {target.units.length} dumptruck
                        yang terikat. Pastikan Anda sudah me-review dampaknya
                        sebelum melanjutkan.
                      </>
                    ) : (
                      <>
                        Konfigurasi ini memiliki {assignedCount} dumptruck yang
                        terikat. Pastikan Anda sudah me-review dampaknya sebelum
                        melanjutkan.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="destructive"
              className={cn(
                "w-full sm:flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                "transition-all duration-200 shadow-sm hover:shadow-md",
                "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              )}
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full sm:flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
                "transition-all duration-200 shadow-sm hover:shadow-md",
                "hover:bg-gray-100 dark:hover:bg-slate-800",
                "dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
              )}
              onClick={handleClose}
              disabled={isProcessing}
            >
              Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteConfirmDialog;