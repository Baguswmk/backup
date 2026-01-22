import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { formatWeight } from "@/shared/utils/number";

/**
 * Komponen sederhana untuk status koneksi timbangan
 */
const ScaleConnectionStatus = ({
  isSupported,
  isAutoConnecting,
  connectionTimeout,
  wsConnected,
  isConnecting,
  currentWeight,
  scaleError,
  onConnect,
  onDisconnect,
}) => {
  if (!isSupported) {
    return (
      <Alert variant="destructive" className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          WebSerial tidak didukung di browser ini. Gunakan Chrome atau Edge versi 89+
        </AlertDescription>
      </Alert>
    );
  }

  // Render single button based on state
  const renderButton = () => {
    // Jika sedang connecting atau auto-connecting
    if (isConnecting || isAutoConnecting) {
      return (
        <Button
          size="sm"
          disabled
          className="bg-blue-600 dark:bg-blue-500 text-white"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
        </Button>
      );
    }

    // Jika timeout atau ada error
    if ((connectionTimeout && !wsConnected) || scaleError) {
      return (
        <Button
          onClick={onConnect}
          size="sm"
          className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      );
    }

    // Jika sudah connected
    if (wsConnected) {
      return (
        <Button
          onClick={onDisconnect}
          size="sm"
          variant="outline"
          className="border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300"
        >
          <WifiOff className="w-4 h-4" />
        </Button>
      );
    }

    // Default: belum connected
    return (
      <Button
        onClick={onConnect}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
      >
        <Wifi className="w-4 h-4" />
      </Button>
    );
  };

  // Status color
  const getStatusColor = () => {
    if (isAutoConnecting || isConnecting) return "blue";
    if (connectionTimeout || scaleError) return "orange";
    if (wsConnected) return "green";
    return "gray";
  };

  const statusColor = getStatusColor();
  const colorClasses = {
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200",
    orange: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200",
    green: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200",
    gray: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-200",
  };

  return (
    <div className={colorClasses[statusColor]}>
          {wsConnected && currentWeight && (
            <span className="text-sm font-mono font-medium">
              {formatWeight(currentWeight)} ton
            </span>
          )}
        {renderButton()}
    </div>
  );
};

export default ScaleConnectionStatus;