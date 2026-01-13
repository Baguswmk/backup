import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import {
  Weight,
  Edit2,
  Download,
  Radio,
  WifiOff,
  Wifi,
  Keyboard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Unlock,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatWeight } from "@/shared/utils/number";

const WeightInput = ({
  displayWeight,
  formData,
  errors,
  wsConnected,
  currentWeight,
  manualEditMode,
  insertedWeight,
  insertedTime,
  isWeightStable,
  isWeightStale,
  stableWeightCount,
  waitingForFirstData,
  canEditWeight,
  isLoading,
  autoSubmitting,
  rfidMode,
  rfidWaitingSubmit,
  onWeightChange,
  onInsert,
  onUnlock, // ✅ TAMBAHAN: Fungsi untuk unlock weight
  onToggleManual,
  onToggleHelp,
  validateField,
}) => {
  return (
    <>
      {/* Timestamp Info & Realtime Status */}
      <Card className="border-none shadow-none m-0 p-0">
        <CardContent className="">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-900">
                Waktu Input
              </span>
            </div>
            <div className="font-mono text-sm font-semibold text-gray-800 dark:text-gray-200">
              {formData.createdAt
                ? format(new Date(formData.createdAt), "dd/MM/yy HH:mm", {
                    locale: localeId,
                  })
                : "-"}
            </div>
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-orange-600" />
              )}
              <div>
                <span className="text-xs font-medium dark:text-gray-200">
                  {wsConnected ? "Timbangan" : "Offline"}
                </span>
                {wsConnected && currentWeight && !manualEditMode && (
                  <span
                    className={`ml-2 font-mono text-sm font-bold dark:text-gray-200 ${
                      insertedWeight !== null
                        ? "text-green-700"
                        : "text-blue-700"
                    }`}
                  >
                    {formatWeight(currentWeight)} ton
                  </span>
                )}
              </div>
            </div>

            {manualEditMode ? (
              <Badge className="bg-yellow-600 text-xs">Manual</Badge>
            ) : insertedWeight !== null ? (
              <Badge className="bg-green-600 text-xs">Inserted</Badge>
            ) : wsConnected ? (
              <Badge className="bg-blue-600 animate-pulse text-xs">
                Live
              </Badge>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleHelp}
              className="gap-1 dark:text-gray-200 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Keyboard Shortcuts (Alt + H)"
            >
              <Keyboard className="w-4 h-4" />
              <span className="text-xs hidden sm:inline">Alt+H</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Weight Input Card */}
      <Card className="shadow-none border-none dark:bg-gray-800 dark:text-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Weight className="w-4 h-4" />
            Net Weight (ton) *
            <span className="text-xs text-gray-500 font-normal">
              (Berat Bersih)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              {/* Weight Input */}
              <div className="relative flex-1">
                <Input
                  id="gross_weight"
                  type="text"
                  inputMode="decimal"
                  value={displayWeight}
                  onChange={(e) => onWeightChange(e.target.value)}
                  onBlur={() => validateField("gross_weight")}
                  className={`${errors.gross_weight ? "border-red-500" : ""} ${
                    manualEditMode
                      ? "bg-yellow-50 border-yellow-400 font-bold dark:text-gray-800"
                      : insertedWeight !== null
                      ? "bg-green-50 border-green-400 font-bold"
                      : wsConnected
                      ? "bg-blue-50 border-blue-300"
                      : ""
                  }`}
                  placeholder="0.00"
                  required
                  disabled={isLoading || autoSubmitting}
                  readOnly={!canEditWeight}
                />

                {/* Status Icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {manualEditMode ? (
                    <Edit2 className="w-4 h-4 text-yellow-600" />
                  ) : insertedWeight !== null ? (
                    <Download className="w-4 h-4 text-green-600" />
                  ) : wsConnected ? (
                    <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              {!wsConnected && (
                <>
                  <Button
                    type="button"
                    onClick={onToggleManual}
                    className={`gap-1 shrink-0 cursor-pointer ${
                      manualEditMode
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-gray-600 hover:bg-gray-700"
                    }`}
                    size="default"
                    title="Toggle Manual Mode (Alt + M)"
                    disabled={autoSubmitting}
                  >
                    {manualEditMode ? (
                      <>
                        <Wifi className="w-4 h-4" />
                        <span className="hidden sm:inline">Auto</span>
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Manual</span>
                      </>
                    )}
                  </Button>
                  
                  {/* Tombol Lock untuk Manual Mode */}
                  {manualEditMode && displayWeight && parseFloat(displayWeight) > 0 && (
                    <Button
                      type="button"
                      onClick={onInsert}
                      disabled={autoSubmitting}
                      className="gap-1 shrink-0 bg-green-600 hover:bg-green-700 cursor-pointer"
                      size="default"
                      title="Lock Weight (Alt + I)"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Lock</span>
                    </Button>
                  )}

                  {/* ✅ TAMBAHAN: Tombol Unlock untuk Manual Mode */}
                  {manualEditMode && insertedWeight !== null && (
                    <Button
                      type="button"
                      onClick={onUnlock}
                      disabled={autoSubmitting}
                      className="gap-1 shrink-0 bg-orange-600 hover:bg-orange-700 cursor-pointer"
                      size="default"
                      title="Unlock Weight (Alt + U)"
                    >
                      <Unlock className="w-4 h-4" />
                      <span className="hidden sm:inline">Unlock</span>
                    </Button>
                  )}
                </>
              )}

              {wsConnected && !manualEditMode && (
                <>
                  <Button
                    type="button"
                    onClick={onInsert}
                    disabled={
                      !wsConnected ||
                      !currentWeight ||
                      !isWeightStable ||
                      waitingForFirstData ||
                      autoSubmitting
                    }
                    className="gap-1 shrink-0 cursor-pointer bg-blue-600 hover:bg-blue-700"
                    size="default"
                    title="Insert Weight (Alt + I) - Tunggu berat stabil"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {insertedWeight !== null ? "Re-Insert" : "Insert"}
                    </span>
                  </Button>

                  {/* ✅ TAMBAHAN: Tombol Unlock untuk Online Mode */}
                  {insertedWeight !== null && (
                    <Button
                      type="button"
                      onClick={onUnlock}
                      disabled={autoSubmitting}
                      className="gap-1 shrink-0 bg-orange-600 hover:bg-orange-700 cursor-pointer"
                      size="default"
                      title="Unlock Weight (Alt + U)"
                    >
                      <Unlock className="w-4 h-4" />
                      <span className="hidden sm:inline">Unlock</span>
                    </Button>
                  )}
                </>
              )}
            </div>

            {errors.gross_weight && (
              <p className="text-sm text-red-500 mt-1">{errors.gross_weight}</p>
            )}

            {/* Status Info */}
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-500">
                Maksimal 999.99 ton (3 digit)
              </p>

              {manualEditMode && (
                <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  <Edit2 className="w-3 h-3" />
                  <span>
                    Mode manual aktif - ketik berat secara manual. Tekan{" "}
                    <strong>Alt+M</strong> untuk kembali ke mode realtime.
                  </span>
                </div>
              )}

              {!manualEditMode && insertedWeight !== null && insertedTime && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <Download className="w-3 h-3" />
                  <span>
                    🔒 Locked: <strong>{insertedWeight.toFixed(2)} ton</strong>{" "}
                    pada {format(insertedTime, "HH:mm:ss")}
                    {rfidMode && rfidWaitingSubmit && (
                      <>
                        {" "}
                        -{" "}
                        <strong className="animate-pulse">
                          Tap RFID untuk submit
                        </strong>
                      </>
                    )}
                    {" "}
                    - Tekan <strong>Alt+U</strong> untuk unlock
                  </span>
                </div>
              )}

              {!manualEditMode &&
                insertedWeight === null &&
                wsConnected &&
                !waitingForFirstData &&
                !isWeightStable && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded animate-pulse">
                    <Radio className="w-3 h-3" />
                    <span>
                      ⏳ Menunggu berat stabil... ({stableWeightCount}/10
                      pembacaan)
                    </span>
                  </div>
                )}

              {!manualEditMode &&
                insertedWeight === null &&
                wsConnected &&
                !waitingForFirstData &&
                isWeightStable && (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      ✅ Berat stabil - Tekan <strong>Alt+I</strong> untuk
                      insert atau tunggu auto-lock
                    </span>
                  </div>
                )}

              {!manualEditMode &&
                insertedWeight === null &&
                wsConnected &&
                isWeightStale && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    <AlertCircle className="w-3 h-3" />
                    <span>
                      ⚠️ Data stale - tidak ada update terbaru. Tekan{" "}
                      <strong>Alt+M</strong> untuk mode manual.
                    </span>
                  </div>
                )}

              {!manualEditMode && insertedWeight === null && !wsConnected && (
                <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  <WifiOff className="w-3 h-3" />
                  <span>
                    Tidak terhubung - tekan <strong>Alt+M</strong> untuk input
                    manual
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default WeightInput;