import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import {
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatWeight } from "@/shared/utils/number";

const ConnectionStatus = ({
  isSupported,
  wsConnected,
  isConnecting,
  currentWeight,
  scaleError,
  waitingForFirstData,
  insertedWeight,
  isWeightStable,
  stableWeightCount,
  connect,
  disconnect,
  isAutoConnecting,
  connectionTimeout,
}) => {
  // Browser not supported
  if (!isSupported) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          WebSerial tidak didukung di browser ini. Gunakan Chrome atau Edge
          versi 89+
        </AlertDescription>
      </Alert>
    );
  }

  // Auto-connecting
  if (isAutoConnecting) {
    return (
      <Card className="border-blue-200 bg-linear-to-r from-blue-50 to-blue-100 shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-900">
                  🔄 Menghubungkan ke Timbangan...
                </div>
                <div className="text-xs text-blue-700 mt-0.5">
                  Mohon tunggu, sedang mencari perangkat timbangan
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connection timeout
  if (connectionTimeout && !wsConnected) {
    return (
      <Card className="border-orange-200 bg-linear-to-r from-orange-50 to-orange-100 shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-orange-900">
                  ⚠️ Koneksi Timeout
                </div>
                <div className="text-xs text-orange-700 mt-0.5">
                  Tidak dapat terhubung ke timbangan. Klik Connect untuk
                  mencoba lagi atau gunakan mode manual.
                </div>
              </div>
            </div>
            <Button
              onClick={connect}
              size="default"
              className="bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg transition-all gap-2 px-6"
            >
              <Wifi className="w-4 h-4" />
              <span className="font-semibold cursor-pointer">Coba Lagi</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected and waiting for first data
  if (wsConnected && waitingForFirstData && !insertedWeight) {
    return (
      <Card className="border-blue-200 bg-linear-to-r from-blue-50 to-blue-100 shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-blue-900">
                  ⏳ Menunggu Data dari Timbangan...
                </div>
                <div className="text-xs text-blue-700 mt-0.5">
                  Terhubung! Menunggu pembacaan berat pertama dari perangkat
                </div>
              </div>
            </div>
            <Button
              onClick={disconnect}
              size="sm"
              variant="outline"
              className="border-blue-300 hover:bg-blue-100 cursor-pointer"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected with data
  if (wsConnected) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-linear-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 shadow-sm">
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                <Wifi className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-green-900 dark:text-green-300">
                  ✅ Timbangan Terhubung
                </div>
                <div className="text-xs text-green-700 dark:text-green-400 mt-0.5 font-mono flex items-center gap-2">
                  {currentWeight ? (
                    <>
                      <span>
                        Live Weight: {formatWeight(currentWeight)} ton
                      </span>
                      {!insertedWeight && isWeightStable && (
                        <Badge className="bg-green-600 text-xs animate-pulse">
                          Stable ({stableWeightCount}/10)
                        </Badge>
                      )}
                    </>
                  ) : (
                    "Menunggu data..."
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={disconnect}
              size="sm"
              variant="outline"
              className="border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer dark:text-green-300"
            >
              <WifiOff className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected
  return (
    <Card className="border-blue-200 bg-linear-to-r from-blue-50 to-blue-100 shadow-sm">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <WifiOff className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-blue-900">
                Timbangan Belum Terhubung
              </div>
              <div className="text-xs text-blue-700 mt-0.5">
                {isConnecting
                  ? "⏳ Menghubungkan ke timbangan..."
                  : "Klik Connect untuk menghubungkan dengan perangkat timbangan"}
              </div>
            </div>
          </div>
          <Button
            onClick={connect}
            size="default"
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700 text-gray-200 shadow-md hover:shadow-lg transition-all gap-2 px-6 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-semibold">Connecting...</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                <span className="font-semibold cursor-pointer">Connect</span>
              </>
            )}
          </Button>
        </div>
        {scaleError && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-red-800">
                  Error Koneksi:
                </p>
                <p className="text-xs text-red-700 mt-1">{scaleError}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;