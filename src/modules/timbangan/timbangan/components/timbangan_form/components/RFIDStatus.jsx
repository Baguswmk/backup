import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  Radio,
  CreditCard,
  WifiOff,
  RefreshCw,
} from "lucide-react";

const RFIDStatus = ({
  rfidMode,
  rfidConnected,
  rfidConnecting,
  rfidError,
  rfidMatchStatus,
  rfidWaitingSubmit,
  autoSubmitting,
  lastRfidEpc,
  insertedWeight,
  isWeightStable,
  connectRfid,
  reconnectRfid,
  reconnectAttempt,
}) => {
  if (!rfidMode) return null;

  // Connecting
  if (rfidConnecting) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-900">
              Menghubungkan ke RFID service...
            </span>
            {reconnectAttempt > 0 && (
              <Badge variant="outline" className="ml-auto text-xs">
                Attempt {reconnectAttempt}/3
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error with detailed message
  if (rfidError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium mb-1">RFID Service Error</p>
              <p className="text-sm">{rfidError}</p>
              <p className="text-xs mt-2 opacity-75">
                Pastikan RFID Edge Service berjalan di localhost:9010
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={reconnectRfid} // ✅ FIXED: Ganti dari connectRfid ke reconnectRfid
              className="cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Not connected
  if (!rfidConnected) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  RFID service tidak terhubung
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Form akan bekerja tanpa RFID (manual input)
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={connectRfid}
              className="cursor-pointer flex items-center gap-1"
            >
              <Radio className="w-3 h-3" />
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected and ready
  const canScan = isWeightStable && insertedWeight !== null;

  return (
    <Card
      className={`border-2 ${
        canScan
          ? "border-green-300 bg-green-50"
          : "border-gray-300 bg-gray-50"
      }`}
    >
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                canScan ? "bg-green-600 animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="text-sm font-semibold">
              RFID:{" "}
              {canScan
                ? "✅ Ready to Scan"
                : "⏸️ Waiting for Weight Lock"}
            </span>
          </div>

          {lastRfidEpc && (
            <Badge variant="outline" className="font-mono text-xs">
              {lastRfidEpc.slice(0, 12)}...
            </Badge>
          )}
        </div>

        {rfidMatchStatus && (
          <div
            className={`mt-2 pt-2 border-t ${
              rfidMatchStatus.success
                ? "border-green-200"
                : "border-red-200"
            }`}
          >
            <div
              className={`text-xs ${
                rfidMatchStatus.success
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {rfidMatchStatus.success ? "✅" : "❌"}{" "}
              {rfidMatchStatus.message}
              {rfidMatchStatus.hull_no && (
                <span className="font-mono ml-2">
                  {rfidMatchStatus.hull_no}
                </span>
              )}
            </div>
          </div>
        )}

        {autoSubmitting && (
          <div className="mt-2 pt-2 border-t border-green-200">
            <div className="flex items-center gap-2 text-xs text-green-700">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>🚀 Auto-submitting data...</span>
            </div>
          </div>
        )}

        {rfidWaitingSubmit && !autoSubmitting && (
          <div className="mt-2 pt-2 border-t border-purple-200">
            <div className="flex items-center gap-2 text-xs text-purple-700 animate-pulse">
              <CreditCard className="w-3 h-3" />
              <span>📡 Tap RFID untuk submit otomatis</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RFIDStatus;