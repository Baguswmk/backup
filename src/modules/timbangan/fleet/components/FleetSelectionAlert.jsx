import React from "react";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { CheckCircle2, Edit } from "lucide-react";

const FleetSelectionAlert = ({ fleetCounts, onEditSelection }) => {
  if (fleetCounts.total === 0) return null;

  return (
    <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            <strong>{fleetCounts.total} Fleet Dipilih:</strong>{" "}
            {fleetCounts.timbangan} Timbangan
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditSelection}
          className="cursor-pointer ml-4 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Pilihan
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default FleetSelectionAlert;