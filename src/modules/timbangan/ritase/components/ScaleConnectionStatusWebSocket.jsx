import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertCircle, Loader2, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { formatWeight } from "@/shared/utils/number";

const ScaleConnectionStatusWebSocket = ({
  isSupported,
  isAutoConnecting,
  connectionTimeout,
  wsConnected,
  isConnecting,
  currentWeight,
  scaleError,
  onConnect,
  onDisconnect,

  // RFID WebSocket props
  rfidConnected,
  rfidConnecting,
  rfidLastScan,
  rfidError,
  reconnectAttempt,
  onRfidConnect,
  onRfidDisconnect,
}) => {
  if (!isSupported) {
    return (
      <Alert
        variant="destructive"
        className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
      >
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          WebSerial tidak didukung di browser ini. Gunakan Chrome atau Edge
          versi 89+
        </AlertDescription>
      </Alert>
    );
  }

  const renderScaleButton = () => {
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

  const getStatusColor = () => {
    if (isAutoConnecting || isConnecting) return "blue";
    if (connectionTimeout || scaleError) return "orange";
    if (wsConnected) return "green";
    return "gray";
  };

  const statusColor = getStatusColor();
  const colorClasses = {
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200",
    orange:
      "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200",
    green:
      "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200",
    gray: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-200",
  };

  const rfidHullNo = rfidLastScan?.hullNo || rfidLastScan;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${colorClasses[statusColor]}`}>
      {/* Scale Section */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          TIMBANGAN:
        </span>
        {wsConnected && currentWeight && (
          <span className="text-sm font-mono font-medium">
            {formatWeight(currentWeight)} ton
          </span>
        )}
        {renderScaleButton()}
      </div>

      {/* RFID WebSocket Section */}
      <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-600">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          RFID WS:
        </span>
        {rfidHullNo && (
          <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">
            {rfidHullNo}
          </span>
        )}
        {rfidError && reconnectAttempt > 0 && (
          <span className="text-xs text-orange-600 dark:text-orange-400">
            ({reconnectAttempt}/3)
          </span>
        )}
        {rfidConnecting ? (
          <Button size="sm" disabled className="bg-purple-600 text-white">
            <Loader2 className="w-4 h-4 animate-spin" />
          </Button>
        ) : rfidConnected ? (
          <Button
            onClick={onRfidDisconnect}
            size="sm"
            variant="outline"
            className="border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          >
            <WifiOff className="w-4 h-4" />
          </Button>
        ) : rfidError ? (
          <Button
            onClick={onRfidConnect}
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={onRfidConnect}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white"
          >
            <Wifi className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScaleConnectionStatusWebSocket;