import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  CheckCircle2,
  AlertCircle,
  Settings,
  Edit,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
const FleetStatusCard = ({
  isInitialLoading,
  fleetCounts,
  allSelectedFleets,
  onOpenFleetDialog,
  onRefreshFleet,
  isRefreshingFleet = false,
}) => {
  const [showAllFleets, setShowAllFleets] = useState(false);
  if (!isInitialLoading && fleetCounts.total === 0) {
    return (
      <Alert
        variant="destructive"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Belum ada fleet yang dipilih. Pilih fleet untuk memulai.
          </AlertDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenFleetDialog}
          className="cursor-pointer hover:bg-red-100"
        >
          <Settings className="w-4 h-4 mr-2" />
          Pilih Fleet
        </Button>
      </Alert>
    );
  }

  if (fleetCounts.total > 0) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:bg-slate-800 dark:border-none dark:text-blue-200">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-6P00 dark:text-blue-300" />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                {fleetCounts.total} Fleet Aktif
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenFleetDialog}
                className="h-8 px-3 text-xs hover:bg-blue-100 cursor-pointer dark:hover:bg-blue-600"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Kelola
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshFleet}
                disabled={isRefreshingFleet}
                className="h-8 w-8 p-0 hover:bg-blue-100 cursor-pointer disabled:cursor-not-allowed dark:hover:bg-blue-600"
                title="Refresh fleet"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isRefreshingFleet ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </div>
          </div>

          {/* Fleet details */}
          {allSelectedFleets.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex flex-wrap items-center gap-1.5">
                {allSelectedFleets.slice(0, 3).map((fleet) => (
                  <div
                    key={fleet.id}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border bg-white text-gray-700 border-blue-200"
                  >
                    <span>{fleet.excavator}</span>
                    <span className="text-gray-400">•</span>
                    <span>{fleet.loadingLocation}</span>
                    <span className="text-gray-400">•</span>
                    <span>{fleet.dumpingLocation}</span>
                  </div>
                ))}

                {allSelectedFleets.length > 3 && (
                  <Popover open={showAllFleets} onOpenChange={setShowAllFleets}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-blue-700 hover:bg-blue-100 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
                      >
                        <span className="font-medium">
                          +{allSelectedFleets.length - 3} lainnya
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-80 p-3 dark:bg-gray-700 dark:text-gray-200 border-none"
                      align="start"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="text-sm font-semibold">
                            Semua Fleet Aktif
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {allSelectedFleets.length}
                          </Badge>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1.5 dark:text-black">
                          {allSelectedFleets.map((fleet) => (
                            <div
                              key={fleet.id}
                              className="flex items-center gap-2 p-2 rounded-md text-xs bg-gray-50 border border-gray-200"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {fleet.excavator}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs shrink-0"
                              >
                                {fleet.dumptruckCount || 0} DT
                              </Badge>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowAllFleets(false);
                              onOpenFleetDialog();
                            }}
                            className="w-full text-xs cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" />
                            Kelola Fleet
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default FleetStatusCard;
