import React from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";

const DumpTruckAlerts = ({
  canRead,
  hasFleets,
  isLoading,
  userRoleInfo,
  getDisabledMessage,
}) => {
  // Alert untuk tidak ada permission read
  if (!canRead) {
    return (
      <Alert variant="destructive" className="dark:bg-red-900/20 dark:border-red-800">
        <Lock className="w-4 h-4 dark:text-red-400" />
        <AlertDescription className="dark:text-red-300">
          {getDisabledMessage("read")}
        </AlertDescription>
      </Alert>
    );
  }

  // Alert untuk tidak ada fleet
  if (!hasFleets && !isLoading) {
    return (
      <Alert variant="destructive" className="dark:bg-red-900/20 dark:border-red-800">
        <AlertCircle className="w-4 h-4 dark:text-red-400" />
        <AlertDescription className="dark:text-red-300">
          Tidak ada fleet tersedia untuk role Anda. Fleet di-filter berdasarkan:{" "}
          <strong>{userRoleInfo?.role}</strong> - <strong>{userRoleInfo?.identifier}</strong>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default DumpTruckAlerts;