import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Save,
  RotateCcw,
  Loader2,
  AlertCircle,
  Zap,
} from "lucide-react";

const FormActions = ({
  isValid,
  isSubmitting,
  isLoading,
  autoSubmitting,
  isAutoFilled,
  hasErrors,
  hullNo,
  rfidMode,
  rfidWaitingSubmit,
  onSubmit,
  onReset,
  onCancel,
}) => {
  return (
    <div>
      {/* Error Summary */}
      {hasErrors && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Mohon perbaiki kesalahan berikut:</p>
            <p className="text-sm">
              Periksa field yang ditandai merah di atas.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="pt-2">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={isSubmitting || isLoading || autoSubmitting}
            className="flex items-center gap-2 cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Reset Form (Alt + R)"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
            <Badge variant="outline" className="text-xs font-mono ml-1">
              Alt+R
            </Badge>
          </Button>

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting || autoSubmitting}
                title="Batal (Esc)"
                className="cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Batal
                <Badge variant="outline" className="text-xs font-mono ml-1">
                  Esc
                </Badge>
              </Button>
            )}

            <Button
              type="button"
              onClick={onSubmit}
              disabled={
                !isValid ||
                isSubmitting ||
                isLoading ||
                !isAutoFilled ||
                autoSubmitting
              }
              className="flex items-center gap-2 min-w-30 cursor-pointer dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Simpan Data (Alt + S) atau Tap RFID"
            >
              {isSubmitting || autoSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan
                  <Badge variant="secondary" className="text-xs font-mono ml-1">
                    {rfidMode && rfidWaitingSubmit ? "RFID" : "Alt+S"}
                  </Badge>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        <div className="mt-2">
          {!isAutoFilled && hullNo && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="w-4 h-4" />
              <span>
                Nomor lambung belum ditemukan - cek fleet yang dipilih
              </span>
            </div>
          )}

          {!isValid && hasErrors && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="w-4 h-4" />
              <span>Beberapa field perlu diperbaiki</span>
            </div>
          )}

          {rfidMode && rfidWaitingSubmit && !hullNo && (
            <div className="flex items-center gap-2 text-sm text-purple-600 animate-pulse">
              <Zap className="w-4 h-4" />
              <span>⚡ Siap menerima RFID tap - Weight sudah terkunci!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormActions;